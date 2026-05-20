import express from 'express';
import crypto from 'crypto';
import { authenticate } from '../middleware/auth.js';
import Webhook from '../models/Webhook.js';
import Scan from '../models/Scan.js';
import { fetchManifestFromGithub } from '../services/github.js';
import { parseManifest } from '../utils/manifestParser.js';
import { scanVulnerabilities } from '../services/osv.js';
import { checkOutdatedPackages, fetchLicenses } from '../services/registry.js';
import { calculateHealthScore } from '../utils/scorer.js';

const router = express.Router();

router.post('/register', authenticate, async (req, res) => {
  try {
    const { repoFullName, manifestFile, ecosystem } = req.body;
    if (!repoFullName || !manifestFile || !ecosystem) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'repoFullName, manifestFile, and ecosystem required.' });
    }

    const secret = crypto.randomBytes(32).toString('hex');

    const existing = await Webhook.findOne({ userId: req.auth().userId, repoFullName });
    if (existing) {
      existing.manifestFile = manifestFile;
      existing.ecosystem = ecosystem;
      existing.active = true;
      await existing.save();
      return res.json({ webhookId: existing._id, secret, message: 'Webhook updated.' });
    }

    const webhook = await Webhook.create({
      userId: req.auth().userId,
      repoFullName,
      manifestFile,
      ecosystem,
      secret
    });

    res.json({
      webhookId: webhook._id,
      secret,
      webhookUrl: `${process.env.SERVER_URL || 'https://your-railway-url.railway.app'}/api/webhook/github`,
      message: 'Webhook registered. Add this URL and secret to your GitHub repo settings.'
    });
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to register webhook.' });
  }
});

router.post('/github', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-hub-signature-256'];
    const event = req.headers['x-github-event'];

    if (!signature || event !== 'push') {
      return res.status(200).json({ message: 'Ignored.' });
    }

    const payload = JSON.parse(req.body.toString());
    const repoFullName = payload.repository?.full_name;
    if (!repoFullName) return res.status(200).json({ message: 'No repo.' });

    const webhooks = await Webhook.find({ repoFullName, active: true }).select('+secret');

    for (const webhook of webhooks) {
      const expected = `sha256=${crypto.createHmac('sha256', webhook.secret).update(req.body).digest('hex')}`;
      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) continue;

      webhook.lastTriggeredAt = new Date();
      await webhook.save();

    }

    res.status(200).json({ message: 'OK' });
  } catch (err) {
    console.error('[WEBHOOK] Error:', err.message);
    res.status(200).json({ message: 'Processed.' });
  }
});


export default router;
