import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [form, setForm] = useState({ email: '', password: '', username: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      await register(form.email, form.password, form.username);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="min-h-screen bg-terminal-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="ascii-box p-8" data-label="CREATE ACCOUNT">
          <div className="text-terminal-green glow text-xl font-bold mb-1 tracking-widest">[DEPSHIELD]</div>
          <div className="text-terminal-gray text-xs mb-8">Initialize new user profile</div>

          {error && (
            <div className="term-border-red p-3 mb-6 text-terminal-red text-xs">ERROR: {error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {[
              { key: 'username', label: 'Username', type: 'text', placeholder: 'h4ck3r' },
              { key: 'email', label: 'Email', type: 'email', placeholder: 'user@example.com' },
              { key: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
            ].map(({ key, label, type, placeholder }) => (
              <div key={key}>
                <label className="text-terminal-green-dim text-xs block mb-2 uppercase tracking-widest">{label}</label>
                <div className="flex items-center gap-2">
                  <span className="text-terminal-green text-xs">$</span>
                  <input
                    type={type}
                    value={form[key]}
                    onChange={set(key)}
                    className="flex-1 bg-transparent px-3 py-2 text-sm"
                    placeholder={placeholder}
                    required
                  />
                </div>
              </div>
            ))}
            <button
              type="submit"
              disabled={loading}
              className="btn-terminal w-full py-3 text-sm mt-4 disabled:opacity-50"
            >
              {loading ? 'INITIALIZING...' : '> CREATE ACCOUNT'}
            </button>
          </form>

          <div className="mt-6 text-center text-terminal-gray text-xs">
            Already registered?{' '}
            <Link to="/login" className="text-terminal-green hover:glow-sm">LOGIN →</Link>
          </div>
        </div>
        <div className="text-center mt-4">
          <Link to="/" className="text-terminal-gray text-xs hover:text-terminal-green">← BACK TO HOME</Link>
        </div>
      </div>
    </div>
  );
}
