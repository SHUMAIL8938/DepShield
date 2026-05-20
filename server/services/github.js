import axios from 'axios';
import { validateGithubRepo } from '../utils/ssrfGuard.js';
import { detectEcosystem } from '../utils/manifestParser.js';

const MANIFEST_FILES = [
  'package.json', 'requirements.txt', 'Pipfile', 'pyproject.toml',
  'pom.xml', 'build.gradle', 'Gemfile', 'go.mod', 'composer.json', 'Cargo.toml'
];

export const fetchManifestFromGithub = async (repoFullName, specificFile = null) => {
  const validation = validateGithubRepo(repoFullName);
  if (!validation.valid) throw new Error(validation.reason);

  if (specificFile) {
    return fetchFile(repoFullName, specificFile);
  }

  for (const file of MANIFEST_FILES) {
    try {
      const result = await fetchFile(repoFullName, file);
      if (result) return result;
    } catch {
      continue;
    }
  }

  throw new Error('No supported manifest file found in repository root.');
};

const fetchFile = async (repoFullName, filename) => {
  const url = `https://api.github.com/repos/${repoFullName}/contents/${filename}`;
  const response = await axios.get(url, {
    timeout: 10000,
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'DepShield/1.0'
    }
  });

  if (response.data.size > 500000) {
    throw new Error('Manifest file too large (max 500KB).');
  }

  const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
  const ecosystem = detectEcosystem(filename);

  return { content, filename, ecosystem };
};
