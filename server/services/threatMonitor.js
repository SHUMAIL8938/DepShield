import axios from "axios";
import Scan from "../models/Scan.js";
import Alert from "../models/Alert.js";
import semver from "semver";
import {
  fetchRecentAdvisories,
  extractAffectedPackages,
  normalizeEcosystem,
} from "./githubAdvisory.js";
import { sendThreatAlert } from "./email.js";

export const runThreatMonitor = async () => {
  console.log("[THREAT] Starting threat monitor run...");

  try {
    const advisories = await fetchRecentAdvisories(6);
    if (advisories.length === 0) {
      console.log("[THREAT] No new advisories found");
      return;
    }

    const affectedPackages = [];
    for (const advisory of advisories) {
      const packages = extractAffectedPackages(advisory);
      affectedPackages.push(...packages);
    }

    console.log(
      `[THREAT] ${affectedPackages.length} package advisories to check`,
    );

    if (affectedPackages.length === 0) return;

    const userIds = await Scan.distinct("userId", {
      "packages.0": { $exists: true },
    });

    console.log(`[THREAT] Checking ${userIds.length} users`);

    for (const userId of userIds) {
      await checkUserPackages(userId, affectedPackages);
    }

    console.log("[THREAT] Threat monitor run complete");
  } catch (err) {
    console.error("[THREAT] Monitor error:", err.message);
  }
};

const checkUserPackages = async (userId, affectedPackages) => {
  try {
    const userScans = await Scan.aggregate([
      { $match: { userId, "packages.0": { $exists: true } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$githubRepo",
          latestScan: { $first: "$$ROOT" },
        },
      },
      { $replaceRoot: { newRoot: "$latestScan" } },
    ]);

    if (userScans.length === 0) return;

    const userPackages = new Map();
    for (const scan of userScans) {
      for (const pkg of scan.packages || []) {
        const key = `${pkg.name}::${pkg.ecosystem}`;
        if (!userPackages.has(key)) {
          userPackages.set(key, {
            name: pkg.name,
            version: pkg.version,
            ecosystem: pkg.ecosystem,
            repo: scan.githubRepo || scan.manifestFile,
          });
        }
      }
    }

    const matches = [];
    for (const affected of affectedPackages) {
      const normalizedEcosystem = normalizeEcosystem(affected.ecosystem);
      const key = `${affected.name}::${normalizedEcosystem}`;

      if (!userPackages.has(key)) continue;

      const userPkg = userPackages.get(key);

      if (
        affected.vulnerableVersions &&
        userPkg.version &&
        userPkg.version !== "unknown"
      ) {
        try {
          const cleanVersion = semver.coerce(userPkg.version)?.version;
          if (cleanVersion) {
            const isVulnerable = semver.satisfies(
              cleanVersion,
              affected.vulnerableVersions,
            );
            if (!isVulnerable) {
              console.log(
                `[THREAT] ${affected.name}@${userPkg.version} not in vulnerable range ${affected.vulnerableVersions} — skipping`,
              );
              continue;
            }
          }
        } catch (err) {
          console.log(
            `[THREAT] Could not check version range for ${affected.name}: ${err.message}`,
          );
        }
      }
      const alreadyAlerted = await Alert.findOne({
        userId,
        ghsaId: affected.ghsaId,
        packageName: affected.name,
      });

      if (alreadyAlerted) continue;

      matches.push({
        ...affected,
        installedVersion: userPkg.version,
        repo: userPkg.repo,
        ecosystem: normalizedEcosystem,
      });
    }

    if (matches.length === 0) return;

    console.log(`[THREAT] Found ${matches.length} matches for user ${userId}`);

    let userEmail = null;
    try {
      const clerkRes = await axios.get(
        `https://api.clerk.com/v1/users/${userId}`,
        {
          headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
          timeout: 5000,
        },
      );
      userEmail = clerkRes.data.email_addresses?.[0]?.email_address;
    } catch (err) {
      console.error("[THREAT] Failed to fetch user email:", err.message);
    }

    if (userEmail) {
      await sendThreatAlert({
        userEmail,
        userId,
        matches,
      });
    }

    for (const match of matches) {
      try {
        await Alert.create({
          userId,
          ghsaId: match.ghsaId,
          packageName: match.name,
          ecosystem: match.ecosystem,
          severity: match.severity,
        });
      } catch (err) {
        if (err.code !== 11000) {
          console.error("[THREAT] Alert record error:", err.message);
        }
      }
    }
  } catch (err) {
    console.error(`[THREAT] Error checking user ${userId}:`, err.message);
  }
};
