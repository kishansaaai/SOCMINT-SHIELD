import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        throw new Error('Authentication failed. Check credentials.');
      }

      const data = await response.json();
      localStorage.setItem('socmint_token', data.access_token);
      localStorage.setItem('socmint_officer', JSON.stringify(data.officer));
      
      navigate('/app');
    } catch (err: any) {
      setError(err.message || 'Network error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden font-mono text-cyan-400">
      {/* Scanline background */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] z-0"></div>
      
      <div className="z-10 bg-slate-900/80 p-8 border border-cyan-500/30 rounded-xl shadow-[0_0_20px_rgba(0,255,255,0.1)] backdrop-blur-sm max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-xl font-bold tracking-widest text-cyan-300">
            🛡️ KARNATAKA CID
          </h1>
          <h2 className="text-sm tracking-widest text-slate-400 mt-2">
            SOCMINT SHIELD v4.0
          </h2>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-xs uppercase tracking-wider mb-2 text-orange-400/80 font-bold">Officer ID</label>
            <input 
              type="text" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 p-3 text-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 rounded transition-colors placeholder-slate-600 shadow-inner"
              placeholder="Username"
              required
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider mb-2 text-orange-400/80 font-bold">Passcode</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 p-3 text-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 rounded transition-colors placeholder-slate-600 shadow-inner"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-900/30 border border-red-500/50 text-red-400 text-sm rounded">
              ⚠️ {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-orange-600/90 border border-orange-500 text-white py-3 rounded uppercase tracking-widest font-bold hover:bg-orange-500 hover:shadow-[0_0_15px_rgba(249,115,22,0.4)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <span className="animate-spin text-xl">⟳</span> : null}
            {loading ? 'Authenticating...' : 'Authenticate'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/register" className="text-xs text-slate-400 hover:text-orange-400 transition-colors">
            Register new officer →
          </Link>
        </div>
      </div>
    </div>
  );
}
