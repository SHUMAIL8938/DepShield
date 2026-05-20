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

