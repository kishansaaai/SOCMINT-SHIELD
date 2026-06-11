import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    badgeId: '',
    rank: 'SI',
    department: 'Cyber Crime',
    username: '',
    password: '',
    confirmPassword: ''
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: formData.fullName,
          badge_id: formData.badgeId,
          rank: formData.rank,
          department: formData.department,
          username: formData.username,
          password: formData.password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Registration failed');
      }
      
      navigate('/login');
    } catch (err: any) {
      setError(err.message || 'Network error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden font-mono text-cyan-400 py-12">
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] z-0"></div>
      
      <div className="z-10 bg-slate-900/80 p-8 border border-cyan-500/30 rounded-xl shadow-[0_0_20px_rgba(0,255,255,0.1)] backdrop-blur-sm max-w-2xl w-full mx-4">
        <div className="text-center mb-8">
          <h1 className="text-xl font-bold tracking-widest text-cyan-300">
            OFFICER REGISTRATION
          </h1>
          <h2 className="text-sm tracking-widest text-slate-400 mt-2">
            SOCMINT SHIELD SECURE ENCLAVE
          </h2>
        </div>

        <form onSubmit={handleRegister} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs uppercase tracking-wider mb-2 text-orange-400/80 font-bold">Full Name</label>
              <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required
                className="w-full bg-slate-900 border border-slate-700 p-3 text-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 rounded transition-colors placeholder-slate-600 shadow-inner" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider mb-2 text-orange-400/80 font-bold">Badge ID</label>
              <input type="text" name="badgeId" value={formData.badgeId} onChange={handleChange} required
                className="w-full bg-slate-900 border border-slate-700 p-3 text-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 rounded transition-colors placeholder-slate-600 shadow-inner" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider mb-2 text-orange-400/80 font-bold">Rank</label>
              <select name="rank" value={formData.rank} onChange={handleChange}
                className="w-full bg-slate-900 border border-slate-700 p-3 text-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 rounded transition-colors shadow-inner">
                <option value="SI">Sub-Inspector (SI)</option>
                <option value="PI">Police Inspector (PI)</option>
                <option value="CI">Circle Inspector (CI)</option>
                <option value="DSP">Deputy SP (DSP)</option>
                <option value="SP">Superintendent of Police (SP)</option>
                <option value="DCP">Deputy CP (DCP)</option>
                <option value="IPS">IPS Officer</option>
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider mb-2 text-orange-400/80 font-bold">Department/Station</label>
              <input type="text" name="department" value={formData.department} onChange={handleChange} required
                className="w-full bg-slate-900 border border-slate-700 p-3 text-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 rounded transition-colors placeholder-slate-600 shadow-inner" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider mb-2 text-orange-400/80 font-bold">System Username</label>
              <input type="text" name="username" value={formData.username} onChange={handleChange} required
                className="w-full bg-slate-900 border border-slate-700 p-3 text-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 rounded transition-colors placeholder-slate-600 shadow-inner" />
            </div>
            <div className="hidden md:block"></div>
            <div>
              <label className="block text-xs uppercase tracking-wider mb-2 text-orange-400/80 font-bold">Password</label>
              <input type="password" name="password" value={formData.password} onChange={handleChange} required minLength={8}
                className="w-full bg-slate-900 border border-slate-700 p-3 text-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 rounded transition-colors placeholder-slate-600 shadow-inner" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider mb-2 text-orange-400/80 font-bold">Confirm Password</label>
              <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required minLength={8}
                className="w-full bg-slate-900 border border-slate-700 p-3 text-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 rounded transition-colors placeholder-slate-600 shadow-inner" />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-900/30 border border-red-500/50 text-red-400 text-sm rounded">
              ⚠️ {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-4 bg-orange-600/90 border border-orange-500 text-white py-3 rounded uppercase tracking-widest font-bold hover:bg-orange-500 hover:shadow-[0_0_15px_rgba(249,115,22,0.4)] transition-all disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'CREATE OFFICER ACCOUNT'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-xs text-slate-400 hover:text-orange-400 transition-colors">
            ← Return to Authentication
          </Link>
        </div>
      </div>
    </div>
  );
}
