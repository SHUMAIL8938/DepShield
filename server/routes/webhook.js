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


export default router;
