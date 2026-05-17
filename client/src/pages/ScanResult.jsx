import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';

const gradeClass = (g) => ({ A: 'grade-a', B: 'grade-b', C: 'grade-c', D: 'grade-d', F: 'grade-f' }[g] || '');

const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, UNKNOWN: 4 };

const SeverityBadge = ({ severity }) => {
  const cls = {
    CRITICAL: 'badge-critical',
    HIGH: 'badge-high',
    MEDIUM: 'badge-medium',
    LOW: 'badge-low',
    UNKNOWN: 'badge-unknown'
  }[severity] || 'badge-unknown';
  return <span className={`${cls} px-2 py-0.5 rounded text-xs font-bold`}>{severity}</span>;
};

const ScoreGauge = ({ score, grade }) => {
  const color = score >= 75 ? '#00ff41' : score >= 50 ? '#ffb000' : '#ff3333';
  const glow = score >= 75 ? '0 0 20px #00ff41' : score >= 50 ? '0 0 20px #ffb000' : '0 0 20px #ff3333';
  return (
    <div className="flex flex-col items-center justify-center py-4">
      <div className="relative w-36 h-36">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r="50" fill="none" stroke="#1a2e1a" strokeWidth="8" />
          <circle
            cx="60" cy="60" r="50"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={`${2 * Math.PI * 50}`}
            strokeDashoffset={`${2 * Math.PI * 50 * (1 - score / 100)}`}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(${glow})`, transition: 'stroke-dashoffset 1.5s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={`text-3xl font-bold ${gradeClass(grade)}`} style={{ textShadow: glow.replace('drop-shadow', '') }}>
            {grade}
          </div>
          <div className="text-xs text-terminal-gray">{score}/100</div>
        </div>
      </div>
      <div className="text-xs text-terminal-gray mt-2 tracking-widest">HEALTH SCORE</div>
    </div>
  );
};

export default function ScanResult() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [scan, setScan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('vulns');
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    api.get(`/scan/${id}`)
      .then(r => setScan(r.data.scan))
      .catch(() => navigate('/dashboard'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-64 text-terminal-green text-xs">
      LOADING SCAN DATA<span className="cursor">_</span>
    </div>
  );

  if (!scan) return null;

  const sortedVulns = [...(scan.vulnerabilities || [])].sort((a, b) =>
    (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4)
  );

  const filteredVulns = filter === 'ALL' ? sortedVulns : sortedVulns.filter(v => v.severity === filter);

  const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  sortedVulns.forEach(v => { if (counts[v.severity] !== undefined) counts[v.severity]++; });

  const criticalFixes = sortedVulns
    .filter(v => v.severity === 'CRITICAL' && v.fixedVersion)
    .map(v => `${v.packageName}@${v.fixedVersion}`);

  const tabs = [
    { id: 'vulns', label: `VULNERABILITIES (${sortedVulns.length})` },
    { id: 'outdated', label: `OUTDATED (${scan.outdatedPackages?.length || 0})` },
    { id: 'licenses', label: `LICENSES (${scan.licenses?.length || 0})` },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <button onClick={() => navigate('/dashboard')} className="text-terminal-gray text-xs hover:text-terminal-green mb-2 block">
            ← BACK TO DASHBOARD
          </button>
          <div className="text-terminal-green glow text-lg font-bold tracking-widest">SCAN REPORT</div>
          <div className="text-terminal-gray text-xs mt-1">
            {scan.githubRepo || scan.manifestFile} · {scan.ecosystem} · {new Date(scan.createdAt).toLocaleString()}
          </div>
        </div>
        <div className="text-terminal-gray text-xs text-right">
          <div>{scan.totalDependencies} dependencies</div>
          <div>{scan.scanDurationMs}ms scan time</div>
          <div className="text-terminal-green capitalize">{scan.sourceType} scan</div>
        </div>
      </div>

      {/* Overview row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Score gauge */}
        <div className="ascii-box" data-label="SECURITY GRADE">
          <ScoreGauge score={scan.healthScore} grade={scan.grade} />
        </div>

        {/* Severity breakdown */}
        <div className="ascii-box p-6" data-label="SEVERITY BREAKDOWN">
          <div className="space-y-3 mt-2">
            {Object.entries(counts).map(([sev, count]) => {
              const max = sortedVulns.length || 1;
              const color = { CRITICAL: '#ff3333', HIGH: '#ff6600', MEDIUM: '#ffb000', LOW: '#00cc33' }[sev];
              return (
                <div key={sev}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className={sev === 'CRITICAL' ? 'text-terminal-red' : sev === 'HIGH' ? 'text-orange-400' : sev === 'MEDIUM' ? 'text-terminal-amber' : 'text-terminal-green-dim'}>
                      {sev}
                    </span>
                    <span className="text-terminal-gray">{count}</span>
                  </div>
                  <div className="health-bar w-full">
                    <div
                      className="health-fill"
                      style={{ width: `${(count / max) * 100}%`, background: color, transition: 'width 1s ease-out' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Fix suggestions */}
        <div className="ascii-box p-6" data-label="FIX PRIORITY">
          <div className="space-y-2 mt-2">
            {sortedVulns.length === 0 ? (
              <div className="text-terminal-green text-xs glow-sm">✓ NO VULNERABILITIES DETECTED</div>
            ) : (
              <>
                {criticalFixes.length > 0 && (
                  <div className="mb-3">
                    <div className="text-terminal-red text-xs mb-2">CRITICAL FIXES:</div>
                    {criticalFixes.slice(0, 4).map(fix => (
                      <div key={fix} className="text-terminal-red text-xs mb-1 pl-2 border-l border-red-900">
                        npm install {fix}
                      </div>
                    ))}
                  </div>
                )}
                <div className="text-terminal-gray text-xs">
                  {counts.CRITICAL > 0 && <div className="text-terminal-red">⚠ {counts.CRITICAL} critical issues require immediate action</div>}
                  {scan.outdatedPackages?.filter(p => p.updateType === 'major').length > 0 && (
                    <div className="text-terminal-amber mt-1">
                      ↑ {scan.outdatedPackages.filter(p => p.updateType === 'major').length} major updates available
                    </div>
                  )}
                  {sortedVulns.length === 0 && scan.outdatedPackages?.length === 0 && (
                    <div className="text-terminal-green">All dependencies are secure and up to date.</div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-terminal-border mb-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-xs tracking-widest uppercase transition-all ${
              activeTab === tab.id
                ? 'text-terminal-green border-b-2 border-terminal-green bg-terminal-green-faint'
                : 'text-terminal-gray hover:text-terminal-green'
            }`}
          >
            {activeTab === tab.id ? '▸ ' : ''}{tab.label}
          </button>
        ))}
      </div>

      {/* Vulnerabilities tab */}
      {activeTab === 'vulns' && (
        <div className="ascii-box" data-label="VULNERABILITY DETAILS">
          {/* Filter bar */}
          <div className="flex gap-2 p-4 border-b border-terminal-border flex-wrap">
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 text-xs border transition-all ${
                  filter === f
                    ? f === 'CRITICAL' ? 'badge-critical' : f === 'HIGH' ? 'badge-high' : f === 'MEDIUM' ? 'badge-medium' : f === 'LOW' ? 'badge-low' : 'border-terminal-green text-terminal-green bg-terminal-green-faint'
                    : 'border-terminal-border text-terminal-gray hover:border-terminal-green-dim'
                }`}
              >
                {f} {f !== 'ALL' && `(${counts[f] || 0})`}
              </button>
            ))}
          </div>

          {filteredVulns.length === 0 ? (
            <div className="p-12 text-center text-terminal-green text-xs glow-sm">
              ✓ NO {filter !== 'ALL' ? filter : ''} VULNERABILITIES FOUND
            </div>
          ) : (
            <div className="divide-y divide-terminal-border">
              {filteredVulns.map((vuln, i) => (
                <div key={i} className={`p-5 hover:bg-terminal-green-faint transition-colors ${vuln.severity === 'CRITICAL' ? 'border-l-2 border-red-900' : ''}`}>
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-terminal-green text-sm font-bold">{vuln.packageName}</span>
                      <span className="text-terminal-gray text-xs">@{vuln.installedVersion}</span>
                      {vuln.fixedVersion && (
                        <span className="text-terminal-green-dim text-xs">→ fix: {vuln.fixedVersion}</span>
                      )}
                    </div>
                    <SeverityBadge severity={vuln.severity} />
                  </div>
                  {vuln.cveId && (
                    <div className="text-terminal-amber text-xs mb-2 font-bold">{vuln.cveId}</div>
                  )}
                  <div className="text-terminal-gray text-xs leading-relaxed">{vuln.description}</div>
                  {vuln.aliases?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {vuln.aliases.map(a => (
                        <span key={a} className="text-terminal-gray text-xs border border-terminal-border px-2 py-0.5">{a}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Outdated tab */}
      {activeTab === 'outdated' && (
        <div className="ascii-box" data-label="OUTDATED PACKAGES">
          {!scan.outdatedPackages?.length ? (
            <div className="p-12 text-center text-terminal-green text-xs glow-sm">✓ ALL PACKAGES ARE UP TO DATE</div>
          ) : (
            <div className="divide-y divide-terminal-border">
              <div className="grid grid-cols-4 gap-4 px-5 py-2 text-terminal-gray text-xs uppercase tracking-widest">
                <div>PACKAGE</div>
                <div>CURRENT</div>
                <div>LATEST</div>
                <div>UPDATE TYPE</div>
              </div>
              {scan.outdatedPackages.map((pkg, i) => (
                <div key={i} className="grid grid-cols-4 gap-4 px-5 py-3 hover:bg-terminal-green-faint text-xs">
                  <div className="text-terminal-green">{pkg.name}</div>
                  <div className="text-terminal-gray">{pkg.current}</div>
                  <div className="text-terminal-green-dim">{pkg.latest}</div>
                  <div>
                    <span className={`px-2 py-0.5 rounded text-xs border ${
                      pkg.updateType === 'major' ? 'badge-high' :
                      pkg.updateType === 'minor' ? 'badge-medium' :
                      'badge-low'
                    }`}>
                      {pkg.updateType?.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Licenses tab */}
      {activeTab === 'licenses' && (
        <div className="ascii-box" data-label="LICENSE AUDIT">
          {!scan.licenses?.length ? (
            <div className="p-12 text-center text-terminal-gray text-xs">LICENSE DATA NOT AVAILABLE FOR THIS ECOSYSTEM</div>
          ) : (
            <div>
              <div className="p-4 border-b border-terminal-border flex flex-wrap gap-3">
                {[...new Set(scan.licenses.map(l => l.license))].map(lic => (
                  <span key={lic} className={`px-2 py-1 text-xs border ${
                    ['GPL', 'AGPL'].some(g => lic?.includes(g))
                      ? 'badge-medium'
                      : lic === 'Unknown' ? 'badge-unknown'
                      : 'badge-low'
                  }`}>{lic} ({scan.licenses.filter(l => l.license === lic).length})</span>
                ))}
              </div>
              <div className="divide-y divide-terminal-border max-h-96 overflow-y-auto">
                {scan.licenses.map((lic, i) => (
                  <div key={i} className="flex justify-between items-center px-5 py-2 text-xs hover:bg-terminal-green-faint">
                    <span className="text-terminal-green">{lic.name}</span>
                    <span className={lic.license === 'Unknown' ? 'text-terminal-gray' : 'text-terminal-amber'}>{lic.license}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
