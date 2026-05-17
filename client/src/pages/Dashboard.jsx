import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useUser } from '@clerk/clerk-react';
import api from '../utils/api';

const gradeClass = (g) => ({ A: 'grade-a', B: 'grade-b', C: 'grade-c', D: 'grade-d', F: 'grade-f' }[g] || '');

const SeverityBar = ({ vulns = [] }) => {
  const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  vulns.forEach(v => counts[v.severity] && counts[v.severity]++);
  return (
    <div className="flex gap-2 text-xs">
      {counts.CRITICAL > 0 && <span className="badge-critical px-2 py-0.5 rounded">{counts.CRITICAL} CRIT</span>}
      {counts.HIGH > 0 && <span className="badge-high px-2 py-0.5 rounded">{counts.HIGH} HIGH</span>}
      {counts.MEDIUM > 0 && <span className="badge-medium px-2 py-0.5 rounded">{counts.MEDIUM} MED</span>}
      {counts.LOW > 0 && <span className="badge-low px-2 py-0.5 rounded">{counts.LOW} LOW</span>}
      {!Object.values(counts).some(Boolean) && <span className="text-terminal-green text-xs">✓ CLEAN</span>}
    </div>
  );
};

export default function Dashboard() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/scan?limit=20')
      .then(r => setScans(r.data.scans || []))
      .finally(() => setLoading(false));
  }, []);

  const chartData = [...scans].reverse().slice(-10).map((s, i) => ({
    name: `#${i + 1}`,
    score: s.healthScore,
    date: new Date(s.createdAt).toLocaleDateString()
  }));

  const totalVulns = scans.reduce((acc, s) => acc + (s.vulnerabilities?.length || 0), 0);
  const avgScore = scans.length ? Math.round(scans.reduce((a, s) => a + s.healthScore, 0) / scans.length) : 0;
  const criticals = scans.reduce((acc, s) => acc + (s.vulnerabilities?.filter(v => v.severity === 'CRITICAL').length || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="text-terminal-green glow text-lg font-bold tracking-widest">
            WELCOME BACK, {(user?.username || user?.firstName || 'USER')?.toUpperCase()}
          </div>
          <div className="text-terminal-gray text-xs mt-1">Security overview — last {scans.length} scans</div>
        </div>
        <button
          onClick={() => navigate('/scan/new')}
          className="btn-terminal px-6 py-3 text-sm glow-sm"
        >
          + NEW SCAN
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'TOTAL SCANS', value: scans.length, color: 'text-terminal-green' },
          { label: 'AVG HEALTH', value: `${avgScore}%`, color: avgScore >= 75 ? 'text-terminal-green' : avgScore >= 50 ? 'text-terminal-amber' : 'text-terminal-red' },
          { label: 'TOTAL VULNS', value: totalVulns, color: totalVulns > 0 ? 'text-terminal-red' : 'text-terminal-green' },
          { label: 'CRITICALS', value: criticals, color: criticals > 0 ? 'text-terminal-red glow-red' : 'text-terminal-green' },
        ].map(stat => (
          <div key={stat.label} className="ascii-box p-4" data-label={stat.label}>
            <div className={`text-2xl font-bold mt-2 ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Health score trend */}
      {chartData.length > 1 && (
        <div className="ascii-box p-6 mb-8" data-label="HEALTH SCORE TREND">
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={chartData}>
              <XAxis dataKey="name" stroke="#1a2e1a" tick={{ fill: '#666', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
              <YAxis domain={[0, 100]} stroke="#1a2e1a" tick={{ fill: '#666', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
              <Tooltip
                contentStyle={{ background: '#111', border: '1px solid #1a2e1a', fontFamily: 'JetBrains Mono', fontSize: 11 }}
                labelStyle={{ color: '#00ff41' }}
                itemStyle={{ color: '#00cc33' }}
              />
              <Line type="monotone" dataKey="score" stroke="#00ff41" strokeWidth={1.5} dot={{ fill: '#00ff41', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Scan history */}
      <div className="ascii-box" data-label="SCAN HISTORY">
        {loading ? (
          <div className="p-8 text-center text-terminal-gray text-xs">LOADING SCAN DATA<span className="cursor">_</span></div>
        ) : scans.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-terminal-gray text-xs mb-4">NO SCANS FOUND</div>
            <Link to="/scan/new" className="btn-terminal px-6 py-3 text-xs">RUN FIRST SCAN →</Link>
          </div>
        ) : (
          <div className="divide-y divide-terminal-border">
            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-terminal-gray text-xs uppercase tracking-widest border-b border-terminal-border">
              <div className="col-span-3">PROJECT</div>
              <div className="col-span-2">ECOSYSTEM</div>
              <div className="col-span-1 text-center">GRADE</div>
              <div className="col-span-2 text-center">SCORE</div>
              <div className="col-span-3">VULNERABILITIES</div>
              <div className="col-span-1 text-right">DATE</div>
            </div>
            {scans.map(scan => (
              <Link
                key={scan._id}
                to={`/scan/${scan._id}`}
                className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-terminal-green-faint transition-colors cursor-pointer"
              >
                <div className="col-span-3 text-terminal-green text-xs truncate">
                  {scan.githubRepo || scan.manifestFile}
                </div>
                <div className="col-span-2 text-terminal-amber text-xs">{scan.ecosystem}</div>
                <div className={`col-span-1 text-center font-bold text-lg ${gradeClass(scan.grade)}`}>{scan.grade}</div>
                <div className="col-span-2 text-center">
                  <div className="text-xs text-terminal-gray mb-1">{scan.healthScore}/100</div>
                  <div className="health-bar w-full rounded">
                    <div
                      className="health-fill rounded"
                      style={{
                        width: `${scan.healthScore}%`,
                        background: scan.healthScore >= 75 ? '#00ff41' : scan.healthScore >= 50 ? '#ffb000' : '#ff3333'
                      }}
                    />
                  </div>
                </div>
                <div className="col-span-3">
                  <SeverityBar vulns={scan.vulnerabilities} />
                </div>
                <div className="col-span-1 text-right text-terminal-gray text-xs">
                  {new Date(scan.createdAt).toLocaleDateString()}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
