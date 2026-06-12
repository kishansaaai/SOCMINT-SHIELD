import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE } from "../config";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [badgeId, setBadgeId] = useState("");
  const [rank, setRank] = useState("SI");
  const [department, setDepartment] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passphrases do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          full_name: fullName,
          badge_id: badgeId,
          rank,
          department
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Registration failed");
      }

      navigate("/login");
    } catch (err: any) {
      setError(err.message || "Failed to create officer account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#020c1b] flex items-center justify-center font-mono overflow-y-auto py-12 px-4 select-none">
      <style>{`
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        .scanline-bg::after {
          content: " ";
          display: block;
          position: absolute;
          top: 0; left: 0; bottom: 0; right: 0;
          background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
          z-index: 2;
          background-size: 100% 2px, 3px 100%;
          pointer-events: none;
        }
        .scanbar {
          position: absolute;
          width: 100%;
          height: 4px;
          background: rgba(0, 255, 255, 0.05);
          box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
          animation: scanline 8s linear infinite;
          z-index: 1;
          pointer-events: none;
        }
        .glow-cyan {
          box-shadow: 0 0 15px rgba(0, 255, 255, 0.2);
        }
      `}</style>
      <div className="scanbar"></div>
      <div className="scanline-bg absolute inset-0 bg-[#020c1b] opacity-80"></div>

      <div className="relative z-10 w-full max-w-lg p-8 bg-[#0a1628]/95 border border-[#00ffff]/30 rounded-lg shadow-2xl backdrop-blur-md glow-cyan my-auto">
        <div className="text-center mb-8">
          <div className="text-cyan-400 auth-title text-3xl mb-3">🛡</div>
          <h1 className="text-cyan-400 auth-title font-bold text-lg tracking-widest uppercase">
            OFFICER REGISTRATION
          </h1>
          <p className="text-cyan-400/80 auth-subtitle text-xs tracking-wider mt-1">
            CREATING ENCRYPTED IDENTITY PROFILE
          </p>
          <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent mt-4"></div>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-950/40 border border-red-500/50 rounded text-red-400 text-xs leading-relaxed text-center">
            ⚠ {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-cyan-300/80 auth-label text-[10px] uppercase tracking-wider mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-[#020c1b] border border-cyan-500/30 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                placeholder="e.g. Kishan Kumar"
                style={{ color: "white" }}
              />
            </div>

            <div>
              <label className="block text-cyan-300/80 auth-label text-[10px] uppercase tracking-wider mb-1">
                Badge ID
              </label>
              <input
                type="text"
                required
                value={badgeId}
                onChange={(e) => setBadgeId(e.target.value)}
                className="w-full bg-[#020c1b] border border-cyan-500/30 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                placeholder="e.g. KA-2026-948"
                style={{ color: "white" }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-cyan-300/80 auth-label text-[10px] uppercase tracking-wider mb-1">
                Rank
              </label>
              <select
                value={rank}
                onChange={(e) => setRank(e.target.value)}
                className="w-full bg-[#020c1b] border border-cyan-500/30 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                style={{ color: "white" }}
              >
                <option value="SI">SI (Sub-Inspector)</option>
                <option value="PI">PI (Police Inspector)</option>
                <option value="CI">CI (Circle Inspector)</option>
                <option value="DSP">DSP (Deputy Superintendent)</option>
                <option value="SP">SP (Superintendent of Police)</option>
                <option value="DCP">DCP (Deputy Commissioner)</option>
                <option value="IPS">IPS Officer</option>
              </select>
            </div>

            <div>
              <label className="block text-cyan-300/80 auth-label text-[10px] uppercase tracking-wider mb-1">
                Department
              </label>
              <input
                type="text"
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-[#020c1b] border border-cyan-500/30 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                placeholder="e.g. Cyber Crime Unit"
                style={{ color: "white" }}
              />
            </div>
          </div>

          <div className="h-[1px] w-full bg-cyan-500/20 my-4"></div>

          <div>
              <label className="block text-cyan-300/80 auth-label text-[10px] uppercase tracking-wider mb-1">
              Choose Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#020c1b] border border-cyan-500/30 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              placeholder="e.g. kcid_kumar"
              style={{ color: "white" }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-cyan-300/80 auth-label text-[10px] uppercase tracking-wider mb-1">
                Passphrase
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#020c1b] border border-cyan-500/30 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                placeholder="••••••••"
                style={{ color: "white" }}
              />
            </div>

            <div>
              <label className="block text-cyan-300/80 auth-label text-[10px] uppercase tracking-wider mb-1">
                Confirm Passphrase
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-[#020c1b] border border-cyan-500/30 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                placeholder="••••••••"
                style={{ color: "white" }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-500 auth-btn hover:bg-cyan-400 active:bg-cyan-600 text-[#020c1b] font-bold py-2.5 px-4 rounded tracking-widest transition-all duration-300 shadow-md hover:shadow-cyan-500/30 hover:scale-[1.01] flex items-center justify-center uppercase text-xs mt-6"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 border-2 border-[#020c1b] border-t-transparent rounded-full animate-spin"></div>
                <span>CREATING PROFILE...</span>
              </div>
            ) : (
              "CREATE OFFICER ACCOUNT"
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="text-cyan-400/60 auth-link hover:text-cyan-400 text-xs tracking-wide transition-colors"
          >
            ← Back to authentication
          </Link>
        </div>
      </div>
    </div>
  );
}
