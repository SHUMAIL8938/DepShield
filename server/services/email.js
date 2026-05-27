import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const getSeverityColor = (severity) => {
  switch (severity) {
    case "CRITICAL":
      return "#ff3333";
    case "HIGH":
      return "#ff6600";
    case "MEDIUM":
      return "#ffb000";
    case "LOW":
      return "#00cc33";
    default:
      return "#666666";
  }
};

const buildEmailTemplate = ({
  repoName,
  grade,
  healthScore,
  vulnerabilities,
  scanId,
  serverUrl,
}) => {
  const criticals = vulnerabilities.filter((v) => v.severity === "CRITICAL");
  const highs = vulnerabilities.filter((v) => v.severity === "HIGH");
  const mediums = vulnerabilities.filter((v) => v.severity === "MEDIUM");
  const lows = vulnerabilities.filter((v) => v.severity === "LOW");

  const gradeColor =
    healthScore >= 75 ? "#00ff41" : healthScore >= 50 ? "#ffb000" : "#ff3333";

  const vulnRows = vulnerabilities
    .slice(0, 10)
    .map(
      (v) => `
    <tr style="border-bottom: 1px solid #1a2e1a;">
      <td style="padding: 10px 12px; color: #00ff41; font-family: 'JetBrains Mono', monospace; font-size: 12px;">${v.packageName}@${v.installedVersion}</td>
      <td style="padding: 10px 12px;">
        <span style="background: ${getSeverityColor(v.severity)}22; border: 1px solid ${getSeverityColor(v.severity)}; color: ${getSeverityColor(v.severity)}; padding: 2px 8px; font-size: 10px; font-family: monospace; font-weight: bold;">${v.severity}</span>
      </td>
      <td style="padding: 10px 12px; color: #666; font-family: monospace; font-size: 11px;">${v.cveId || v.packageName}</td>
      <td style="padding: 10px 12px; color: #00cc33; font-family: monospace; font-size: 11px;">${v.fixedVersion ? `→ ${v.fixedVersion}` : "No fix yet"}</td>
    </tr>
  `,
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DepShield Security Alert</title>
</head>
<body style="margin: 0; padding: 0; background: #0a0a0a; font-family: 'JetBrains Mono', 'Courier New', monospace;">
  
  <div style="max-width: 680px; margin: 0 auto; padding: 20px;">
    
    <!-- Header -->
    <div style="border: 1px solid #1a2e1a; background: #111; padding: 20px 24px; margin-bottom: 2px;">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div style="color: #00ff41; font-size: 16px; font-weight: bold; letter-spacing: 0.2em; text-shadow: 0 0 8px #00ff41;">
          [DEPSHIELD]
        </div>
        <div style="color: #ff3333; font-size: 11px; letter-spacing: 0.15em;">
          ⚠ SECURITY ALERT
        </div>
      </div>
    </div>

    <!-- Scan info -->
    <div style="border: 1px solid #1a2e1a; border-top: none; background: #0d0d0d; padding: 20px 24px; margin-bottom: 2px;">
      <div style="color: #666; font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 12px;">
        SCAN REPORT — ${new Date().toUTCString()}
      </div>
      <div style="color: #00ff41; font-size: 14px; margin-bottom: 16px;">
        Repository: <strong>${repoName}</strong>
      </div>
      
      <!-- Grade and score -->
      <div style="display: inline-block; border: 1px solid ${gradeColor}; padding: 12px 20px; margin-right: 16px;">
        <div style="color: #666; font-size: 9px; letter-spacing: 0.15em; margin-bottom: 4px;">GRADE</div>
        <div style="color: ${gradeColor}; font-size: 28px; font-weight: bold;">${grade}</div>
      </div>
      <div style="display: inline-block; border: 1px solid #1a2e1a; padding: 12px 20px; margin-right: 16px;">
        <div style="color: #666; font-size: 9px; letter-spacing: 0.15em; margin-bottom: 4px;">HEALTH SCORE</div>
        <div style="color: ${gradeColor}; font-size: 28px; font-weight: bold;">${healthScore}/100</div>
      </div>
      <div style="display: inline-block; border: 1px solid #1a2e1a; padding: 12px 20px;">
        <div style="color: #666; font-size: 9px; letter-spacing: 0.15em; margin-bottom: 4px;">VULNERABILITIES</div>
        <div style="color: #ff3333; font-size: 28px; font-weight: bold;">${vulnerabilities.length}</div>
      </div>
    </div>

    <!-- Severity breakdown -->
    <div style="border: 1px solid #1a2e1a; border-top: none; background: #0d0d0d; padding: 16px 24px; margin-bottom: 2px;">
      <div style="color: #666; font-size: 9px; letter-spacing: 0.15em; margin-bottom: 12px;">SEVERITY BREAKDOWN</div>
      <div>
        ${criticals.length > 0 ? `<span style="background: #ff333322; border: 1px solid #ff3333; color: #ff3333; padding: 4px 12px; font-size: 11px; margin-right: 8px;">${criticals.length} CRITICAL</span>` : ""}
        ${highs.length > 0 ? `<span style="background: #ff660022; border: 1px solid #ff6600; color: #ff6600; padding: 4px 12px; font-size: 11px; margin-right: 8px;">${highs.length} HIGH</span>` : ""}
        ${mediums.length > 0 ? `<span style="background: #ffb00022; border: 1px solid #ffb000; color: #ffb000; padding: 4px 12px; font-size: 11px; margin-right: 8px;">${mediums.length} MEDIUM</span>` : ""}
        ${lows.length > 0 ? `<span style="background: #00cc3322; border: 1px solid #00cc33; color: #00cc33; padding: 4px 12px; font-size: 11px;">${lows.length} LOW</span>` : ""}
      </div>
    </div>

    <!-- Vulnerability table -->
    <div style="border: 1px solid #1a2e1a; border-top: none; background: #0d0d0d; margin-bottom: 2px;">
      <div style="padding: 12px 24px; border-bottom: 1px solid #1a2e1a;">
        <div style="color: #666; font-size: 9px; letter-spacing: 0.15em;">
          VULNERABILITY DETAILS ${vulnerabilities.length > 10 ? `(showing 10 of ${vulnerabilities.length})` : ""}
        </div>
      </div>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 1px solid #1a2e1a;">
            <th style="padding: 8px 12px; text-align: left; color: #444; font-size: 9px; letter-spacing: 0.1em;">PACKAGE</th>
            <th style="padding: 8px 12px; text-align: left; color: #444; font-size: 9px; letter-spacing: 0.1em;">SEVERITY</th>
            <th style="padding: 8px 12px; text-align: left; color: #444; font-size: 9px; letter-spacing: 0.1em;">CVE ID</th>
            <th style="padding: 8px 12px; text-align: left; color: #444; font-size: 9px; letter-spacing: 0.1em;">FIX</th>
          </tr>
        </thead>
        <tbody>
          ${vulnRows}
        </tbody>
      </table>
    </div>

    <!-- CTA -->
    <div style="border: 1px solid #1a2e1a; border-top: none; background: #0d0d0d; padding: 20px 24px; margin-bottom: 2px; text-align: center;">
      <a href="${serverUrl?.replace("/api", "") || "https://depshield-app.vercel.app"}/scan/${scanId}" 
         style="display: inline-block; border: 1px solid #00cc33; color: #00ff41; padding: 12px 32px; font-family: monospace; font-size: 12px; letter-spacing: 0.15em; text-decoration: none; text-transform: uppercase;">
        VIEW FULL REPORT →
      </a>
    </div>

    <!-- Footer -->
    <div style="padding: 16px 24px; text-align: center;">
      <div style="color: #333; font-size: 10px; letter-spacing: 0.1em;">
        DEPSHIELD — Automated dependency vulnerability monitoring
      </div>
      <div style="color: #222; font-size: 9px; margin-top: 4px;">
        You received this because you registered a webhook for ${repoName}
      </div>
    </div>

  </div>
</body>
</html>
  `;
};

export const sendVulnerabilityAlert = async ({
  userEmail,
  repoName,
  grade,
  healthScore,
  vulnerabilities,
  scanId,
}) => {
  console.log(`[EMAIL] Called - to: ${userEmail}, vulns: ${vulnerabilities.length}, serious: ${vulnerabilities.filter(v => v.severity === 'CRITICAL' || v.severity === 'HIGH').length}`);

  if (!process.env.RESEND_API_KEY) {
    console.log('[EMAIL] Resend API key not configured — skipping');
    return;
  }

  if (!userEmail) {
    console.log('[EMAIL] No user email — skipping');
    return;
  }

  const serious = vulnerabilities.filter(
    v => v.severity === 'CRITICAL' || v.severity === 'HIGH'
  );

  if (serious.length === 0) {
    console.log('[EMAIL] No critical/high vulns — skipping');
    return;
  }

  try {
    const html = buildEmailTemplate({
      repoName, grade, healthScore, vulnerabilities, scanId,
      serverUrl: process.env.CLIENT_URL,
    });

    const { data, error } = await resend.emails.send({
      from: 'DepShield <onboarding@resend.dev>',
      to: userEmail,
      subject: `⚠️ [DepShield] ${serious.filter(v => v.severity === 'CRITICAL').length > 0 ? 'CRITICAL' : 'HIGH'} vulnerabilities found in ${repoName}`,
      html,
    });

    if (error) {
      console.error('[EMAIL] Resend error:', error);
      return;
    }

    console.log(`[EMAIL] Alert sent to ${userEmail}, id: ${data.id}`);
  } catch (err) {
    console.error('[EMAIL] Failed to send:', err.message);
  }
};

export const sendThreatAlert = async ({ userEmail, userId, matches }) => {
  console.log(`[THREAT EMAIL] Sending alert to ${userEmail} for ${matches.length} matches`);

  if (!process.env.RESEND_API_KEY) {
    console.log('[THREAT EMAIL] Resend not configured — skipping');
    return;
  }

  const criticals = matches.filter(m => m.severity === 'CRITICAL');
  const highs = matches.filter(m => m.severity === 'HIGH');
  const worstSeverity = criticals.length > 0 ? 'CRITICAL' : highs.length > 0 ? 'HIGH' : 'MEDIUM';
  const worstColor = worstSeverity === 'CRITICAL' ? '#ff3333' : worstSeverity === 'HIGH' ? '#ff6600' : '#ffb000';

  const matchRows = matches.slice(0, 15).map(m => `
    <tr style="border-bottom: 1px solid #1a2e1a;">
      <td style="padding: 10px 12px; color: #00ff41; font-family: monospace; font-size: 12px;">
        ${m.name}@${m.installedVersion || 'unknown'}
      </td>
      <td style="padding: 10px 12px;">
        <span style="background: ${getSeverityColor(m.severity)}22; border: 1px solid ${getSeverityColor(m.severity)}; color: ${getSeverityColor(m.severity)}; padding: 2px 8px; font-size: 10px; font-family: monospace; font-weight: bold;">
          ${m.severity}
        </span>
      </td>
      <td style="padding: 10px 12px; color: #666; font-family: monospace; font-size: 11px;">
        ${m.cveId || m.ghsaId}
      </td>
      <td style="padding: 10px 12px; color: #00cc33; font-family: monospace; font-size: 11px;">
        ${m.fixedVersion ? `→ ${m.fixedVersion}` : 'Monitor for patch'}
      </td>
      <td style="padding: 10px 12px; color: #666; font-family: monospace; font-size: 10px;">
        ${m.repo || 'unknown'}
      </td>
    </tr>
  `).join('');

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'JetBrains Mono','Courier New',monospace;">
  <div style="max-width:700px;margin:0 auto;padding:20px;">

    <div style="border:1px solid #1a2e1a;background:#111;padding:20px 24px;margin-bottom:2px;">
      <div style="color:#00ff41;font-size:16px;font-weight:bold;letter-spacing:0.2em;">[DEPSHIELD]</div>
      <div style="color:${worstColor};font-size:11px;letter-spacing:0.15em;margin-top:4px;">
        ⚠ SUPPLY CHAIN THREAT DETECTED
      </div>
    </div>

    <div style="border:1px solid #1a2e1a;border-top:none;background:#0d0d0d;padding:20px 24px;margin-bottom:2px;">
      <div style="color:#666;font-size:10px;letter-spacing:0.15em;margin-bottom:12px;">
        THREAT INTELLIGENCE ALERT — ${new Date().toUTCString()}
      </div>
      <div style="color:#00ff41;font-size:13px;margin-bottom:8px;">
        DepShield detected <strong style="color:${worstColor}">${matches.length} new ${worstSeverity} ${matches.length === 1 ? 'vulnerability' : 'vulnerabilities'}</strong> affecting packages in your projects.
      </div>
      <div style="color:#666;font-size:11px;line-height:1.6;">
        These advisories were published in the last 6 hours and affect packages you have installed.
        This alert was triggered before your next scheduled scan.
      </div>
    </div>

    <div style="border:1px solid #1a2e1a;border-top:none;background:#0d0d0d;padding:16px 24px;margin-bottom:2px;">
      <div style="color:#666;font-size:9px;letter-spacing:0.15em;margin-bottom:12px;">SEVERITY BREAKDOWN</div>
      <div>
        ${criticals.length > 0 ? `<span style="background:#ff333322;border:1px solid #ff3333;color:#ff3333;padding:4px 12px;font-size:11px;margin-right:8px;">${criticals.length} CRITICAL</span>` : ''}
        ${highs.length > 0 ? `<span style="background:#ff660022;border:1px solid #ff6600;color:#ff6600;padding:4px 12px;font-size:11px;margin-right:8px;">${highs.length} HIGH</span>` : ''}
        ${matches.filter(m => m.severity === 'MEDIUM').length > 0 ? `<span style="background:#ffb00022;border:1px solid #ffb000;color:#ffb000;padding:4px 12px;font-size:11px;">${matches.filter(m => m.severity === 'MEDIUM').length} MEDIUM</span>` : ''}
      </div>
    </div>

    <div style="border:1px solid #1a2e1a;border-top:none;background:#0d0d0d;margin-bottom:2px;">
      <div style="padding:12px 24px;border-bottom:1px solid #1a2e1a;">
        <div style="color:#666;font-size:9px;letter-spacing:0.15em;">AFFECTED PACKAGES IN YOUR PROJECTS</div>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="border-bottom:1px solid #1a2e1a;">
            <th style="padding:8px 12px;text-align:left;color:#444;font-size:9px;">PACKAGE</th>
            <th style="padding:8px 12px;text-align:left;color:#444;font-size:9px;">SEVERITY</th>
            <th style="padding:8px 12px;text-align:left;color:#444;font-size:9px;">CVE/GHSA</th>
            <th style="padding:8px 12px;text-align:left;color:#444;font-size:9px;">FIX</th>
            <th style="padding:8px 12px;text-align:left;color:#444;font-size:9px;">REPO</th>
          </tr>
        </thead>
        <tbody>${matchRows}</tbody>
      </table>
    </div>

    ${matches.slice(0, 5).map(m => m.summary ? `
    <div style="border:1px solid #1a2e1a;border-top:none;background:#0d0d0d;padding:14px 24px;margin-bottom:2px;">
      <div style="color:#00ff41;font-size:10px;margin-bottom:6px;font-weight:bold;">${m.name} — ${m.ghsaId}</div>
      <div style="color:#666;font-size:11px;line-height:1.6;">${m.summary}</div>
      ${m.url ? `<a href="${m.url}" style="color:#00cc33;font-size:10px;text-decoration:none;">→ View advisory on GitHub</a>` : ''}
    </div>
    ` : '').join('')}

    <div style="border:1px solid #1a2e1a;border-top:none;background:#0d0d0d;padding:20px 24px;margin-bottom:2px;text-align:center;">
      <div style="color:#666;font-size:11px;margin-bottom:14px;">Run a new scan to get the full updated vulnerability report</div>
      <a href="https://depshield-app.vercel.app/scan/new"
         style="display:inline-block;border:1px solid #00cc33;color:#00ff41;padding:12px 32px;font-family:monospace;font-size:12px;letter-spacing:0.15em;text-decoration:none;text-transform:uppercase;">
        RUN NEW SCAN →
      </a>
    </div>

    <div style="padding:16px 24px;text-align:center;">
      <div style="color:#333;font-size:10px;">DEPSHIELD — Real-time supply chain threat monitoring</div>
      <div style="color:#222;font-size:9px;margin-top:4px;">
        You received this because DepShield detected new advisories affecting your installed packages.
      </div>
    </div>

  </div>
</body>
</html>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: 'DepShield <onboarding@resend.dev>',
      to: userEmail,
      subject: `⚠️ [DepShield] ${worstSeverity} supply chain threat detected in your packages`,
      html,
    });

    if (error) {
      console.error('[THREAT EMAIL] Resend error:', error);
      return;
    }

    console.log(`[THREAT EMAIL] Alert sent to ${userEmail}, id: ${data.id}`);
  } catch (err) {
    console.error('[THREAT EMAIL] Failed:', err.message);
  }
};