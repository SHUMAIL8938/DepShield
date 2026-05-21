import { parseStringPromise } from "xml2js";
export const detectEcosystem = (filename) => {
  const name = filename.toLowerCase();
  if (name === "package.json") return "npm";
  if (name === "requirements.txt") return "PyPI";
  if (name === "pipfile") return "PyPI";
  if (name === "pyproject.toml") return "PyPI";
  if (name === "pom.xml") return "Maven";
  if (name === "build.gradle" || name === "build.gradle.kts") return "Maven";
  if (name === "gemfile") return "RubyGems";
  if (name === "go.mod") return "Go";
  if (name === "composer.json") return "Packagist";
  if (name === "cargo.toml") return "crates.io";
  return null;
};

export const parseManifest = async (content, ecosystem) => {
  const deps = [];

  try {
    switch (ecosystem) {
      case "npm": {
        const json = JSON.parse(content);
        const allDeps = {
          ...(json.dependencies || {}),
          ...(json.devDependencies || {}),
          ...(json.peerDependencies || {}),
        };
        if (Object.keys(allDeps).length === 0) {
          throw new Error("No dependencies found in package.json");
        }

        for (const [name, version] of Object.entries(allDeps)) {
          if (!name || !version || typeof version !== "string") continue;
          deps.push({
            name,
            version: version.replace(/^[\^~>=<*]/, "").trim() || "unknown",
          });
        }
        break;
      }

      case "PyPI": {
        if (content.includes("[tool.poetry") || content.includes("[project]")) {
          const lines = content.split("\n");
          let inDeps = false;
          for (const line of lines) {
            if (line.match(/dependencies\s*=/)) {
              inDeps = true;
              continue;
            }
            if (inDeps && line.startsWith("[")) {
              inDeps = false;
            }
            if (inDeps) {
              const match = line.match(/["']?([a-zA-Z0-9_-]+)["']?\s*[>=<!]/);
              if (match)
                deps.push({ name: match[1], version: extractVersion(line) });
            }
          }
        } else {
          const lines = content.split("\n");
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("#")) continue;
            const match = trimmed.match(
              /^([a-zA-Z0-9_-]+)\s*(?:[>=<!]=?\s*([\d.]+))?/,
            );
            if (match)
              deps.push({ name: match[1], version: match[2] || "unknown" });
          }
        }
        break;
      }

      case "Maven": {
        if (content.includes("<project")) {
          const result = await parseStringPromise(content);
          const dependencies =
            result?.project?.dependencies?.[0]?.dependency || [];
          for (const dep of dependencies) {
            deps.push({
              name: `${dep.groupId?.[0]}:${dep.artifactId?.[0]}`,
              version: dep.version?.[0] || "unknown",
            });
          }
        } else {
          const matches = content.matchAll(
            /['"]([a-zA-Z0-9._-]+):([a-zA-Z0-9._-]+):([^'"]+)['"]/g,
          );
          for (const match of matches) {
            deps.push({ name: `${match[1]}:${match[2]}`, version: match[3] });
          }
        }
        break;
      }

      case "RubyGems": {
        const matches = content.matchAll(
          /gem\s+['"]([^'"]+)['"]\s*(?:,\s*['"]([^'"]+)['"])?/g,
        );
        for (const match of matches) {
          deps.push({
            name: match[1],
            version: match[2]?.replace(/^[~>=<]/, "") || "unknown",
          });
        }
        break;
      }

      case "Go": {
        const matches = content.matchAll(/^\s+([^\s]+)\s+v([^\s]+)/gm);
        for (const match of matches) {
          deps.push({ name: match[1], version: match[2] });
        }
        break;
      }

      case "Packagist": {
        const json = JSON.parse(content);
        const allDeps = { ...json.require, ...json["require-dev"] };
        for (const [name, version] of Object.entries(allDeps)) {
          if (name === "php" || name.startsWith("ext-")) continue;
          deps.push({ name, version: version.replace(/^[\^~>=<]/, "") });
        }
        break;
      }

      case "crates.io": {
        const lines = content.split("\n");
        let inDeps = false;
        for (const line of lines) {
          if (line.match(/^\[.*dependencies/)) {
            inDeps = true;
            continue;
          }
          if (inDeps && line.startsWith("[")) {
            inDeps = false;
          }
          if (inDeps) {
            const simple = line.match(
              /^([a-zA-Z0-9_-]+)\s*=\s*["']([^"']+)["']/,
            );
            const table = line.match(
              /^([a-zA-Z0-9_-]+)\s*=\s*\{.*version\s*=\s*["']([^"']+)["']/,
            );
            if (simple)
              deps.push({
                name: simple[1],
                version: simple[2].replace(/^[^0-9]*/, ""),
              });
            else if (table)
              deps.push({
                name: table[1],
                version: table[2].replace(/^[^0-9]*/, ""),
              });
          }
        }
        break;
      }
    }
  } catch (err) {
    throw new Error(`Failed to parse ${ecosystem} manifest: ${err.message}`);
  }

  return deps;
};

const extractVersion = (line) => {
  const match = line.match(/[>=!<]+\s*([\d.]+)/);
  return match ? match[1] : "unknown";
};
