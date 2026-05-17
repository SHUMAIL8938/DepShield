import { useState, useEffect } from 'react';
import api from '../utils/api';

const MANIFEST_FILES = ['package.json', 'requirements.txt', 'pyproject.toml', 'pom.xml', 'Gemfile', 'go.mod', 'Cargo.toml'];
const ECOSYSTEMS = ['npm', 'PyPI', 'Maven', 'RubyGems', 'Go', 'crates.io'];

export default function Webhooks() {
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ repoFullName: '', manifestFile: 'package.json', ecosystem: 'npm' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/webhook').then(r => setWebhooks(r.data.webhooks || [])).finally(() => setLoading(false));
  }, []);

  const register = async () => {
    setError('');
    setResult(null);
    setSubmitting(true);
    try {
      const r = await api.post('/webhook/register', form);
      setResult(r.data);
      const updated = await api.get('/webhook');
      setWebhooks(updated.data.webhooks || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register webhook.');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteWebhook = async (id) => {
    await api.delete(`/webhook/${id}`);
    setWebhooks(wh => wh.filter(w => w._id !== id));
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <div className="text-terminal-green glow text-lg font-bold tracking-widest mb-1">WEBHOOK CONFIG</div>
        <div className="text-terminal-gray text-xs">Auto-scan on every GitHub push. Zero manual intervention.</div>
      </div>

      {/* How it works */}
      <div className="ascii-box p-5 mb-8" data-label="HOW IT WORKS">
        <div className="space-y-2 text-xs text-terminal-gray">
          <div><span className="text-terminal-green">01.</span> Register your GitHub repo below → get a webhook URL + secret</div>
          <div><span className="text-terminal-green">02.</span> Go to your repo Settings → Webhooks → Add webhook</div>
          <div><span className="text-terminal-green">03.</span> Paste the URL, set content type to <span className="text-terminal-amber">application/json</span>, paste the secret</div>
          <div><span className="text-terminal-green">04.</span> Select event: <span className="text-terminal-amber">Just the push event</span></div>
          <div><span className="text-terminal-green">05.</span> Every push auto-triggers a scan. Results appear in your dashboard.</div>
        </div>
      </div>

      {/* Register form */}
      <div className="ascii-box p-6 mb-8" data-label="REGISTER WEBHOOK">
        <div className="space-y-5">
          <div>
            <label className="text-terminal-green-dim text-xs block mb-2 uppercase tracking-widest">GitHub Repository</label>
            <div className="flex items-center gap-2">
              <span className="text-terminal-green text-xs flex-shrink-0">github.com/</span>
              <input
                type="text"
                value={form.repoFullName}
                onChange={e => setForm(f => ({ ...f, repoFullName: e.target.value }))}
                className="flex-1 bg-transparent px-3 py-2 text-sm"
                placeholder="owner/repository"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-terminal-green-dim text-xs block mb-2 uppercase tracking-widest">Manifest File</label>
              <select
                value={form.manifestFile}
                onChange={e => setForm(f => ({ ...f, manifestFile: e.target.value }))}
                className="w-full px-3 py-2 text-xs"
                style={{ background: '#0a0a0a', border: '1px solid #1a2e1a', color: '#00ff41', fontFamily: 'JetBrains Mono' }}
              >
                {MANIFEST_FILES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="text-terminal-green-dim text-xs block mb-2 uppercase tracking-widest">Ecosystem</label>
              <select
                value={form.ecosystem}
                onChange={e => setForm(f => ({ ...f, ecosystem: e.target.value }))}
                className="w-full px-3 py-2 text-xs"
                style={{ background: '#0a0a0a', border: '1px solid #1a2e1a', color: '#00ff41', fontFamily: 'JetBrains Mono' }}
              >
                {ECOSYSTEMS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>

          {error && <div className="term-border-red p-3 text-terminal-red text-xs">ERROR: {error}</div>}

          <button
            onClick={register}
            disabled={!form.repoFullName.trim() || submitting}
            className="btn-terminal w-full py-3 text-xs disabled:opacity-30"
          >
            {submitting ? 'REGISTERING...' : 'REGISTER WEBHOOK →'}
          </button>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="term-border-green p-5 mb-8" style={{ borderRadius: 0 }}>
          <div className="text-terminal-green text-xs font-bold mb-3 glow-sm">✓ WEBHOOK REGISTERED</div>
          <div className="space-y-3 text-xs">
            <div>
              <div className="text-terminal-gray mb-1 uppercase tracking-widest text-xs">Webhook URL</div>
              <div className="bg-terminal-surface p-2 text-terminal-green font-mono text-xs break-all border border-terminal-border">
                {result.webhookUrl}
              </div>
            </div>
            <div>
              <div className="text-terminal-gray mb-1 uppercase tracking-widest text-xs">Secret (save this — shown once)</div>
              <div className="bg-terminal-surface p-2 text-terminal-amber font-mono text-xs break-all border border-red-900">
                {result.secret}
              </div>
            </div>
            <div className="text-terminal-red text-xs">⚠ Copy and store the secret now. It will not be shown again.</div>
          </div>
        </div>
      )}

      {/* Existing webhooks */}
      <div className="ascii-box" data-label="ACTIVE WEBHOOKS">
        {loading ? (
          <div className="p-8 text-center text-terminal-gray text-xs">LOADING<span className="cursor">_</span></div>
        ) : webhooks.length === 0 ? (
          <div className="p-8 text-center text-terminal-gray text-xs">NO WEBHOOKS REGISTERED</div>
        ) : (
          <div className="divide-y divide-terminal-border">
            {webhooks.map(wh => (
              <div key={wh._id} className="flex items-center justify-between p-4 hover:bg-terminal-green-faint">
                <div>
                  <div className="text-terminal-green text-xs font-bold">{wh.repoFullName}</div>
                  <div className="text-terminal-gray text-xs mt-1">
                    {wh.manifestFile} · {wh.ecosystem}
                    {wh.lastTriggeredAt && ` · Last triggered: ${new Date(wh.lastTriggeredAt).toLocaleDateString()}`}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 border ${wh.active ? 'badge-low' : 'badge-unknown'}`}>
                    {wh.active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                  <button
                    onClick={() => deleteWebhook(wh._id)}
                    className="btn-terminal btn-danger px-3 py-1 text-xs"
                  >
                    DELETE
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
