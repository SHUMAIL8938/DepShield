export const detectEcosystem = (filename) => {
  const name = filename.toLowerCase();

  if (name === 'package.json') {
    return 'npm';
  }

  return null;
};

export const parseManifest = async (content, ecosystem) => {
  if (ecosystem !== 'npm') {
    throw new Error('Unsupported ecosystem');
  }

  try {
    const json = JSON.parse(content);

    const allDeps = {
      ...json.dependencies,
      ...json.devDependencies,
      ...json.peerDependencies
    };

    const deps = [];

    for (const [name, version] of Object.entries(allDeps || {})) {
      deps.push({
        name,
        version: String(version).replace(/^[\^~>=<]/, '')
      });
    }

    return deps;
  } catch (err) {
    throw new Error(`Failed to parse npm manifest: ${err.message}`);
  }
};