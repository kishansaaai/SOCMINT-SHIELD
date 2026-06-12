import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE } from "../config";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Authentication failed");
      }

      const data = await response.json();
      localStorage.setItem("socmint_token", data.access_token);
      localStorage.setItem("officer_profile", JSON.stringify({
        name: data.officer.full_name,
        badge: data.officer.badge_id,
        rank: data.officer.rank,
        saved: true
      }));

      navigate("/app");
    } catch (err: any) {
      setError(err.message || "Could not authenticate with security gateway.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#020c1b] flex items-center justify-center font-mono overflow-hidden select-none">
      {/* Animated Scan Line Background */}
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
          background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 255, 0, 0.06));
          z-index: 2;
          background-size: 100% 2px, 3px 100%;
          pointer-events: none;
        }
        .scanbar {
          position: absolute;
          width: 100%;
          height: 4px;
          background: rgba(0, 255, 255, 0.1);
          box-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
          animation: scanline 6s linear infinite;
          z-index: 1;
          pointer-events: none;
        }
        .glow-cyan {
          box-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
        }
        .glow-cyan:focus {
          box-shadow: 0 0 20px rgba(0, 255, 255, 0.6);
        }
      `}</style>
      <div className="scanbar"></div>
      <div className="scanline-bg absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#0a1628] via-[#020c1b] to-[#020c1b] opacity-80"></div>

      {/* Main card */}
      <div className="relative z-10 w-full max-w-md p-8 bg-[#0a1628]/90 border border-cyan-500/30 rounded-lg shadow-2xl backdrop-blur-md m-4 glow-cyan">
        <div className="text-center mb-8">
          <div className="text-cyan-400 auth-title text-3xl mb-3 animate-pulse">🛡</div>
          <h1 className="text-cyan-400 auth-title font-bold text-lg tracking-widest uppercase">
            KARNATAKA CID
          </h1>
          <p className="text-cyan-400/80 auth-subtitle text-xs tracking-wider mt-1">
            SOCMINT SHIELD v4.0
          </p>
          <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent mt-4"></div>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-950/40 border border-red-500/50 rounded text-red-400 text-xs leading-relaxed text-center">
            ⚠ {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-cyan-300/80 auth-label text-xs uppercase tracking-wider mb-2">
              Officer Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#020c1b] border border-cyan-500/30 rounded px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-400 transition-all glow-cyan-focus"
              placeholder="e.g. kcid_104"
              style={{ color: "white" }}
            />
          </div>

          <div>
            <label className="block text-cyan-300/80 auth-label text-xs uppercase tracking-wider mb-2">
              Passphrase / Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#020c1b] border border-cyan-500/30 rounded px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-400 transition-all"
              placeholder="••••••••"
              style={{ color: "white" }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-500 auth-btn hover:bg-cyan-400 active:bg-cyan-600 text-[#020c1b] font-bold py-3 px-4 rounded tracking-widest transition-all duration-300 shadow-md hover:shadow-cyan-500/30 hover:scale-[1.01] flex items-center justify-center uppercase text-sm mt-8"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-[#020c1b] border-t-transparent rounded-full animate-spin"></div>
                <span>AUTHENTICATING...</span>
              </div>
            ) : (
              "AUTHENTICATE"
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <Link
            to="/register"
            className="text-cyan-400/60 auth-link hover:text-cyan-400 text-xs tracking-wide transition-colors"
          >
            Register new officer →
          </Link>
        </div>
      </div>
    </div>
  );
}
