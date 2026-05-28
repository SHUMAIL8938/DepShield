import axios from "axios";

const GITHUB_ADVISORY_URL = "https://api.github.com/advisories";

const ecosystemMap = {
  npm: "npm",
  PyPI: "pip",
  Maven: "maven",
  RubyGems: "rubygems",
  Go: "go",
  Packagist: "composer",
  "crates.io": "rust",
};

const getHeaders = () => ({
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "DepShield/1.0",
  ...(process.env.GITHUB_TOKEN && {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
  }),
});

export const fetchRecentAdvisories = async (sinceHours = 6) => {
  const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000);
  const advisories = [];
  try {
    for (let page = 1; page <= 3; page++) {
      const response = await axios.get(GITHUB_ADVISORY_URL, {
        headers: getHeaders(),
        timeout: 15000,
        params: {
          type: 'reviewed',
          per_page: 100,
          page,
          order: 'desc',
          sort: 'published'
        }
      });
      
      const data = response.data || [];
      if (data.length === 0) break;

      const recent = data.filter(a =>
        new Date(a.published_at) >= since
      );
      advisories.push(...recent);
      if (recent.length === 0) break;
    }

    console.log(`[ADVISORY] Fetched ${advisories.length} advisories in last ${sinceHours}h`);
    return advisories;

  } catch (err) {
    console.error('[ADVISORY] Fetch error:', err.message);
    return [];
  }
};

export const extractAffectedPackages = (advisory) => {
  const affected = [];

  const vulns = advisory.vulnerabilities || [];
  for (const vuln of vulns) {
    const ecosystem = vuln.package?.ecosystem;
    const packageName = vuln.package?.name;
    if (!ecosystem || !packageName) continue;

    affected.push({
      name: packageName,
      ecosystem: ecosystem.toLowerCase(),
      ghsaId: advisory.ghsa_id,
      cveId: advisory.cve_id,
      severity: advisory.severity?.toUpperCase() || "UNKNOWN",
      summary: advisory.summary,
      publishedAt: advisory.published_at,
      fixedVersion: vuln.patched_versions || null,
      vulnerableVersions: vuln.vulnerable_versions || null,
      url: advisory.html_url,
    });
  }

  return affected;
};

export const normalizeEcosystem = (githubEcosystem) => {
  const map = {
    npm: "npm",
    pip: "PyPI",
    maven: "Maven",
    rubygems: "RubyGems",
    go: "Go",
    composer: "Packagist",
    rust: "crates.io",
    nuget: "NuGet",
  };
  return map[githubEcosystem?.toLowerCase()] || githubEcosystem;
};
