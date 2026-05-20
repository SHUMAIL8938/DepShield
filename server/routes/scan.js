import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { detectEcosystem, parseManifest } from '../utils/manifestParser.js';
import { scanVulnerabilities } from '../services/osv.js';
import { checkOutdatedPackages, fetchLicenses } from '../services/registry.js';
import { fetchManifestFromGithub } from '../services/github.js';
import { calculateHealthScore } from '../utils/scorer.js';
import Scan from '../models/Scan.js';

const router = express.Router();

router.post('/', authenticate, async (req, res) => {
  const startTime = Date.now();

  try {
    const { content, filename, githubRepo } = req.body;

    let manifestContent, manifestFilename, ecosystem;

    if (githubRepo) {
      const result = await fetchManifestFromGithub(githubRepo, filename);
      manifestContent = result.content;
      manifestFilename = result.filename;
      ecosystem = result.ecosystem;
    } else {
      if (!content || !filename) {
        return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Content and filename required.' });
      }
      if (content.length > 500000) {
        return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'File too large. Max 500KB.' });
      }
      manifestContent = content;
      manifestFilename = filename;
      ecosystem = detectEcosystem(filename);
    }

    if (!ecosystem) {
      return res.status(400).json({ error: 'UNSUPPORTED_FILE', message: 'Unsupported manifest file type.' });
    }

    const dependencies = await parseManifest(manifestContent, ecosystem);

    if (dependencies.length === 0) {
      return res.status(400).json({ error: 'NO_DEPENDENCIES', message: 'No dependencies found in manifest.' });
    }

    const [vulnerabilities, outdatedPackages, licenses] = await Promise.all([
      scanVulnerabilities(dependencies, ecosystem),
      checkOutdatedPackages(dependencies, ecosystem),
      fetchLicenses(dependencies, ecosystem)
    ]);

    const { score, grade } = calculateHealthScore(vulnerabilities, outdatedPackages);
    const scanDurationMs = Date.now() - startTime;

    const scan = await Scan.create({
      userId: req.auth().userId,
      ecosystem,
      manifestFile: manifestFilename,
      sourceType: githubRepo ? 'github' : 'paste',
      githubRepo: githubRepo || undefined,
      totalDependencies: dependencies.length,
      healthScore: score,
      grade,
      vulnerabilities,
      outdatedPackages,
      licenses,
      scanDurationMs
    });

    res.json({ scan });
  } catch (err) {
    console.error('[SCAN] Error:', err.message);
    if (err.message.includes('parse') || err.message.includes('JSON')) {
      return res.status(400).json({ error: 'PARSE_ERROR', message: err.message });
    }
    res.status(500).json({ error: 'SCAN_FAILED', message: err.message });
  }
});

router.get('/', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const skip = (page - 1) * limit;

    const [scans, total] = await Promise.all([
      Scan.find({ userId: req.auth().userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-vulnerabilities -outdatedPackages -licenses'),
      Scan.countDocuments({ userId: req.auth().userId })
    ]);

    res.json({ scans, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to fetch scans.' });
  }
});



export default router;
