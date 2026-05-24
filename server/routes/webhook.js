import express from "express";
import crypto from "crypto";
import { authenticate } from "../middleware/auth.js";
import Webhook from "../models/Webhook.js";
import Scan from "../models/Scan.js";
import { fetchManifestFromGithub,fetchAllManifestsFromGithub } from "../services/github.js";
import { parseManifest } from "../utils/manifestParser.js";
import { scanVulnerabilities } from "../services/osv.js";
import { checkOutdatedPackages, fetchLicenses } from "../services/registry.js";
import { calculateHealthScore } from "../utils/scorer.js";
import axios from "axios";
import { sendVulnerabilityAlert } from "../services/email.js";
const router = express.Router();

router.post("/register", authenticate, async (req, res) => {
  try {
    const { repoFullName, manifestFile, ecosystem } = req.body;
    if (!repoFullName || !manifestFile || !ecosystem) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "repoFullName, manifestFile, and ecosystem required.",
      });
    }
    const cleanedRepo = repoFullName
      .replace("https://github.com/", "")
      .replace("http://github.com/", "")
      .replace("github.com/", "")
      .trim()
      .replace(/\/$/, "");

    const secret = crypto.randomBytes(32).toString("hex");

    const existing = await Webhook.findOne({
      userId: req.auth().userId,
      repoFullName: cleanedRepo,
    });
    if (existing) {
      existing.manifestFile = manifestFile;
      existing.ecosystem = ecosystem;
      existing.active = true;
      await existing.save();
      return res.json({
        webhookId: existing._id,
        secret,
        message: "Webhook updated.",
      });
    }

    const webhook = await Webhook.create({
      userId: req.auth().userId,
      repoFullName: cleanedRepo,
      manifestFile,
      ecosystem,
      secret,
      emailAlerts: req.body.emailAlerts !== false,
    });

    res.json({
      webhookId: webhook._id,
      secret,
      webhookUrl: `${process.env.SERVER_URL}/api/webhook/github`,
      message:
        "Webhook registered. Add this URL and secret to your GitHub repo settings.",
    });
  } catch (err) {
    res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Failed to register webhook.",
    });
  }
});

router.get("/", authenticate, async (req, res) => {
  const webhooks = await Webhook.find({ userId: req.auth().userId });
  res.json({ webhooks });
});

router.delete("/:id", authenticate, async (req, res) => {
  await Webhook.findOneAndDelete({
    _id: req.params.id,
    userId: req.auth().userId,
  });
  res.json({ message: "Webhook deleted." });
});

router.post(
  "/github",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const signature = req.headers["x-hub-signature-256"];
      const event = req.headers["x-github-event"];

      console.log("[WEBHOOK] Received event:", event);
      console.log("[WEBHOOK] Has signature:", !!signature);

      if (!signature || event !== "push") {
        console.log("[WEBHOOK] Ignored - no signature or not push event");
        return res.status(200).json({ message: "Ignored." });
      }

      const payload = JSON.parse(req.body.toString());
      const repoFullName = payload.repository?.full_name;
      const cleanedRepo = repoFullName
        .replace("https://github.com/", "")
        .replace("http://github.com/", "")
        .replace("github.com/", "")
        .trim()
        .replace(/\/$/, "");
      console.log("[WEBHOOK] Repo:", cleanedRepo);

      const webhooks = await Webhook.find({
        repoFullName: cleanedRepo,
        active: true,
      }).select("+secret");

      console.log("[WEBHOOK] Found webhooks:", webhooks.length);

      for (const webhook of webhooks) {
        const expected = `sha256=${crypto.createHmac("sha256", webhook.secret).update(req.body).digest("hex")}`;
        if (signature.length !== expected.length) {
          console.log(
            "[WEBHOOK] Length mismatch:",
            signature.length,
            expected.length,
          );
          continue;
        }
        const match = crypto.timingSafeEqual(
          Buffer.from(signature),
          Buffer.from(expected),
        );
        console.log("[WEBHOOK] HMAC match:", match);

        if (!match) continue;

        webhook.lastTriggeredAt = new Date();
        await webhook.save();
        triggerScan(webhook).catch(console.error);
      }

      res.status(200).json({ message: "OK" });
    } catch (err) {
      console.error("[WEBHOOK] Error:", err.message);
      res.status(200).json({ message: "Processed." });
    }
  },
);
router.patch('/:id/alerts', authenticate, async (req, res) => {
  try {
    const webhook = await Webhook.findOne({ 
      _id: req.params.id, 
      userId: req.auth().userId 
    });
    if (!webhook) return res.status(404).json({ error: 'NOT_FOUND' });
    
    webhook.emailAlerts = req.body.emailAlerts;
    await webhook.save();
    res.json({ emailAlerts: webhook.emailAlerts });
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});
const triggerScan = async (webhook) => {
  try {
    const startTime = Date.now();

    const manifests = await fetchAllManifestsFromGithub(webhook.repoFullName);

    let allVulnerabilities = [];
    let allOutdated = [];
    let allLicenses = [];
    let totalDeps = 0;
    let primaryEcosystem = null;
    let scannedFiles = [];

    for (const manifest of manifests) {
      try {
        if (!manifest.ecosystem) continue;
        const dependencies = await parseManifest(manifest.content, manifest.ecosystem);
        if (dependencies.length === 0) continue;

        if (!primaryEcosystem) primaryEcosystem = manifest.ecosystem;
        totalDeps += dependencies.length;
        scannedFiles.push(manifest.path);

        const [vulns, outdated, licenses] = await Promise.all([
          scanVulnerabilities(dependencies, manifest.ecosystem),
          checkOutdatedPackages(dependencies, manifest.ecosystem),
          fetchLicenses(dependencies, manifest.ecosystem),
        ]);

        allVulnerabilities = [...allVulnerabilities, ...vulns];
        allOutdated = [...allOutdated, ...outdated];
        allLicenses = [...allLicenses, ...licenses];

        console.log(`[WEBHOOK] Scanned ${manifest.path}: ${dependencies.length} deps, ${vulns.length} vulns`);
      } catch (err) {
        console.log(`[WEBHOOK] Skipping ${manifest.path}: ${err.message}`);
      }
    }

    if (totalDeps === 0) throw new Error('No dependencies found in any manifest');

    const { score, grade } = calculateHealthScore(allVulnerabilities, allOutdated);
    const criticalCount = allVulnerabilities.filter(v => v.severity === 'CRITICAL').length;

    const scan = await Scan.create({
      userId: webhook.userId,
      ecosystem: primaryEcosystem || 'npm',
      manifestFile: scannedFiles.join(', '),
      sourceType: 'github',
      githubRepo: webhook.repoFullName,
      totalDependencies: totalDeps,
      healthScore: score,
      grade,
      vulnerabilities: allVulnerabilities,
      outdatedPackages: allOutdated,
      licenses: allLicenses,
      scanDurationMs: Date.now() - startTime,
      vulnerabilityCount: allVulnerabilities.length,
      criticalCount,
    });
console.log(`[WEBHOOK] Scan saved: ${scan._id}`);
console.log(`[WEBHOOK] emailAlerts: ${webhook.emailAlerts}, userId: ${webhook.userId}`);
    let userEmail = null;
    try {
      const clerkRes = await axios.get(
        `https://api.clerk.com/v1/users/${webhook.userId}`,
        {
          headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
          timeout: 5000,
        }
      );
      userEmail = clerkRes.data.email_addresses?.[0]?.email_address;
    } catch (err) {
      console.error('[EMAIL] Failed to fetch user email:', err.message);
    }

    if (webhook.emailAlerts) {
      await sendVulnerabilityAlert({
        userEmail,
        repoName: webhook.repoFullName,
        grade,
        healthScore: score,
        vulnerabilities: allVulnerabilities,
        scanId: scan._id,
      });
    }

  } catch (err) {
    console.error('[WEBHOOK] Auto-scan failed:', err.message);
  }
};

export default router;
