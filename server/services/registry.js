import axios from 'axios';
import semver from 'semver';

const NPM_REGISTRY = 'https://registry.npmjs.org';
const PYPI_REGISTRY = 'https://pypi.org/pypi';

export const checkOutdatedPackages = async (dependencies, ecosystem) => {
  const outdated = [];
  const batchSize = 20;

  for (let i = 0; i < dependencies.length; i += batchSize) {
    const batch = dependencies.slice(i, i + batchSize);
    const promises = batch.map(dep => checkSinglePackage(dep, ecosystem));
    const results = await Promise.allSettled(promises);

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        outdated.push(result.value);
      }
    }
  }

  return outdated;
};

const checkSinglePackage = async (dep, ecosystem) => {
  if (!dep.version || dep.version === 'unknown') return null;

  try {
    if (ecosystem === 'npm') {
      const response = await axios.get(`${NPM_REGISTRY}/${encodeURIComponent(dep.name)}/latest`, {
        timeout: 5000,
        headers: { 'Accept': 'application/json' }
      });
      const latest = response.data.version;
      if (!latest || !semver.valid(dep.version) || !semver.valid(latest)) return null;
      if (semver.gte(dep.version, latest)) return null;

      const updateType = semver.diff(dep.version, latest);
      const normalizedType = updateType?.includes('major') ? 'major'
        : updateType?.includes('minor') ? 'minor' : 'patch';

      return { name: dep.name, current: dep.version, latest, updateType: normalizedType };
    }

    if (ecosystem === 'PyPI') {
      const response = await axios.get(`${PYPI_REGISTRY}/${dep.name}/json`, {
        timeout: 5000
      });
      const latest = response.data.info?.version;
      if (!latest || dep.version === latest) return null;

      return { name: dep.name, current: dep.version, latest, updateType: 'unknown' };
    }
  } catch {
    return null;
  }

  return null;
};

export const fetchLicenses = async (dependencies, ecosystem) => {
  const licenses = [];
  if (ecosystem !== 'npm') return licenses;

  const batchSize = 15;
  for (let i = 0; i < Math.min(dependencies.length, 50); i += batchSize) {
    const batch = dependencies.slice(i, i + batchSize);
    const promises = batch.map(async (dep) => {
      try {
        const res = await axios.get(`${NPM_REGISTRY}/${encodeURIComponent(dep.name)}/latest`, {
          timeout: 5000
        });
        return { name: dep.name, license: res.data.license || 'Unknown' };
      } catch {
        return { name: dep.name, license: 'Unknown' };
      }
    });
    const results = await Promise.allSettled(promises);
    for (const r of results) {
      if (r.status === 'fulfilled') licenses.push(r.value);
    }
  }
  return licenses;
};
