import { URL } from 'url';

const BLOCKED_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
  /^0\./,
  /^metadata\.google\.internal$/i,
  /^169\.254\.169\.254$/
];

export const validateUrl = (urlString) => {
  try {
    const parsed = new URL(urlString);

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, reason: 'Only HTTP/HTTPS protocols allowed.' };
    }

    const hostname = parsed.hostname.toLowerCase();

    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(hostname)) {
        return { valid: false, reason: 'Private/internal addresses not allowed.' };
      }
    }
    return { valid: true };
  } catch {
    return { valid: false, reason: 'Invalid URL format.' };
  }
};

export const validateGithubRepo = (repoString) => {
  const pattern = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;
  if (!pattern.test(repoString)) {
    return { valid: false, reason: 'Invalid GitHub repo format. Use owner/repo.' };
  }
  return { valid: true };
};
