import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE, getHeaders, getOfficerProfile } from "../config";

const T = {
  navy: "#020c1b",
  navy2: "#0a1628",
  navy3: "#0f1f3d",
  teal: "#00ffff",
  tealDim: "rgba(0, 255, 255, 0.15)",
  text: "#e2e8f0",
  text2: "#94a3b8",
  text3: "#475569",
  red: "#ef4444",
  amber: "#fb923c",
  blue: "#3b82f6",
  green: "#22c55e",
  slate: "#64748b",
  ff: "'IBM Plex Mono', 'Courier New', monospace"
};

export default function CasesPage() {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCaseTitle, setNewCaseTitle] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRealName, setNewRealName] = useState("");
  const [newPriority, setNewPriority] = useState("LOW");
  const [modalLoading, setModalLoading] = useState(false);

  const officerProfile = getOfficerProfile();
  const navigate = useNavigate();

  const fetchCases = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/api/cases`, {
        method: "GET",
        headers: getHeaders()
      });
      if (!response.ok) {
        throw new Error("Failed to fetch cases");
      }
      const data = await response.json();
      setCases(data);
    } catch (err: any) {
      setError(err.message || "Could not retrieve cases from central database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/cases`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          title: newCaseTitle,
          subject_username: newUsername || null,
          subject_email: newEmail || null,
          subject_phone: newPhone || null,
          subject_real_name: newRealName || null,
          priority: newPriority,
          profile_data: null,
          notes: ""
        })
      });
      if (!response.ok) {
        throw new Error("Failed to create case");
      }
      const data = await response.json();
      
      // Close modal and refresh list
      setIsModalOpen(false);
      
      // Clear fields
      setNewCaseTitle("");
      setNewUsername("");
      setNewEmail("");
      setNewPhone("");
      setNewRealName("");
      setNewPriority("LOW");
      
      // Redirect to /app page, setting the search inputs automatically so search triggers
      navigate("/app", {
        state: {
          triggerSearch: true,
          caseId: data.case_id,
          username: newUsername,
          real_name: newRealName,
          phone: newPhone,
          email: newEmail
        }
      });
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteCase = async (caseId: string) => {
    if (!confirm(`Are you sure you want to permanently delete case ${caseId}?`)) {
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/api/cases/${caseId}`, {
        method: "DELETE",
        headers: getHeaders()
      });
      if (!response.ok) {
        throw new Error("Failed to delete case");
      }
      setCases(prev => prev.filter(c => c.case_id !== caseId));
    } catch (err: any) {
      alert("Failed to delete: " + err.message);
    }
  };

  const handleUpdateNotes = async (caseId: string, notes: string) => {
    try {
      await fetch(`${API_BASE}/api/cases/${caseId}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ notes })
      });
      setCases(prev => prev.map(c => c.case_id === caseId ? { ...c, notes } : c));
    } catch (err) {
      console.error("Failed to auto-save notes", err);
    }
  };

  const handleLoadInvestigation = async (caseId: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/cases/${caseId}`, {
        method: "GET",
        headers: getHeaders()
      });
      if (!response.ok) {
        throw new Error("Failed to load case investigation");
      }
      const data = await response.json();
      if (!data.profile_data) {
        alert("This case has no saved profile data. Run a search to populate data first.");
        return;
      }
      
      // Redirect to App with loaded profile data
      navigate("/app", {
        state: {
          loadedProfile: data.profile_data,
          caseId: data.case_id,
          caseTitle: data.title
        }
      });
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  // Stats
  const totalCases = cases.length;
  const openCases = cases.filter(c => c.status === "open").length;
  const highRiskCases = cases.filter(c => c.priority === "HIGH" || c.priority === "CRITICAL").length;

  return (
    <div className="min-h-screen bg-[#020c1b] text-[#e2e8f0] font-mono flex">
      {/* Collapsible Sidebar */}
      <div className={`transition-all duration-300 bg-[#0a1628] border-r border-cyan-950 flex flex-col z-20 ${sidebarOpen ? "w-64" : "w-16"}`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-cyan-950 flex items-center justify-between overflow-hidden">
          {sidebarOpen && (
            <div className="flex items-center space-x-2">
              <span className="text-cyan-400 font-bold tracking-widest text-sm">SOCMINT SHIELD</span>
            </div>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-cyan-400 hover:text-cyan-300 ml-auto p-1">
            {sidebarOpen ? "◀" : "▶"}
          </button>
        </div>

        {/* Sidebar Navigation */}
        <div className="flex-1 py-6 space-y-1 px-2">
          <Link to="/app" className="flex items-center space-x-3 text-cyan-400/80 hover:text-cyan-400 hover:bg-[#0f1f3d]/50 px-3 py-2 rounded transition-colors">
            <span>🔍</span>
            {sidebarOpen && <span className="text-xs uppercase tracking-wider">New Search</span>}
          </Link>
          <Link to="/cases" className="flex items-center space-x-3 text-cyan-400 bg-[#0f1f3d] px-3 py-2 rounded transition-colors font-bold">
            <span>📁</span>
            {sidebarOpen && <span className="text-xs uppercase tracking-wider">Cases</span>}
          </Link>

          {sidebarOpen && (
            <div className="pt-6 border-t border-cyan-950 mt-6 px-3">
              <div className="text-[10px] text-cyan-600 tracking-widest uppercase mb-3 font-bold">📊 DASHBOARD SUMMARY</div>
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-[#94a3b8]">Total Cases:</span>
                  <span className="text-cyan-400 font-bold">{totalCases}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#94a3b8]">Open Cases:</span>
                  <span className="text-green-400 font-bold">{openCases}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#94a3b8]">High Risk:</span>
                  <span className="text-red-400 font-bold">{highRiskCases}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-cyan-950 overflow-hidden">
          {sidebarOpen && (
            <div className="text-[9px] text-[#475569] text-center">
              SYSTEM v4.0 · APPROVED FOR CID
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Top Header */}
        <div className="bg-[#0a1628] border-b border-cyan-950 px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <h1 className="text-cyan-400 text-lg tracking-widest font-bold uppercase">📁 CASE MANAGEMENT</h1>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-cyan-500 hover:bg-cyan-400 text-[#020c1b] px-4 py-2 rounded text-xs font-bold tracking-wider uppercase transition-colors"
            >
              NEW CASE
            </button>
            <button
              onClick={() => {
                localStorage.removeItem("socmint_token");
                localStorage.removeItem("officer_profile");
                navigate("/login");
              }}
              className="border border-red-500/30 bg-red-950/20 hover:bg-red-900/40 text-red-400 px-3 py-1.5 rounded text-xs tracking-wider transition-colors"
            >
              LOGOUT
            </button>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="p-8 max-w-7xl w-full mx-auto space-y-8">
          {error && (
            <div className="bg-red-950/40 border border-red-500/30 p-4 rounded text-red-400 text-sm">
              ⚠ {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-20 text-cyan-400">
              <div className="animate-spin inline-block w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full mb-4"></div>
              <div>CONNECTING TO SECURE DB...</div>
            </div>
          ) : cases.length === 0 ? (
            <div className="text-center py-32 border border-dashed border-cyan-900/30 rounded-xl bg-[#0a1628]/25">
              <span className="text-4xl block mb-4">📁</span>
              <h2 className="text-cyan-400 font-bold mb-2">NO ACTIVE CASES FOUND</h2>
              <p className="text-[#94a3b8] text-xs max-w-sm mx-auto mb-6">Create a new case file to begin recording profiles, usernames, and risk assessments.</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 px-6 py-2.5 rounded text-xs font-bold transition-colors"
              >
                + CREATE FIRST CASE
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cases.map(c => {
                const priorityColors = {
                  CRITICAL: { text: "text-red-400 border-red-500/30 bg-red-950/20" },
                  HIGH: { text: "text-orange-400 border-orange-500/30 bg-orange-950/20" },
                  MEDIUM: { text: "text-blue-400 border-blue-500/30 bg-blue-950/20" },
                  LOW: { text: "text-slate-400 border-slate-500/30 bg-slate-950/20" }
                };
                const badge = priorityColors[c.priority as keyof typeof priorityColors] || priorityColors.LOW;

                return (
                  <div key={c.id} className="bg-[#0a1628] border border-cyan-950 rounded-lg p-5 flex flex-col justify-between hover:border-cyan-500/30 transition-all duration-300 group shadow-lg">
                    <div className="space-y-4">
                      {/* Case Header */}
                      <div className="flex justify-between items-start">
                        <span className="text-cyan-400 text-xs font-bold tracking-widest">{c.case_id}</span>
                        <div className="flex space-x-1.5">
                          <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase ${c.status === "open" ? "text-green-400 border-green-500/30 bg-green-950/20" : "text-gray-400 border-gray-500/30 bg-gray-950/20"}`}>
                            {c.status.toUpperCase()}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase ${badge.text}`}>
                            {c.priority}
                          </span>
                        </div>
                      </div>

                      {/* Case Title & Subject */}
                      <div>
                        <h3 className="text-white font-bold text-sm line-clamp-1 group-hover:text-cyan-300 transition-colors">{c.title}</h3>
                        <div className="text-xs text-[#94a3b8] mt-1 space-y-0.5">
                          {c.subject_real_name && <div>Subject: <span className="text-cyan-100">{c.subject_real_name}</span></div>}
                          {c.subject_username && <div>Alias: <span className="text-cyan-100">@{c.subject_username}</span></div>}
                        </div>
                      </div>

                      {/* Notes Section */}
                      <div className="pt-2">
                        <label className="block text-[10px] text-cyan-600 font-bold uppercase tracking-wider mb-1">OFFICER NOTES</label>
                        <textarea
                          defaultValue={c.notes || ""}
                          onBlur={(e) => handleUpdateNotes(c.case_id, e.target.value)}
                          placeholder="Click to type case notes (autosaves)..."
                          className="w-full bg-[#020c1b] border border-cyan-950/60 rounded p-2 text-xs text-cyan-100 focus:outline-none focus:border-cyan-800 h-16 resize-none"
                        />
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-cyan-950/40 flex justify-between items-center">
                      <div className="text-[10px] text-[#475569]">
                        <div>Created: {new Date(c.created_at).toLocaleDateString()}</div>
                        <div>Officer Badge: {c.created_by}</div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleLoadInvestigation(c.case_id)}
                          className="bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-[#020c1b] border border-cyan-500/40 px-2.5 py-1.5 rounded text-[10px] font-bold tracking-wider uppercase transition-all"
                        >
                          LOAD
                        </button>
                        <button
                          onClick={() => handleDeleteCase(c.case_id)}
                          className="bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/40 px-2.5 py-1.5 rounded text-[10px] font-bold tracking-wider uppercase transition-all"
                        >
                          DELETE
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* NEW CASE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-[#0a1628] border border-cyan-500/30 rounded-lg max-w-md w-full p-6 shadow-2xl space-y-6">
            <div className="text-center">
              <h2 className="text-cyan-400 font-bold text-md tracking-wider uppercase">📁 INITIALIZE NEW INVESTIGATION</h2>
              <div className="h-[1px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent mt-3"></div>
            </div>

            <form onSubmit={handleCreateCase} className="space-y-4">
              <div>
                <label className="block text-[10px] text-cyan-400 uppercase tracking-wider mb-1">Case Title *</label>
                <input
                  type="text"
                  required
                  value={newCaseTitle}
                  onChange={(e) => setNewCaseTitle(e.target.value)}
                  className="w-full bg-[#020c1b] border border-cyan-900 rounded p-2 text-xs text-cyan-100 focus:outline-none focus:border-cyan-400"
                  placeholder="e.g. UPI Fraud Probe"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-cyan-400 uppercase tracking-wider mb-1">Subject Username</label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full bg-[#020c1b] border border-cyan-900 rounded p-2 text-xs text-cyan-100 focus:outline-none focus:border-cyan-400"
                    placeholder="e.g. spamer99"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-cyan-400 uppercase tracking-wider mb-1">Subject Real Name</label>
                  <input
                    type="text"
                    value={newRealName}
                    onChange={(e) => setNewRealName(e.target.value)}
                    className="w-full bg-[#020c1b] border border-cyan-900 rounded p-2 text-xs text-cyan-100 focus:outline-none focus:border-cyan-400"
                    placeholder="e.g. Ramesh Kumar"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-cyan-400 uppercase tracking-wider mb-1">Subject Phone</label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full bg-[#020c1b] border border-cyan-900 rounded p-2 text-xs text-cyan-100 focus:outline-none focus:border-cyan-400"
                    placeholder="e.g. 9845011223"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-cyan-400 uppercase tracking-wider mb-1">Subject Email</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-[#020c1b] border border-cyan-900 rounded p-2 text-xs text-cyan-100 focus:outline-none focus:border-cyan-400"
                    placeholder="e.g. user@domain.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-cyan-400 uppercase tracking-wider mb-1">Priority</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                  className="w-full bg-[#020c1b] border border-cyan-900 rounded p-2 text-xs text-cyan-100 focus:outline-none focus:border-cyan-400"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 border border-cyan-500/30 hover:bg-cyan-500/5 text-cyan-400 py-2 rounded text-xs uppercase tracking-wider font-bold transition-all"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-[#020c1b] py-2 rounded text-xs uppercase tracking-wider font-bold transition-all flex items-center justify-center"
                >
                  {modalLoading ? "CREATING..." : "CREATE & SEARCH"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
