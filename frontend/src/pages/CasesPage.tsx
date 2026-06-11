import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getHeaders, API_BASE } from '../config';

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-500/20 text-red-400 border-red-500/30',
  HIGH: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  MEDIUM: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  LOW: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-green-500/20 text-green-400 border-green-500/30',
  CLOSED: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

export default function CasesPage() {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    subject_username: '',
    subject_email: '',
    subject_phone: '',
    subject_real_name: '',
    priority: 'MEDIUM'
  });

  const fetchCases = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/cases`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch cases');
      const data = await res.json();
      setCases(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const handleDelete = async (caseId: string) => {
    if (!window.confirm(`Are you sure you want to delete case ${caseId}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/cases/${encodeURIComponent(caseId)}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (!res.ok) throw new Error('Delete failed');
      fetchCases();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateNotes = async (caseId: string, notes: string) => {
    try {
      await fetch(`${API_BASE}/api/cases/${encodeURIComponent(caseId)}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ notes })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/cases`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Failed to create case');
      const newCase = await res.json();
      setShowNewModal(false);
      
      // Store in localStorage to trigger search in App
      localStorage.setItem('socmint_pending_search', JSON.stringify({
        ...formData,
        case_id: newCase.case_id
      }));
      navigate('/app');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleLoadInvestigation = async (caseId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/cases/${encodeURIComponent(caseId)}`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch case data');
      const caseData = await res.json();
      if (caseData.profile_data) {
        localStorage.setItem('socmint_load_profile', JSON.stringify(caseData.profile_data));
        localStorage.setItem('socmint_active_case_id', caseData.case_id);
        navigate('/app');
      } else {
        alert('No profile data saved in this case yet.');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-cyan-400 font-mono flex">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 border-r border-cyan-900 flex flex-col p-4">
        <div className="text-xl font-bold tracking-widest text-cyan-300 mb-8">🛡️ SHIELD</div>
        <nav className="flex flex-col gap-4">
          <Link to="/app" className="p-3 bg-slate-950 border border-slate-800 hover:border-cyan-500 text-sm tracking-wider rounded">🔍 NEW SEARCH</Link>
          <Link to="/cases" className="p-3 bg-cyan-900/30 border border-cyan-500 text-sm tracking-wider rounded font-bold">📁 CASES</Link>
          <div className="p-3 bg-slate-950 border border-slate-800 text-slate-500 text-sm tracking-wider rounded cursor-not-allowed">📊 DASHBOARD</div>
          <div className="p-3 bg-slate-950 border border-slate-800 text-slate-500 text-sm tracking-wider rounded cursor-not-allowed">📄 REPORTS</div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="flex justify-between items-center mb-8 pb-4 border-b border-cyan-900/50">
          <h1 className="text-2xl font-bold tracking-widest text-cyan-300">📁 CASE MANAGEMENT</h1>
          <button 
            onClick={() => setShowNewModal(true)}
            className="px-6 py-2 bg-cyan-600/20 border border-cyan-400 text-cyan-300 font-bold hover:bg-cyan-500/30 rounded"
          >
            + NEW CASE
          </button>
        </div>

        {loading ? (
          <div className="text-cyan-600 animate-pulse">Loading cases...</div>
        ) : error ? (
          <div className="text-red-400">⚠️ {error}</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {cases.map(c => (
              <div key={c.case_id} className="bg-slate-900/80 border border-cyan-900 rounded-lg p-5 flex flex-col shadow-lg">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-sm font-bold text-cyan-400 tracking-wider mb-1">{c.case_id}</div>
                    <div className="text-lg text-white font-sans">{c.title || c.subject_real_name || c.subject_username || 'Unnamed Investigation'}</div>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <span className={`px-2 py-1 text-[10px] uppercase font-bold tracking-widest rounded border ${STATUS_COLORS[c.status] || STATUS_COLORS.OPEN}`}>
                      {c.status}
                    </span>
                    <span className={`px-2 py-1 text-[10px] uppercase font-bold tracking-widest rounded border ${PRIORITY_COLORS[c.priority] || PRIORITY_COLORS.MEDIUM}`}>
                      {c.priority}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-400 mb-4 grid grid-cols-2 gap-2">
                  <div><span className="text-slate-600">Officer:</span> {c.created_by}</div>
                  <div><span className="text-slate-600">Created:</span> {new Date(c.created_at).toLocaleDateString()}</div>
                </div>

                <div className="flex-1">
                  <label className="text-[10px] uppercase tracking-widest text-cyan-700 mb-1 block">Officer Notes</label>
                  <textarea 
                    className="w-full h-24 bg-slate-950 border border-slate-800 rounded p-2 text-xs text-cyan-300 focus:border-cyan-500 focus:outline-none resize-none"
                    defaultValue={c.notes}
                    onBlur={(e) => handleUpdateNotes(c.case_id, e.target.value)}
                    placeholder="Add investigation notes..."
                  />
                </div>

                <div className="flex gap-3 mt-4 pt-4 border-t border-slate-800">
                  <button 
                    onClick={() => handleLoadInvestigation(c.case_id)}
                    className="flex-1 py-2 bg-cyan-950 border border-cyan-700 text-cyan-400 text-xs font-bold tracking-widest hover:bg-cyan-900 hover:border-cyan-400 rounded transition-colors"
                  >
                    LOAD INVESTIGATION
                  </button>
                  <button 
                    onClick={() => handleDelete(c.case_id)}
                    className="px-4 py-2 bg-red-950 border border-red-900 text-red-500 text-xs font-bold hover:bg-red-900 hover:text-red-300 rounded transition-colors"
                  >
                    DELETE
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Case Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-cyan-500 shadow-[0_0_30px_rgba(0,255,255,0.1)] p-8 rounded-lg w-full max-w-2xl">
            <h2 className="text-xl font-bold tracking-widest text-cyan-300 mb-6 border-b border-cyan-900 pb-4">CREATE NEW CASE</h2>
            <form onSubmit={handleCreateCase} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider mb-1 text-cyan-600">Case Title</label>
                <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required className="w-full bg-slate-950 border border-slate-700 p-2 text-cyan-300 focus:border-cyan-400 focus:outline-none rounded" placeholder="Operation Name or Title" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider mb-1 text-cyan-600">Subject Username</label>
                  <input type="text" value={formData.subject_username} onChange={e => setFormData({...formData, subject_username: e.target.value})} className="w-full bg-slate-950 border border-slate-700 p-2 text-cyan-300 focus:border-cyan-400 focus:outline-none rounded" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider mb-1 text-cyan-600">Subject Real Name</label>
                  <input type="text" value={formData.subject_real_name} onChange={e => setFormData({...formData, subject_real_name: e.target.value})} className="w-full bg-slate-950 border border-slate-700 p-2 text-cyan-300 focus:border-cyan-400 focus:outline-none rounded" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider mb-1 text-cyan-600">Subject Email</label>
                  <input type="email" value={formData.subject_email} onChange={e => setFormData({...formData, subject_email: e.target.value})} className="w-full bg-slate-950 border border-slate-700 p-2 text-cyan-300 focus:border-cyan-400 focus:outline-none rounded" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider mb-1 text-cyan-600">Subject Phone</label>
                  <input type="text" value={formData.subject_phone} onChange={e => setFormData({...formData, subject_phone: e.target.value})} className="w-full bg-slate-950 border border-slate-700 p-2 text-cyan-300 focus:border-cyan-400 focus:outline-none rounded" />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider mb-1 text-cyan-600">Priority</label>
                  <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} className="w-full bg-slate-950 border border-slate-700 p-2 text-cyan-300 focus:border-cyan-400 focus:outline-none rounded">
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-4 mt-8 pt-6 border-t border-cyan-900/50">
                <button type="button" onClick={() => setShowNewModal(false)} className="px-6 py-2 border border-slate-600 text-slate-400 hover:text-white rounded">CANCEL</button>
                <button type="submit" className="flex-1 bg-cyan-600/30 border border-cyan-400 text-cyan-300 font-bold tracking-widest hover:bg-cyan-500/40 rounded">CREATE & SEARCH</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
