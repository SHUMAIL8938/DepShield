import axios from "axios";
import { validateGithubRepo } from "../utils/ssrfGuard.js";
import { detectEcosystem } from "../utils/manifestParser.js";

const MANIFEST_FILENAMES = [
  "package.json",
  "requirements.txt",
  "Pipfile",
  "pyproject.toml",
  "pom.xml",
  'client/package.json',
  'server/package.json',
  'frontend/package.json',
  'backend/package.json',
  "build.gradle",
  "Gemfile",
  "go.mod",
  "composer.json",
  "Cargo.toml",
];

const getHeaders = () => ({
  'Accept': 'application/vnd.github.v3+json',
  'User-Agent': 'DepShield/1.0',
  ...(process.env.GITHUB_TOKEN && {
    'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`
  })
});
 
export const fetchManifestFromGithub = async (repoFullName, specificFile = null) => {
  const validation = validateGithubRepo(repoFullName);
  if (!validation.valid) throw new Error(validation.reason);
  const cleanRepo = validation.cleaned;

  if (specificFile) {
    return fetchFile(cleanRepo, specificFile);
  }

  const manifestPaths = await findManifestFiles(cleanRepo);
  if (manifestPaths.length === 0) {
    throw new Error('No supported manifest file found in repository.');
  }
  const results = await Promise.allSettled(
    manifestPaths.map(path => fetchFile(cleanRepo, path))
  );

  const valid = results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);

  if (valid.length === 0) {
    throw new Error('Could not read any manifest file.');
  }
  valid.sort((a, b) => b.content.length - a.content.length);
  return valid[0];
};
 
export const findManifestFiles = async (repoFullName) => {
  try {
    const repoRes = await axios.get(
      `https://api.github.com/repos/${repoFullName}`,
      { headers: getHeaders(), timeout: 10000 }
    );
    const branch = repoRes.data.default_branch || 'main';
     const treeRes = await axios.get(
      `https://api.github.com/repos/${repoFullName}/git/trees/${branch}?recursive=1`,
      { headers: getHeaders(), timeout: 15000 }
    );
 
    const tree = treeRes.data.tree || [];
 
    const manifests = tree
      .filter(item => item.type === 'blob')
      .map(item => item.path)
      .filter(path => {
        const filename = path.split('/').pop();
        return MANIFEST_FILENAMES.includes(filename);
      })
      .filter(path => !path.includes('node_modules/'))
      .filter(path => !path.includes('vendor/'))
      .filter(path => !path.includes('.git/'))
      .filter(path => !path.includes('dist/'))
      .filter(path => !path.includes('build/'));
 
    return manifests;
  } catch (err) {
    console.error('[GitHub] Tree fetch error:', err.message);
    return [];
  }
};
 
const fetchFile = async (repoFullName, filePath) => {
  const url = `https://api.github.com/repos/${repoFullName}/contents/${filePath}`;
  const response = await axios.get(url, {
    timeout: 10000,
    headers: getHeaders()
  });
 
  if (response.data.size > 500000) {
    throw new Error('Manifest file too large (max 500KB).');
  }
 
  const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
  const filename = filePath.split('/').pop();
  const ecosystem = detectEcosystem(filename);
 
  return { content, filename, ecosystem, path: filePath };
};