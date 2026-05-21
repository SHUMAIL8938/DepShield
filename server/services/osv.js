import axios from "axios";
import semver from "semver";
const OSV_BATCH_URL = "https://api.osv.dev/v1/querybatch";
const CHUNK_SIZE = 1000;

const ecosystemMap = {
  npm: "npm",
  PyPI: "PyPI",
  Maven: "Maven",
  RubyGems: "RubyGems",
  Go: "Go",
  Packagist: "Packagist",
  "crates.io": "crates.io",
};

export const scanVulnerabilities = async (dependencies, ecosystem) => {
  const osvEcosystem = ecosystemMap[ecosystem] || ecosystem;
  const vulnerabilities = [];

  const chunks = [];
  for (let i = 0; i < dependencies.length; i += CHUNK_SIZE) {
    chunks.push(dependencies.slice(i, i + CHUNK_SIZE));
  }

  for (const chunk of chunks) {
    const queries = chunk.map((dep) => {
      const cleanVer = dep.version && dep.version !== 'unknown'
        ? semver.clean(dep.version) || semver.coerce(dep.version)?.version || null
        : null;
      return {
        package: { name: dep.name, ecosystem: osvEcosystem },
        ...(cleanVer ? { version: cleanVer } : {}),
      };
    });

    try {
      const response = await axios.post(OSV_BATCH_URL, { queries }, {
        timeout: 30000,
        headers: { 'Content-Type': 'application/json' },
      });

      const results = response.data.results || [];

      const vulnIds = [];
      results.forEach((result, idx) => {
        const dep = chunk[idx];
        (result.vulns || []).forEach(vuln => {
          vulnIds.push({ id: vuln.id, dep });
        });
      });

      const DETAIL_BATCH = 20;
      for (let i = 0; i < vulnIds.length; i += DETAIL_BATCH) {
        const batch = vulnIds.slice(i, i + DETAIL_BATCH);
        const detailResults = await Promise.allSettled(
          batch.map(({ id }) =>
            axios.get(`https://api.osv.dev/v1/vulns/${id}`, { timeout: 10000 })
          )
        );

        detailResults.forEach((result, idx) => {
          if (result.status !== 'fulfilled') return;
          const vuln = result.value.data;
          const dep = batch[idx].dep;
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
        });
      }

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
    const response = await axios.post(
      'https://api.osv.dev/v1/querybatch',
      { queries },
      { timeout: 20000, headers: { 'Content-Type': 'application/json' } }
    );

    const batchResults = response.data.results || [];

    const toFetch = [];
    batchResults.forEach((result, idx) => {
      if (result.vulns?.length > 0) {
        toFetch.push({ id: result.vulns[0].id, pkg: packages[idx] });
      }
    });

    const detailResults = await Promise.allSettled(
      toFetch.map(({ id }) =>
        axios.get(`https://api.osv.dev/v1/vulns/${id}`, { timeout: 10000 })
      )
    );

    detailResults.forEach((result, idx) => {
      if (result.status !== 'fulfilled') return;
      const vuln = result.value.data;
      const pkg = toFetch[idx].pkg;
      results.push({
        packageName: pkg.name,
        ecosystem: pkg.ecosystem,
        severity: extractSeverity(vuln),
        cveId: vuln.aliases?.find(a => a.startsWith('CVE-')) || vuln.id,
        summary: vuln.summary || 'Vulnerability reported.',
        publishedAt: vuln.published ? new Date(vuln.published) : new Date()
      });
    });

  } catch (err) {
    console.error('[OSV] Feed batch fetch error:', err.message);
  }

  return results
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .slice(0, 20);
};

const extractSeverity = (vuln) => {
  if (vuln.database_specific?.severity){
    const sev= vuln.database_specific.severity.toUpperCase();
    if (sev === 'MODERATE') return 'MEDIUM';
    return sev;

  }
  if (vuln.severity?.length > 0) {
    const cvss = vuln.severity.find((s) => s.type === "CVSS_V3");
    if (cvss) {
      const vectorString = cvss.score;
      const numericScore = parseFloat(
        vectorString.includes('/') 
          ? null 
          : vectorString
      );
      if (!isNaN(numericScore)) {
        if (numericScore >= 9.0) return 'CRITICAL';
        if (numericScore >= 7.0) return 'HIGH';
        if (numericScore >= 4.0) return 'MEDIUM';
        return 'LOW';
      }
    }
  }
  return "UNKNOWN";
};

const extractFixedVersion = (vuln, pkgName) => {
  const affected = vuln.affected || [];
  for (const aff of affected) {
    if (aff.package?.name === pkgName) {
      const ranges = aff.ranges || [];
      for (const range of ranges) {
        const fixed = range.events?.find((e) => e.fixed);
        if (fixed) return fixed.fixed;
      }
    }
  }
  return null;
};
