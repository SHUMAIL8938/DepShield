import axios from 'axios';

const OSV_BATCH_URL = 'https://api.osv.dev/v1/querybatch';
const CHUNK_SIZE = 1000;

const ecosystemMap = {
  'npm': 'npm',
  'PyPI': 'PyPI',
  'Maven': 'Maven',
  'RubyGems': 'RubyGems',
  'Go': 'Go',
  'Packagist': 'Packagist',
  'crates.io': 'crates.io'
};

export const scanVulnerabilities = async (dependencies, ecosystem) => {
  const osvEcosystem = ecosystemMap[ecosystem] || ecosystem;
  const vulnerabilities = [];

  const chunks = [];
  for (let i = 0; i < dependencies.length; i += CHUNK_SIZE) {
    chunks.push(dependencies.slice(i, i + CHUNK_SIZE));
  }

  for (const chunk of chunks) {
    const queries = chunk.map(dep => ({
      package: { name: dep.name, ecosystem: osvEcosystem },
      ...(dep.version && dep.version !== 'unknown' ? { version: dep.version } : {})
    }));

    try {
      const response = await axios.post(OSV_BATCH_URL, { queries }, {
        timeout: 30000,
        headers: { 'Content-Type': 'application/json' }
      });

      const results = response.data.results || [];
      results.forEach((result, idx) => {
        const dep = chunk[idx];
        if (result.vulns && result.vulns.length > 0) {
          for (const vuln of result.vulns) {
            const severity = extractSeverity(vuln);
            const fixedVersion = extractFixedVersion(vuln, dep.name);
            const cveId = vuln.aliases?.find(a => a.startsWith('CVE-')) || vuln.id;

            vulnerabilities.push({
              packageName: dep.name,
              installedVersion: dep.version,
              fixedVersion,
              severity,
              cveId,
              description: vuln.summary || vuln.details?.slice(0, 200) || 'No description available.',
              aliases: vuln.aliases || []
            });
          }
        }
      });
    } catch (err) {
      console.error('[OSV] Batch query error:', err.message);
    }
  }

  return vulnerabilities;
};

export const fetchRecentVulnerabilities = async () => {
  const packages = [
    { name: 'lodash', ecosystem: 'npm' },
    { name: 'axios', ecosystem: 'npm' },
    { name: 'express', ecosystem: 'npm' },
    { name: 'node-fetch', ecosystem: 'npm' },
    { name: 'minimist', ecosystem: 'npm' },
    { name: 'requests', ecosystem: 'PyPI' },
    { name: 'Pillow', ecosystem: 'PyPI' },
    { name: 'django', ecosystem: 'PyPI' },
    { name: 'log4j-core', ecosystem: 'Maven' },
    { name: 'spring-core', ecosystem: 'Maven' },
    { name: 'nokogiri', ecosystem: 'RubyGems' },
    { name: 'rails', ecosystem: 'RubyGems' },
    { name: 'golang.org/x/net', ecosystem: 'Go' },
    { name: 'golang.org/x/crypto', ecosystem: 'Go' },
  ];

  const results = [];
  const queries = packages.map(pkg => ({
    package: { name: pkg.name, ecosystem: pkg.ecosystem }
  }));

  try {
    const response = await axios.post('https://api.osv.dev/v1/querybatch',
      { queries },
      { timeout: 20000, headers: { 'Content-Type': 'application/json' } }
    );

    const batchResults = response.data.results || [];

    batchResults.forEach((result, idx) => {
      const pkg = packages[idx];
      const vulns = result.vulns || [];
      if (vulns.length > 0) {
        const vuln = vulns[0];
        results.push({
          packageName: pkg.name,
          ecosystem: pkg.ecosystem,
          severity: extractSeverity(vuln),
          cveId: vuln.aliases?.find(a => a.startsWith('CVE-')) || vuln.id,
          summary: vuln.summary || 'Vulnerability reported.',
          publishedAt: vuln.published ? new Date(vuln.published) : new Date()
        });
      }
    });
  } catch (err) {
    console.error('[OSV] Feed batch fetch error:', err.message);
  }

  return results.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)).slice(0, 20);
};

const extractSeverity = (vuln) => {
  if (vuln.database_specific?.severity) return vuln.database_specific.severity.toUpperCase();
  if (vuln.severity?.length > 0) {
    const cvss = vuln.severity.find(s => s.type === 'CVSS_V3');
    if (cvss) {
      const score = parseFloat(cvss.score);
      if (score >= 9.0) return 'CRITICAL';
      if (score >= 7.0) return 'HIGH';
      if (score >= 4.0) return 'MEDIUM';
      return 'LOW';
    }
  }
  return 'UNKNOWN';
};

const extractFixedVersion = (vuln, pkgName) => {``
  const affected = vuln.affected || [];
  for (const aff of affected) {
    if (aff.package?.name === pkgName) {
      const ranges = aff.ranges || [];
      for (const range of ranges) {
        const fixed = range.events?.find(e => e.fixed);
        if (fixed) return fixed.fixed;
      }
    }
  }
  return null;
};
