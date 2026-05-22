import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const MANIFEST_FILES = [
  'package.json', 'requirements.txt', 'Pipfile', 'pyproject.toml',
  'pom.xml', 'build.gradle', 'Gemfile', 'go.mod', 'composer.json', 'Cargo.toml'
];

const SCAN_STEPS = [
  'Receiving manifest data...',
  'Detecting ecosystem...',
  'Parsing dependency tree...',
  'Querying OSV vulnerability database...',
  'Checking package registries for updates...',
  'Fetching license information...',
  'Calculating health score...',
  'Generating report...',
];

export default function NewScan() {
  const [mode, setMode] = useState('paste');
  const [content, setContent] = useState('');
  const [filename, setFilename] = useState('package.json');
  const [githubRepo, setGithubRepo] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const runScan = async () => {
    setError('');
    setScanning(true);
    setScanStep(0);

    const interval = setInterval(() => {
      setScanStep(s => s < SCAN_STEPS.length - 1 ? s + 1 : s);
    }, 600);

    try {
      const payload = mode === 'github'
        ? { githubRepo }
        : { content, filename };

      const r = await api.post('/scan', payload);
      clearInterval(interval);
      navigate(`/scan/${r.data.scan._id}`);
    } catch (err) {
      clearInterval(interval);
      setError(err.response?.data?.message || 'Scan failed. Check your input.');
      setScanning(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setContent(ev.target.result);
    reader.readAsText(file);
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <div className="text-terminal-green glow text-lg font-bold tracking-widest mb-1">
          INITIALIZE SCAN
        </div>
        <div className="text-terminal-gray text-xs">Select input method and provide manifest data</div>
      </div>

      <div className="mb-8">
        <div className="text-terminal-gray text-xs uppercase tracking-widest mb-2 px-1">Input Method</div>
        <div className="flex gap-0 border border-terminal-border overflow-hidden">
          <button
            onClick={() => setMode('paste')}
            className={`flex-1 py-3 text-xs tracking-widest uppercase transition-all ${
              mode === 'paste' ? 'bg-terminal-green-faint text-terminal-green border-r border-terminal-border' : 'text-terminal-gray hover:text-terminal-green border-r border-terminal-border'
            }`}
          >
            {mode === 'paste' ? '▸ ' : ''}PASTE MANIFEST
          </button>
          <button
            onClick={() => setMode('github')}
            className={`flex-1 py-3 text-xs tracking-widest uppercase transition-all ${
              mode === 'github' ? 'bg-terminal-green-faint text-terminal-green' : 'text-terminal-gray hover:text-terminal-green'
            }`}
          >
            {mode === 'github' ? '▸ ' : ''}GITHUB REPO
          </button>
        </div>
      </div>

      {!scanning ? (
        <>
          {mode === 'paste' ? (
            <div className="space-y-5">
              <div className="ascii-box p-4" data-label="MANIFEST FILE">
                <div className="flex flex-wrap gap-2">
                  {MANIFEST_FILES.map(f => (
                    <button
                      key={f}
                      onClick={() => setFilename(f)}
                      className={`px-3 py-1 text-xs border transition-all ${
                        filename === f
                          ? 'border-terminal-green text-terminal-green bg-terminal-green-faint'
                          : 'border-terminal-border text-terminal-gray hover:border-terminal-green-dim hover:text-terminal-green-dim'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-terminal-gray text-xs">or upload:</span>
                  <input type="file" onChange={handleFileUpload} className="text-xs text-terminal-gray" accept=".json,.txt,.toml,.xml,.gradle,.mod,.lock" />
                </div>
              </div>

              <div className="ascii-box" data-label={`PASTE ${filename.toUpperCase()} CONTENT`}>
                <div className="p-2 border-b border-terminal-border text-terminal-gray text-xs flex items-center gap-2">
                  <span className="text-terminal-green">$</span>
                  <span>cat ./{filename}</span>
                </div>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  className="w-full p-4 bg-transparent text-xs leading-relaxed h-64 resize-none font-mono"
                  placeholder={`Paste your ${filename} content here...`}
                  spellCheck={false}
                />
                <div className="px-4 py-2 border-t border-terminal-border text-terminal-gray text-xs">
                  {content.length > 0 ? `${content.split('\n').length} lines · ${content.length} chars` : 'AWAITING INPUT'}
                </div>
              </div>
            </div>
          ) : (
            <div className="ascii-box p-6" data-label="GITHUB REPOSITORY">
              <label className="text-terminal-green-dim text-xs block mb-3 uppercase tracking-widest">Repository (owner/repo)</label>
              <div className="flex items-center gap-2">
                <span className="text-terminal-green text-xs">github.com/</span>
                <input
                  type="text"
                  value={githubRepo}
                  onChange={e => setGithubRepo(e.target.value)}
                  className="flex-1 bg-transparent px-3 py-2 text-sm"
                  placeholder="torvalds/linux"
                />
              </div>
              <p className="text-terminal-gray text-xs mt-4">
                ▸ Public repos only. We'll auto-detect the manifest file anywhere in the repo.
              </p>
            </div>
          )}

          {error && (
            <div className="term-border-red p-4 mt-4 text-terminal-red text-xs">
              ERROR: {error}
            </div>
          )}

          <button
            onClick={runScan}
            disabled={mode === 'paste' ? !content.trim() : !githubRepo.trim()}
            className="btn-terminal w-full py-4 text-sm mt-6 disabled:opacity-30 glow-sm"
          >
            EXECUTE SCAN →
          </button>
        </>
      ) : (
        <div className="ascii-box p-8" data-label="SCAN IN PROGRESS">
          <div className="space-y-2">
            {SCAN_STEPS.map((step, i) => (
              <div key={i} className={`flex items-center gap-3 text-xs transition-all duration-300 ${
                i < scanStep ? 'text-terminal-gray' :
                i === scanStep ? 'text-terminal-green glow-sm' :
                'text-terminal-border'
              }`}>
                <span className="w-4">
                  {i < scanStep ? '✓' : i === scanStep ? '▸' : '·'}
                </span>
                <span>{step}</span>
                {i === scanStep && <span className="cursor"></span>}
              </div>
            ))}
          </div>
          <div className="mt-6 text-terminal-gray text-xs">
            This may take up to 30 seconds for large manifests...
          </div>
        </div>
      )}
    </div>
  );
}