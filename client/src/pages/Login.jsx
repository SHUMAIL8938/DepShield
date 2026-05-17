import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-terminal-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="ascii-box p-8" data-label="AUTHENTICATE">
          <div className="text-terminal-green glow text-xl font-bold mb-1 tracking-widest">[DEPSHIELD]</div>
          <div className="text-terminal-gray text-xs mb-8">Enter credentials to access system</div>

          {error && (
            <div className="term-border-red p-3 mb-6 text-terminal-red text-xs">
              ERROR: {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-terminal-green-dim text-xs block mb-2 uppercase tracking-widest">Email</label>
              <div className="flex items-center gap-2">
                <span className="text-terminal-green text-xs">$</span>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="flex-1 bg-transparent px-3 py-2 text-sm"
                  placeholder="user@example.com"
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-terminal-green-dim text-xs block mb-2 uppercase tracking-widest">Password</label>
              <div className="flex items-center gap-2">
                <span className="text-terminal-green text-xs">$</span>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="flex-1 bg-transparent px-3 py-2 text-sm"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-terminal w-full py-3 text-sm mt-4 disabled:opacity-50"
            >
              {loading ? 'AUTHENTICATING...' : '> LOGIN'}
            </button>
          </form>

          <div className="mt-6 text-center text-terminal-gray text-xs">
            No account?{' '}
            <Link to="/register" className="text-terminal-green hover:glow-sm">
              REGISTER →
            </Link>
          </div>
        </div>
        <div className="text-center mt-4">
          <Link to="/" className="text-terminal-gray text-xs hover:text-terminal-green">← BACK TO HOME</Link>
        </div>
      </div>
    </div>
  );
}
