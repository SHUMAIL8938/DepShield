import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SignInButton, SignUpButton, SignedIn, SignedOut } from '@clerk/clerk-react';
import api from '../utils/api';

const BOOT_LINES = [
  'DEPSHIELD v1.0.0 — DEPENDENCY VULNERABILITY SCANNER',
  'Copyright (c) 2025 DepShield. All rights reserved.',
  '─────────────────────────────────────────────────────',
  'Initializing vulnerability database connection...',
  'Connected to OSV.dev [ OK ]',
  'Loading package registry interfaces...',
  'npm    → registry.npmjs.org   [ OK ]',
  'PyPI   → pypi.org             [ OK ]',
  'Maven  → search.maven.org     [ OK ]',
  'Go     → proxy.golang.org     [ OK ]',
  '─────────────────────────────────────────────────────',
  'System ready. Awaiting input.',
];

const SEVERITY_COLORS = {
  CRITICAL: 'text-red-500',
  HIGH: 'text-orange-400',
  MEDIUM: 'text-yellow-400',
  LOW: 'text-terminal-green-dim',
  UNKNOWN: 'text-terminal-gray'
};

export default function Landing() {
  const [bootIndex, setBootIndex] = useState(0);
  const [feed, setFeed] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);

  useEffect(() => {
    if (bootIndex < BOOT_LINES.length) {
      const t = setTimeout(() => setBootIndex(i => i + 1), 80);
      return () => clearTimeout(t);
    }
  }, [bootIndex]);

  useEffect(() => {
    api.get('/feed').then(r => setFeed(r.data.feed || [])).finally(() => setFeedLoading(false));
  }, []);

  const timeSince = (date) => {
    const s = Math.floor((Date.now() - new Date(date)) / 1000);
    if (s < 3600) return `${Math.floor(s/60)}m ago`;
    if (s < 86400) return `${Math.floor(s/3600)}h ago`;
    return `${Math.floor(s/86400)}d ago`;
  };

  return (
    <div className="min-h-screen bg-terminal-bg font-mono">
      {/* Header */}
      <div className="border-b border-terminal-border bg-terminal-surface px-6 py-3 flex items-center justify-between">
        <span className="text-terminal-green glow font-bold text-sm tracking-widest">[DEPSHIELD]</span>
        <div className="flex items-center gap-4">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="btn-terminal px-4 py-2 text-xs">LOGIN</button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="btn-terminal px-4 py-2 text-xs bg-terminal-green-faint">REGISTER →</button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <Link to="/dashboard" className="btn-terminal px-4 py-2 text-xs bg-terminal-green-faint">DASHBOARD →</Link>
          </SignedIn>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left: Boot terminal */}
        <div>
          <div className="ascii-box p-6 mb-8" data-label="SYSTEM BOOT">
            <div className="space-y-1">
              {BOOT_LINES.slice(0, bootIndex).map((line, i) => (
                <div key={i} className={`text-xs leading-relaxed ${
                  line.includes('[ OK ]') ? 'text-terminal-green' :
                  line.startsWith('─') ? 'text-terminal-border' :
                  line.includes('Initializing') || line.includes('Loading') ? 'text-terminal-amber' :
                  'text-terminal-gray'
                }`}>
                  {line}
                </div>
              ))}
              {bootIndex < BOOT_LINES.length && (
                <div className="text-terminal-green text-xs">
                  <span className="cursor">_</span>
                </div>
              )}
            </div>
          </div>

          <div className="mb-8">
            <div className="text-terminal-green glow text-3xl font-bold mb-2 leading-tight">
              SCAN YOUR DEPS.<br />
              <span className="text-terminal-red glow-red">EXPOSE THE THREATS.</span>
            </div>
            <p className="text-terminal-gray text-sm leading-relaxed mt-4">
              Multi-ecosystem vulnerability scanner. Paste your manifest or point at a GitHub repo.<br />
              Real-time results. No API keys. No bullshit.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-8 text-xs">
            {['npm / package.json', 'Python / requirements.txt', 'Java / pom.xml', 'Go / go.mod', 'Ruby / Gemfile', 'Rust / Cargo.toml'].map(item => (
              <div key={item} className="flex items-center gap-2 text-terminal-gray">
                <span className="text-terminal-green">▸</span> {item}
              </div>
            ))}
          </div>

          <div className="flex gap-4">
            <SignedOut>
              <SignUpButton mode="modal">
                <button className="btn-terminal px-6 py-3 text-sm glow-sm">START SCANNING →</button>
              </SignUpButton>
              <SignInButton mode="modal">
                <button className="btn-terminal px-6 py-3 text-sm text-terminal-gray border-terminal-border">SIGN IN</button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link to="/dashboard" className="btn-terminal px-6 py-3 text-sm glow-sm">GO TO DASHBOARD →</Link>
            </SignedIn>
          </div>
        </div>

        {/* Right: Live threat feed */}
        <div>
          <div className="ascii-box" data-label="LIVE THREAT INTELLIGENCE FEED">
            <div className="p-4 border-b border-terminal-border flex items-center justify-between">
              <span className="text-xs text-terminal-gray tracking-widest uppercase">Recently Compromised Packages</span>
              <span className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 bg-terminal-red rounded-full animate-pulse inline-block"></span>
                <span className="text-terminal-red">LIVE</span>
              </span>
            </div>
            <div className="divide-y divide-terminal-border max-h-96 overflow-y-auto">
              {feedLoading ? (
                <div className="p-6 text-center text-terminal-gray text-xs">
                  FETCHING THREAT DATA<span className="cursor">_</span>
                </div>
              ) : feed.length === 0 ? (
                <div className="p-6 text-center text-terminal-gray text-xs">NO FEED DATA AVAILABLE</div>
              ) : feed.map((item, i) => (
                <div key={i} className="p-4 hover:bg-terminal-green-faint transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <span className="text-terminal-green text-xs font-bold truncate">{item.packageName}</span>
                    <span className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${
                      item.severity === 'CRITICAL' ? 'badge-critical' :
                      item.severity === 'HIGH' ? 'badge-high' :
                      item.severity === 'MEDIUM' ? 'badge-medium' :
                      'badge-low'
                    }`}>{item.severity}</span>
                  </div>
                  <div className="text-terminal-gray text-xs mb-1 line-clamp-2">{item.summary}</div>
                  <div className="flex items-center gap-3 text-xs text-terminal-gray">
                    <span className="text-terminal-amber">{item.ecosystem}</span>
                    {item.cveId && <span className="text-terminal-gray">{item.cveId}</span>}
                    <span>{timeSince(item.publishedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { label: 'ECOSYSTEMS', value: '7+' },
              { label: 'VULN DB', value: 'OSV.DEV' },
              { label: 'SCAN TIME', value: '<10s' },
            ].map(stat => (
              <div key={stat.label} className="ascii-box p-3 text-center" data-label={stat.label}>
                <div className="text-terminal-green glow-sm text-lg font-bold mt-1">{stat.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-terminal-border mt-12 px-6 py-4 text-center text-terminal-gray text-xs">
        DEPSHIELD — Powered by OSV.dev · Built with Node.js + React · Deploy your own
      </div>
    </div>
  );
}
