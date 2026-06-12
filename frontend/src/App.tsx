// @ts-nocheck
import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import GlobeScanner from "./components/GlobeScanner";
import AiChat from "./components/AiChat";
import NetworkGraph from "./components/NetworkGraph";
import FinancialFootprint from "./components/FinancialFootprint";
import EvasionTimeline from "./components/EvasionTimeline";
import ActivityHeatmap from "./components/ActivityHeatmap";
import SentimentPanel from "./components/SentimentPanel";
import ShadowAccounts from "./components/ShadowAccounts";
import WikidataCard from "./components/WikidataCard";
import PhoneIntelCard from "./components/PhoneIntelCard";
import { API_BASE, formatApiError, getHeaders, getOfficerProfile, saveOfficerProfile } from "./config";


// ─── Platform meta ────────────────────────────────────────────────────────────
const PLATFORM_ICONS = {
  GitHub: "⌨️", Reddit: "🔴", "Twitter/X": "𝕏", Instagram: "📸",
  YouTube: "▶️", TikTok: "🎵", LinkedIn: "💼", Telegram: "✈️",
  HackerNews: "🧡", "Dev.to": "👩‍💻", GitLab: "🦊", Tumblr: "📝",
  Medium: "✍️", Pinterest: "📌", SoundCloud: "🎧", Steam: "🎮",
  Pastebin: "📋", Flickr: "📷", Quora: "❓", Snapchat: "👻",
};

const ALL_PLATFORMS = Object.keys(PLATFORM_ICONS);

const RISK_COLORS = {
  HIGH: "#ef4444", MEDIUM: "#f59e0b", LOW: "#3b82f6", MINIMAL: "#22c55e",
};

// ─── Tiny helpers ─────────────────────────────────────────────────────────────
const fmtNum = (n) =>
  n == null ? null : n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : String(n);

function useLocalTime() {
  const [t, setT] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

// ─── Shared CSS-in-JS tokens ──────────────────────────────────────────────────
const T = {
  navy:    "#020c1b",
  navy2:   "#0a1628",
  navy3:   "#0f1f3d",
  panel:   "rgba(15,31,61,0.8)",
  border:  "rgba(99,202,183,0.18)",
  border2: "rgba(99,202,183,0.35)",
  teal:    "#63cab7",
  teal2:   "#4fb3a0",
  text:    "#e2e8f0",
  text2:   "#94a3b8",
  text3:   "#475569",
  red:     "#ef4444",
  amber:   "#f59e0b",
  blue:    "#3b82f6",
  green:   "#22c55e",
  orange:  "#fb923c",
  ff:      "'IBM Plex Mono', 'Courier New', monospace",
};

const cardClass = "glass-card";

function SectionHeader({ icon, title, subtitle }) {
  return (
    <div className="section-header">
      <div className="section-header-icon">{icon}</div>
      <div>
        <div className="section-header-title">{title}</div>
        {subtitle && <div className="section-header-sub">{subtitle}</div>}
      </div>
    </div>
  );
}

// ─── Risk Gauge SVG ───────────────────────────────────────────────────────────
function RiskGauge({ score = 0, level = "MINIMAL" }) {
  const c = RISK_COLORS[level] || T.text2;
  const angle = (score / 100) * 180 - 90;
  const rad = (deg) => (deg * Math.PI) / 180;
  const nx = 80 + 52 * Math.cos(rad(angle - 90));
  const ny = 80 + 52 * Math.sin(rad(angle - 90));
  return (
    <div className="risk-gauge-wrap" style={{ "--gauge-color": c }}>
      <svg width="160" height="95" viewBox="0 0 160 95">
        <defs>
          <linearGradient id="gg" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="45%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>
        {/* Track */}
        <path d="M14 82 A66 66 0 0 1 146 82" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="14" strokeLinecap="round" />
        {/* Colour arc */}
        <path d="M14 82 A66 66 0 0 1 146 82" fill="none" stroke="url(#gg)" strokeWidth="10" strokeLinecap="round" />
        {/* Needle */}
        <line x1="80" y1="82" x2={nx} y2={ny} stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="80" cy="82" r="5" fill={c} />
        {/* Score */}
        <text x="80" y="75" textAnchor="middle" fill="white" fontSize="22" fontWeight="700" fontFamily="monospace">{score}</text>
      </svg>
      <div style={{ color: c, fontWeight: 700, fontSize: 15, marginTop: -6, letterSpacing: 3 }}>{level}</div>
    </div>
  );
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className={cardClass} style={{ padding: 14, overflow: "hidden" }}>
      <style>{`@keyframes skpulse{0%,100%{opacity:.4}50%{opacity:.9}}`}</style>
      {[80, 120, 60].map((w, i) => (
        <div key={i} style={{
          height: i === 0 ? 14 : 10, width: `${w}%`, borderRadius: 4, marginBottom: 8,
          background: "rgba(99,202,183,0.12)", animation: `skpulse 1.6s ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>
  );
}

// ─── Platform Card ────────────────────────────────────────────────────────────
function PlatformCard({ p }) {
  const [expanded, setExpanded] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const icon  = PLATFORM_ICONS[p.platform] || "🌐";
  const found = p.found;
  const hasPosts = found && p.posts?.length > 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={() => found && setExpanded(e => !e)}
      className={`${cardClass} platform-card glass-card-interactive ${found ? "found" : ""} ${expanded ? "expanded" : ""}`}
      style={{
        opacity: found ? 1 : 0.42,
        border: `1px solid ${found ? (expanded ? T.teal : T.border) : "rgba(255,255,255,0.04)"}`,
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 17 }}>{icon}</span>
        <div>
          <span style={{ fontWeight: 700, fontSize: 12, color: found ? T.text : T.text3, letterSpacing: 0.5 }}>{p.platform}</span>
          {found && p.linked_via_real_name && (
            <div style={{ fontSize: 8, color: T.amber, marginTop: 1, letterSpacing: 0.5, fontWeight: 700 }}>🔗 LINKED VIA: {p.linked_via_real_name.toUpperCase()}</div>
          )}
        </div>
        <span className={`platform-badge ${found ? "found" : "not-found"}`} style={{ marginLeft: "auto" }}>
          {found ? "✓ FOUND" : "NOT FOUND"}
        </span>
      </div>
      {/* Note for platforms that block automated checks */}
      {!found && p.note && (
        <div style={{ marginTop: 6, fontSize: 9, color: T.amber, lineHeight: 1.4 }}>
          ⚠ {p.note}
        </div>
      )}
      {found && (
        <div style={{ marginTop: 8 }}>
          {/* Avatar and reverse image search */}
          {p.avatar && p.avatar.startsWith("http") && (
            <div style={{ position: "relative", width: "42px", height: "42px", marginBottom: "8px", borderRadius: "6px", overflow: "visible" }} onClick={e => e.stopPropagation()}>
              <img src={p.avatar} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "6px", border: `1px solid ${T.border}` }} />
              {p.reverse_image_links && (
                <div style={{ position: "absolute", top: "-4px", right: "-4px", zIndex: 10 }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDropdown(!showDropdown);
                    }}
                    title="Reverse image search"
                    style={{
                      background: "#020c1b",
                      border: `1px solid rgba(0, 255, 255, 0.4)`,
                      color: "#00ffff",
                      borderRadius: "50%",
                      width: "16px",
                      height: "16px",
                      fontSize: "9px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      padding: 0
                    }}
                  >
                    🔍
                  </button>
                  {showDropdown && (
                    <>
                      <div 
                        onClick={(e) => { e.stopPropagation(); setShowDropdown(false); }} 
                        style={{ position: "fixed", inset: 0, zIndex: 999 }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          top: "18px",
                          left: "0",
                          background: "#0a1628",
                          border: "1px solid #00ffff",
                          borderRadius: "4px",
                          padding: "4px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "2px",
                          zIndex: 1000,
                          boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                          minWidth: "110px"
                        }}
                      >
                        <a
                          href={p.reverse_image_links.google}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            padding: "4px 8px",
                            fontSize: "9px",
                            color: "#00ffff",
                            textDecoration: "none",
                            background: "transparent",
                            textAlign: "left",
                            borderRadius: "2px"
                          }}
                          className="hover:bg-[#0f1f3d]"
                        >
                          🔍 Google Lens
                        </a>
                        <a
                          href={p.reverse_image_links.tineye}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            padding: "4px 8px",
                            fontSize: "9px",
                            color: "#00ffff",
                            textDecoration: "none",
                            background: "transparent",
                            textAlign: "left",
                            borderRadius: "2px"
                          }}
                          className="hover:bg-[#0f1f3d]"
                        >
                          🔎 TinEye
                        </a>
                        <a
                          href={p.reverse_image_links.yandex}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            padding: "4px 8px",
                            fontSize: "9px",
                            color: "#00ffff",
                            textDecoration: "none",
                            background: "transparent",
                            textAlign: "left",
                            borderRadius: "2px"
                          }}
                          className="hover:bg-[#0f1f3d]"
                        >
                          🌐 Yandex
                        </a>
                        <a
                          href={p.reverse_image_links.bing}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            padding: "4px 8px",
                            fontSize: "9px",
                            color: "#00ffff",
                            textDecoration: "none",
                            background: "transparent",
                            textAlign: "left",
                            borderRadius: "2px"
                          }}
                          className="hover:bg-[#0f1f3d]"
                        >
                          🔷 Bing Visual
                        </a>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
          {p.display_name && (
            <div style={{ fontSize: 11, color: T.teal, marginBottom: 3 }}>@{p.display_name}</div>
          )}
          {p.bio && (
            <div style={{ fontSize: 10, color: T.text2, lineHeight: 1.5, marginBottom: 4 }}>
              {p.bio.slice(0, 80)}{p.bio.length > 80 ? "…" : ""}
            </div>
          )}
          {/* Stats */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
            {p.followers != null && <Chip label="Followers" val={fmtNum(p.followers)} />}
            {p.karma    != null && <Chip label="Karma"     val={fmtNum(p.karma)} />}
            {p.public_repos != null && <Chip label="Repos"  val={p.public_repos} />}
            {p.location && <Chip label="📍" val={p.location.slice(0, 18)} />}
          </div>
          {p.url && (
            <a href={p.url} target="_blank" rel="noreferrer"
               onClick={e => e.stopPropagation()}
               style={{ fontSize: 10, color: T.teal, textDecoration: "none" }}>
              View Profile →
            </a>
          )}
          {/* Posts — expanded */}
          {expanded && hasPosts && (
            <div style={{ marginTop: 8, borderTop: `1px solid ${T.border}`, paddingTop: 8 }}>
              <div style={{ fontSize: 9, color: T.text3, letterSpacing: 1, marginBottom: 6 }}>
                RECENT {(p.post_label || "posts").toUpperCase()}
              </div>
              {p.posts.slice(0, 3).map((post, i) => (
                <div key={i} style={{ fontSize: 10, color: T.text2, marginBottom: 4, lineHeight: 1.4 }}>
                  {post.url
                    ? <a href={post.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ color: "#93c5fd", textDecoration: "none" }}>• {(post.title || post.name || "").slice(0, 55)}</a>
                    : <span>• {(post.title || post.name || "").slice(0, 55)}</span>
                  }
                </div>
              ))}
            </div>
          )}
          {hasPosts && !expanded && (
            <div style={{ fontSize: 9, color: T.text3, marginTop: 4 }}>▾ {p.posts.length} {p.post_label || "posts"}</div>
          )}
        </div>
      )}
    </motion.div>
  );
}

function Chip({ label, val }) {
  return (
    <span className="data-chip">
      <span style={{ color: T.text3 }}>{label} </span>{val}
    </span>
  );
}

// ─── Signal Badge ─────────────────────────────────────────────────────────────
function SignalBadge({ signal }) {
  return <div className="signal-badge">⚠ {signal}</div>;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color = T.text, glow, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={`${cardClass} stat-card glass-card-accent-top`}
      style={{ "--accent": glow || color }}
    >
      <div className="stat-label">{icon} {label}</div>
      <div className="stat-value" style={{ color, "--stat-glow": glow || "rgba(99,202,183,0.08)" }}>{value}</div>
    </motion.div>
  );
}

// ─── Alias Map ────────────────────────────────────────────────────────────────
function AliasMap({ aliases }) {
  if (!aliases?.length) return null;
  const differs = aliases.filter(a => a.differs);
  return (
    <div className={cardClass} style={{ padding: 24, marginBottom: 20 }}>
      <SectionHeader icon="🔗" title="Alias / Identity Correlation Map" subtitle="Cross-platform username analysis" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
        {aliases.map((a, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8,
            background: a.differs ? "rgba(239,68,68,0.07)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${a.differs ? "rgba(239,68,68,0.25)" : T.border}`,
          }}>
            <span style={{ fontSize: 15 }}>{PLATFORM_ICONS[a.platform] || "🌐"}</span>
            <div>
              <div style={{ fontSize: 10, color: T.text3 }}>{a.platform}</div>
              <div style={{ fontSize: 12, color: a.differs ? "#fca5a5" : T.teal, fontWeight: 600 }}>
                {a.display_name} {a.differs && "⚠"}
              </div>
            </div>
          </div>
        ))}
      </div>
      {differs.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 11, color: "#fca5a5" }}>
          ⚠ {differs.length} alias{differs.length > 1 ? "es" : ""} detected — names differ from search query
        </div>
      )}
    </div>
  );
}

// ─── Geo Timeline ────────────────────────────────────────────────────────────
function GeoMentions({ geos }) {
  if (!geos?.length) return null;
  return (
    <div className={cardClass} style={{ padding: 24, marginBottom: 20 }}>
      <SectionHeader icon="📍" title="Geolocation Mentions" subtitle="Location signals from profiles" />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {geos.map((g, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
            <span style={{ fontSize: 14 }}>{PLATFORM_ICONS[g.platform] || "🌐"}</span>
            <span style={{ color: T.text3, minWidth: 90 }}>{g.platform}</span>
            <span style={{ color: T.text }}>📍 {g.location}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Behavioural Timeline ────────────────────────────────────────────────────
function BehaviouralTimeline({ timeline }) {
  if (!timeline?.length) return null;
  return (
    <div className={cardClass} style={{ padding: 24, marginBottom: 20 }}>
      <SectionHeader icon="📊" title="Behavioural Activity Timeline" subtitle="Recent posts and interactions" />
      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 360, overflowY: "auto" }}>
        {timeline.map((item, i) => (
          <div key={i} className="timeline-item">
            <span style={{ fontSize: 13 }}>{PLATFORM_ICONS[item.platform] || "🌐"}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: T.text3, marginBottom: 2 }}>{item.platform}</div>
              <div style={{ fontSize: 11, color: T.text, lineHeight: 1.4 }}>
                {item.url
                  ? <a href={item.url} target="_blank" rel="noreferrer" style={{ color: "#93c5fd", textDecoration: "none" }}>{item.title || "Untitled"}</a>
                  : (item.title || "Untitled")}
              </div>
              {item.subreddit && <div style={{ fontSize: 9, color: T.text3, marginTop: 2 }}>r/{item.subreddit}</div>}
            </div>
            {item.score > 0 && (
              <span style={{ fontSize: 10, color: T.amber, whiteSpace: "nowrap" }}>★ {fmtNum(item.score)}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── News Panel ───────────────────────────────────────────────────────────────
function NewsPanel({ query, preloaded }) {
  const [articles, setArticles] = useState(preloaded || []);
  const [loading, setLoading]   = useState(!preloaded?.length);
  const [error, setError]       = useState(null);

  useEffect(() => {
    if (!query) return;
    if (preloaded?.length) {
      setArticles(preloaded);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`${API_BASE}/api/news`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ query }),
    })
      .then(r => {
        if (!r.ok) {
          throw new Error("Backend news proxy error");
        }
        return r.json();
      })
      .then(d => {
        setArticles(d || []);
        setLoading(false);
      })
      .catch((err) => {
        setError("Failed to retrieve web & news mentions from intelligence proxy.");
        setLoading(false);
      });
  }, [query, preloaded]);

  return (
    <div className={cardClass} style={{ padding: 24, marginBottom: 20 }}>
      <SectionHeader icon="📰" title="News & Web Mentions" subtitle="Open-web intelligence results" />
      {loading && <div style={{ fontSize: 12, color: T.text3 }}>Fetching news & web intelligence…</div>}
      {error   && <div style={{ fontSize: 11, color: T.amber }}>⚠ {error}</div>}
      {!loading && !error && articles.length === 0 && (
        <div style={{ fontSize: 11, color: T.text3 }}>No news or web mentions found for this query.</div>
      )}
      {articles.map((a, i) => {
        let domain = "Web Link";
        try {
          if (a.link) {
            domain = new URL(a.link).hostname.replace("www.", "");
          }
        } catch (e) {}
        return (
          <div key={i} style={{
            padding: "12px 0",
            borderBottom: i < articles.length - 1 ? `1px solid ${T.border}` : "none",
          }}>
            <a href={a.link} target="_blank" rel="noreferrer"
               style={{ fontSize: 13, color: T.teal, textDecoration: "none", fontWeight: 600, lineHeight: 1.4, display: "block", marginBottom: 4 }}>
              {a.title}
            </a>
            {a.snippet && (
              <div style={{ fontSize: 11, color: T.text, marginBottom: 6, lineHeight: 1.4 }}>
                {a.snippet}
              </div>
            )}
            <div style={{ display: "flex", gap: 12, fontSize: 10, color: T.text3 }}>
              <span>🌐 {domain}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Share Modal ──────────────────────────────────────────────────────────────
function ShareModal({ caseId, onClose }) {
  const ref = `SOCMINT/KA→DL/${caseId}`;
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 10020,
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div className={cardClass} style={{ padding: 32, maxWidth: 440, width: "90%" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 22, marginBottom: 12 }}>✅</div>
        <div style={{ fontWeight: 700, fontSize: 15, color: T.teal, marginBottom: 8, letterSpacing: 1 }}>
          PROFILE SHARED SECURELY
        </div>
        <div style={{ fontSize: 12, color: T.text2, lineHeight: 1.7, marginBottom: 16 }}>
          Profile data transmitted to Delhi Cyber Police via secure OSINT relay.<br />
          Reference: <span style={{ color: T.teal, fontFamily: T.ff }}>{ref}</span><br />
          Recipient notified at: <span style={{ color: T.text }}>dcp-cyber@delhi.gov.in</span><br />
          Status: <span style={{ color: T.green }}>DELIVERED</span>
        </div>
        <div style={{ fontSize: 10, color: T.text3, padding: "8px 12px", background: "rgba(99,202,183,0.06)", borderRadius: 6, marginBottom: 16 }}>
          This is a demonstration of inter-state law enforcement data sharing. In production this would use MHA's CCTNS encrypted relay.
        </div>
        <button onClick={onClose} style={{
          padding: "8px 24px", borderRadius: 6, border: "none", cursor: "pointer",
          background: T.teal, color: T.navy2, fontWeight: 700, fontFamily: T.ff, fontSize: 12,
        }}>CLOSE</button>
      </div>
    </div>
  );
}

// ─── Identity Search Components ───────────────────────────────────────────────

const CONF_COLORS = { HIGH: "#22c55e", MEDIUM: "#f59e0b", LOW: "#64748b" };
const CONF_BG     = {
  HIGH:   "rgba(34,197,94,0.1)",
  MEDIUM: "rgba(245,158,11,0.1)",
  LOW:    "rgba(100,116,139,0.1)",
};
const CONF_BORDER = {
  HIGH:   "rgba(34,197,94,0.3)",
  MEDIUM: "rgba(245,158,11,0.3)",
  LOW:    "rgba(100,116,139,0.2)",
};

const EXTRA_PLATFORM_ICONS = {
  StackOverflow: "🏅", HackerRank: "🟢", LeetCode: "🔶",
  CodeChef: "👨‍🍳", Codeforces: "⚡", Kaggle: "📊",
  Behance: "🎨", Dribbble: "🏀",
};
const allIcons = { ...PLATFORM_ICONS, ...EXTRA_PLATFORM_ICONS };

function CandidateCard({ candidate }) {
  const [expanded, setExpanded] = useState(false);
  const lvl   = candidate.confidence_level || "LOW";
  const score = candidate.confidence_score || 0;
  const cc    = CONF_COLORS[lvl];
  const icon  = allIcons[candidate.platform] || "🌐";

  return (
    <div
      className={`${cardClass} glass-card-interactive`}
      style={{
        padding: "14px 16px",
        border: `1px solid ${CONF_BORDER[lvl]}`,
        marginBottom: 10,
        cursor: "pointer",
      }}
      onClick={() => setExpanded(e => !e)}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{candidate.platform}</span>
            {candidate.username && (
              <span style={{ fontSize: 11, color: T.teal }}>@{candidate.username}</span>
            )}
          </div>
          {candidate.display_name && candidate.display_name !== candidate.username && (
            <div style={{ fontSize: 11, color: T.text2, marginTop: 1 }}>{candidate.display_name}</div>
          )}
        </div>
        {/* Confidence badge */}
        <div style={{
          background: CONF_BG[lvl], border: `1px solid ${CONF_BORDER[lvl]}`,
          borderRadius: 20, padding: "3px 10px", textAlign: "center",
        }}>
          <div style={{ fontSize: 9, color: cc, letterSpacing: 1, fontWeight: 700 }}>{lvl}</div>
          <div style={{ fontSize: 13, color: cc, fontWeight: 700, fontFamily: T.ff }}>{score}</div>
        </div>
      </div>

      {/* Confidence bar */}
      <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, margin: "10px 0 8px" }}>
        <div style={{
          height: 3, width: `${score}%`, borderRadius: 2,
          background: cc, transition: "width 0.6s ease",
        }} />
      </div>

      {/* Match reasons */}
      {candidate.match_reasons?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
          {candidate.match_reasons.map((r, i) => (
            <span key={i} style={{
              fontSize: 9, padding: "2px 8px", borderRadius: 10,
              background: r.startsWith("⚠") ? "rgba(245,158,11,0.1)" : "rgba(99,202,183,0.1)",
              color: r.startsWith("⚠") ? T.amber : T.teal,
              border: `1px solid ${r.startsWith("⚠") ? "rgba(245,158,11,0.2)" : "rgba(99,202,183,0.15)"}`,
            }}>{r}</span>
          ))}
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 10, marginTop: 4 }}>
          {candidate.bio && (
            <div style={{ fontSize: 11, color: T.text2, lineHeight: 1.5, marginBottom: 8 }}>
              {candidate.bio.slice(0, 160)}{candidate.bio.length > 160 ? "…" : ""}
            </div>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 8 }}>
            {candidate.followers != null && <Chip label="Followers" val={fmtNum(candidate.followers)} />}
            {candidate.location && <Chip label="📍" val={candidate.location} />}
          </div>
          {candidate.snippet && !candidate.bio && (
            <div style={{ fontSize: 10, color: T.text3, lineHeight: 1.5, marginBottom: 8, fontStyle: "italic" }}>
              "{candidate.snippet.slice(0, 140)}"
            </div>
          )}
          {candidate.url && (
            <a href={candidate.url} target="_blank" rel="noreferrer"
               onClick={e => e.stopPropagation()}
               style={{ fontSize: 11, color: T.teal, textDecoration: "none" }}>
              View Profile →
            </a>
          )}
          {candidate.source === "direct_username_check" && candidate.checked_username && (
            <div style={{ fontSize: 9, color: T.text3, marginTop: 6 }}>
              Found via username check: @{candidate.checked_username}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CandidateGroup({ title, icon, candidates, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  if (!candidates.length) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
          padding: "8px 12px", borderRadius: 8,
          background: "rgba(255,255,255,0.03)",
          border: `1px solid ${T.border}`, marginBottom: open ? 10 : 0,
        }}
      >
        <span>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: T.text, letterSpacing: 1 }}>{title}</span>
        <span style={{
          marginLeft: "auto", fontSize: 10, color: T.teal,
          background: "rgba(99,202,183,0.1)", padding: "1px 8px", borderRadius: 10,
        }}>{candidates.length}</span>
        <span style={{ fontSize: 10, color: T.text3 }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && candidates.map((c, i) => <CandidateCard key={i} candidate={c} />)}
    </div>
  );
}

function IdentityResults({ result }) {
  const { query, candidates, username_candidates_checked, total_found } = result;

  const high   = candidates.filter(c => c.confidence_level === "HIGH");
  const medium = candidates.filter(c => c.confidence_level === "MEDIUM");
  const low    = candidates.filter(c => c.confidence_level === "LOW");

  return (
    <div className="fade-in">
      {/* Summary header */}
      <div className={`${cardClass} glass-card-accent-top`} style={{ padding: "18px 22px", marginBottom: 20, "--accent": T.teal }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.teal, marginBottom: 4 }}>
          Found {total_found} profile{total_found !== 1 ? "s" : ""} likely belonging to{" "}
          <span style={{ color: T.text }}>{query.full_name}</span>{" "}
          from <span style={{ color: T.text }}>{query.organization}</span>
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 10, color: T.text3, flexWrap: "wrap" }}>
          {query.city  && <span>📍 {query.city}</span>}
          {query.year  && <span>🎓 Batch of {query.year}</span>}
          <span>✅ {high.length} high confidence</span>
          <span>🔶 {medium.length} possible matches</span>
          <span>❓ {low.length} weak signals</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 20, alignItems: "start" }}>
        {/* Left: candidate groups */}
        <div>
          <CandidateGroup
            title="HIGH CONFIDENCE"
            icon="✅"
            candidates={high}
            defaultOpen={true}
          />
          <CandidateGroup
            title="POSSIBLE MATCHES"
            icon="🔶"
            candidates={medium}
            defaultOpen={false}
          />
          <CandidateGroup
            title="WEAK SIGNALS"
            icon="❓"
            candidates={low}
            defaultOpen={false}
          />
          {total_found === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0", color: T.text3 }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
              <div style={{ fontSize: 12 }}>No profiles found. Try different name spelling or organization.</div>
            </div>
          )}
        </div>

        {/* Right: username sidebar */}
        {username_candidates_checked?.length > 0 && (
          <div className={cardClass} style={{ padding: 16, position: "sticky", top: 72 }}>
            <div style={{ fontSize: 10, color: T.teal, letterSpacing: 1.5, fontWeight: 700, marginBottom: 12 }}>
              USERNAMES CHECKED DIRECTLY
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {username_candidates_checked.map((u, i) => {
                const found = candidates.some(
                  c => (c.username || "").toLowerCase() === u.toLowerCase() ||
                       (c.checked_username || "").toLowerCase() === u.toLowerCase()
                );
                return (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    fontSize: 11, fontFamily: T.ff,
                    color: found ? T.teal : T.text3,
                  }}>
                    <span>{found ? "✓" : "✗"}</span>
                    <span>@{u}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 12, fontSize: 9, color: T.text3, lineHeight: 1.5 }}>
              Direct platform sweeps run for top username variants derived from the name.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


// ─── Phone Intelligence Components ───────────────────────────────────────────

const OP_COLORS = {
  "Jio":         { bg: "rgba(0,102,255,0.15)",  border: "rgba(0,102,255,0.4)",  text: "#60a5fa" },
  "Airtel":      { bg: "rgba(239,68,68,0.15)",  border: "rgba(239,68,68,0.4)",  text: "#fca5a5" },
  "Vodafone-Vi": { bg: "rgba(139,92,246,0.15)", border: "rgba(139,92,246,0.4)", text: "#c4b5fd" },
  "BSNL":        { bg: "rgba(251,146,60,0.15)", border: "rgba(251,146,60,0.4)", text: "#fdba74" },
};

const UPI_APP_COLORS = {
  "PhonePe":              "#7c3aed",
  "Google Pay":           "#4285f4",
  "Paytm":                "#00baf2",
  "Amazon Pay":           "#ff9900",
  "BHIM":                 "#138808",
  "Freecharge":           "#e91e63",
  "JioMoney":             "#0066ff",
  "Airtel Payments Bank": "#ef4444",
  "IndusInd Bank":        "#1a56db",
  "Bank of Maharashtra":  "#065f46",
};




export default function App() {
  const navigate = useNavigate();
  const time = useLocalTime();

  const [input, setInput]             = useState({ username: "", real_name: "", phone: "", email: "" });
  const [searchMode, setSearchMode]   = useState("username");
  const [loading, setLoading]         = useState(false);
  const [result, setResult]           = useState(null);
  const [error, setError]             = useState(null);
  const [activeTab, setActiveTab]     = useState("all");
  const [activeView, setActiveView]   = useState("platforms");

  const [identityInput, setIdentityInput]       = useState({ full_name: "", organization: "", city: "", year: "" });
  const [identityResult, setIdentityResult]     = useState(null);
  const [identityLoading, setIdentityLoading]   = useState(false);
  const [identityError, setIdentityError]       = useState(null);

  const [phoneResult, setPhoneResult]   = useState(null);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError]     = useState(null);

  const [reportForm, setReportForm]           = useState(() => {
    const profile = getOfficerProfile();
    return {
      officer: profile.name || "",
      caseId: "",
      station: profile.station || "",
      badge: profile.badge || ""
    };
  });
  const [officerProfile, setOfficerProfile]   = useState(() => getOfficerProfile());
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [reportLoading, setReportLoading]     = useState(false);
  const [showShareModal, setShowShareModal]   = useState(false);
  const [caseId]   = useState(() => `KA-CID-${Date.now().toString(36).toUpperCase()}`);
  const [scanStep, setScanStep] = useState(0);
  const [backendOnline, setBackendOnline] = useState(null);
  const resultsRef = useRef(null);

  const [timelineData, setTimelineData] = useState(null);
  const [timelineLoading, setTimelineLoading] = useState(false);

  useEffect(() => {
    if (!result) {
      setTimelineData(null);
      return;
    }
    setTimelineLoading(true);
    fetch(`${API_BASE}/api/timeline`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ profile_data: result })
    })
      .then(res => {
        if (!res.ok) throw new Error("Timeline fetch failed");
        return res.json();
      })
      .then(data => {
        setTimelineData(data);
      })
      .catch(e => console.error(e))
      .finally(() => setTimelineLoading(false));
  }, [result]);

  const [sentimentData, setSentimentData] = useState(null);
  const [sentimentLoading, setSentimentLoading] = useState(false);

  useEffect(() => {
    if (!result) {
      setSentimentData(null);
      return;
    }
    setSentimentLoading(true);
    fetch(`${API_BASE}/api/sentiment`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ profile_data: result })
    })
      .then(res => {
        if (!res.ok) throw new Error("Sentiment analysis failed");
        return res.json();
      })
      .then(data => {
        setSentimentData(data);
      })
      .catch(e => console.error(e))
      .finally(() => setSentimentLoading(false));
  }, [result]);

  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [newCaseTitle, setNewCaseTitle] = useState("");
  const [newCasePriority, setNewCasePriority] = useState("LOW");
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [cases, setCases] = useState([]);
  const location = useLocation();

  const fetchCases = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/cases`, {
        headers: getHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setCases(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const handleSaveToCaseSubmit = async () => {
    setSaveLoading(true);
    const dataToSave = result || phoneResult || identityResult;
    try {
      if (selectedCaseId === "NEW_CASE") {
        const response = await fetch(`${API_BASE}/api/cases`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            title: newCaseTitle,
            subject_username: input.username || null,
            subject_email: input.email || null,
            subject_phone: input.phone || null,
            subject_real_name: input.real_name || null,
            priority: newCasePriority,
            profile_data: dataToSave,
            notes: ""
          })
        });
        if (!response.ok) throw new Error("Failed to create and save case");
        const resData = await response.json();
        alert(`Successfully saved to new case: ${resData.case_id}`);
      } else {
        const response = await fetch(`${API_BASE}/api/cases/${selectedCaseId}`, {
          method: "PUT",
          headers: getHeaders(),
          body: JSON.stringify({
            profile_data: dataToSave
          })
        });
        if (!response.ok) throw new Error("Failed to update case");
        alert(`Successfully saved to case: ${selectedCaseId}`);
      }
      setIsSaveModalOpen(false);
      setSelectedCaseId("");
      setNewCaseTitle("");
      fetchCases();
    } catch (e: any) {
      alert("Save failed: " + e.message);
    } finally {
      setSaveLoading(false);
    }
  };

  useEffect(() => {
    if (location.state?.triggerSearch) {
      const { username, real_name, phone, email } = location.state;
      setInput({
        username: username || "",
        real_name: real_name || "",
        phone: phone || "",
        email: email || ""
      });
      if (phone) setSearchMode("phone");
      else if (email) setSearchMode("email");
      else if (real_name) setSearchMode("real_name");
      else setSearchMode("username");

      setTimeout(() => {
        if (phone) {
          setPhoneLoading(true); setPhoneError(null); setPhoneResult(null); setScanStep(0);
          fetch(`${API_BASE}/api/phone-search`, {
            method: "POST", headers: getHeaders(),
            body: JSON.stringify({ phone }),
          })
            .then(res => res.json())
            .then(data => {
              setPhoneResult(data);
              setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
            })
            .catch(e => setPhoneError(formatApiError(e)))
            .finally(() => setPhoneLoading(false));
        } else {
          setLoading(true); setError(null); setResult(null); setScanStep(0);
          fetch(`${API_BASE}/api/search`, {
            method: "POST", headers: getHeaders(),
            body: JSON.stringify({ username, real_name, phone, email }),
          })
            .then(res => res.json())
            .then(data => {
              setResult(data);
              setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
            })
            .catch(e => setError(formatApiError(e)))
            .finally(() => setLoading(false));
        }
      }, 200);
      window.history.replaceState({}, document.title);
    }
    
    if (location.state?.loadedProfile) {
      setResult(location.state.loadedProfile);
      setSearchMode("username");
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    fetch(`${API_BASE}/api/health`, { headers: getHeaders() })
      .then((r) => setBackendOnline(r.ok))
      .catch(() => setBackendOnline(false));
  }, []);

  const isIdentityMode = searchMode === "identity";
  const isPhoneMode    = searchMode === "phone";
  const anyLoading     = loading || identityLoading || phoneLoading;

  const MODES = [
    { key: "username",  label: "USERNAME"  },
    { key: "real_name", label: "REAL NAME" },
    { key: "phone",     label: "📱 PHONE INTEL" },
    { key: "email",     label: "EMAIL"     },
    { key: "identity",  label: "🔎 FIND BY IDENTITY" },
  ];

  const SCAN_STEPS = [
    "Initialising OSINT sweep…","Querying GitHub & Reddit…","Checking Twitter/X & Instagram…",
    "Scanning TikTok & LinkedIn…","Probing HackerNews & Dev.to…","Sweeping Steam, Pastebin, Flickr…",
    "Running behavioural risk analysis…","Building identity correlation map…",
  ];
  const IDENTITY_STEPS = [
    "Building search queries…","Running DuckDuckGo searches…","Classifying profile URLs…",
    "Fetching profile details…","Running direct platform checks…","Scoring candidates…",
  ];
  const PHONE_STEPS = [
    "Detecting telecom circle…","Generating UPI identities…","Checking mule patterns…",
    "Searching web mentions…","Querying Truecaller…","Checking NCCRP portal…","Computing risk score…",
  ];

  useEffect(() => {
    if (!anyLoading) return;
    const steps = isIdentityMode ? IDENTITY_STEPS : isPhoneMode ? PHONE_STEPS : SCAN_STEPS;
    const id = setInterval(() => setScanStep(s => (s + 1) % steps.length), 1000);
    return () => clearInterval(id);
  }, [anyLoading, isIdentityMode, isPhoneMode]);

  const currentStep = isIdentityMode ? IDENTITY_STEPS[scanStep % IDENTITY_STEPS.length]
    : isPhoneMode ? PHONE_STEPS[scanStep % PHONE_STEPS.length]
    : SCAN_STEPS[scanStep % SCAN_STEPS.length];

  const handleSearch = useCallback(async (demoUsername = null, phoneOverride = null) => {
    if (isPhoneMode) {
      const ph = (phoneOverride || input.phone).trim();
      if (!ph) return;
      setPhoneLoading(true); setPhoneError(null); setPhoneResult(null); setScanStep(0);
      try {
        const res = await fetch(`${API_BASE}/api/phone-search`, {
          method: "POST", headers: getHeaders(),
          body: JSON.stringify({ phone: ph }),
        });
        if (!res.ok) { const t = await res.text(); throw new Error(`Server ${res.status}: ${t}`); }
        const data = await res.json();
        setPhoneResult(data);
        setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      } catch (e) { setPhoneError(formatApiError(e)); }
      finally { setPhoneLoading(false); }
      return;
    }
    const payload = demoUsername ? { username: demoUsername } : { ...input };
    if (!payload.username && !payload.real_name && !payload.phone && !payload.email) return;
    if (demoUsername) setInput(prev => ({ ...prev, username: demoUsername }));
    setLoading(true); setError(null); setResult(null); setScanStep(0);
    try {
      const res = await fetch(`${API_BASE}/api/search`, {
        method: "POST", headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const t = await res.text(); throw new Error(`Server ${res.status}: ${t}`); }
      const data = await res.json();
      setResult(data);
      setReportForm(prev => ({ ...prev, caseId }));
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (e) { setError(formatApiError(e)); }
    finally { setLoading(false); }
  }, [input, caseId, isPhoneMode]);

  const handleIdentitySearch = useCallback(async (demoMode = false) => {
    const payload = demoMode
      ? { full_name: "Rahul Sharma", organization: "IIT Bombay" }
      : { full_name: identityInput.full_name.trim(), organization: identityInput.organization.trim(),
          city: identityInput.city.trim() || undefined, year: identityInput.year.trim() || undefined };
    if (!payload.full_name || !payload.organization) return;
    if (demoMode) setIdentityInput({ full_name: "Rahul Sharma", organization: "IIT Bombay", city: "", year: "" });
    setIdentityLoading(true); setIdentityError(null); setIdentityResult(null); setScanStep(0);
    try {
      const res = await fetch(`${API_BASE}/api/identity-search`, {
        method: "POST", headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const t = await res.text(); throw new Error(`Server ${res.status}: ${t}`); }
      const data = await res.json();
      setIdentityResult(data);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (e) { setIdentityError(formatApiError(e)); }
    finally { setIdentityLoading(false); }
  }, [identityInput]);

  const handleReport = async () => {
    if (!result || !reportForm.officer || !reportForm.caseId) return;
    setReportLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/report`, {
        method: "POST", headers: getHeaders(),
        body: JSON.stringify({
          profile_data: result,
          officer_name: reportForm.officer,
          case_id: reportForm.caseId,
          officer_station: reportForm.station || "",
          officer_badge: reportForm.badge || "",
        }),
      });
      const data = await res.json();
      const bytes = Uint8Array.from(atob(data.pdf_base64), c => c.charCodeAt(0));
      const blob  = new Blob([bytes], { type: "application/pdf" });
      const url   = URL.createObjectURL(blob);
      const a     = document.createElement("a"); a.href = url; a.download = data.filename; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { alert("Report generation failed: " + e.message); }
    finally { setReportLoading(false); }
  };

  const handleCopyJSON = () => { navigator.clipboard.writeText(JSON.stringify(result, null, 2)); alert("Copied!"); };
  const foundPlatforms    = result?.platforms?.filter(p => p.found) || [];
  const notFoundPlatforms = result?.platforms?.filter(p => !p.found) || [];
  const displayPlatforms  = activeTab === "found" ? foundPlatforms : activeTab === "not_found" ? notFoundPlatforms : (result?.platforms || []);
  const riskColor = RISK_COLORS[result?.risk_score?.level] || T.teal;

  const inputPlaceholder = isPhoneMode ? "e.g. 9845012345" : `Enter ${searchMode.replace("_"," ")}…`;
  const modeAccent = isIdentityMode ? T.orange : isPhoneMode ? "#22c55e" : T.teal;

  return (
    <div className="dash-page flex min-h-screen">
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
          <Link to="/app" className="flex items-center space-x-3 text-cyan-400 bg-[#0f1f3d] px-3 py-2 rounded transition-colors font-bold">
            <span>🔍</span>
            {sidebarOpen && <span className="text-xs uppercase tracking-wider">New Search</span>}
          </Link>
          <Link to="/cases" className="flex items-center space-x-3 text-cyan-400/80 hover:text-cyan-400 hover:bg-[#0f1f3d]/50 px-3 py-2 rounded transition-colors font-bold">
            <span>📁</span>
            {sidebarOpen && <span className="text-xs uppercase tracking-wider">Cases</span>}
          </Link>

          {sidebarOpen && (
            <div className="pt-6 border-t border-cyan-950 mt-6 px-3">
              <div className="text-[10px] text-cyan-600 tracking-widest uppercase mb-3 font-bold">📊 DASHBOARD SUMMARY</div>
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-[#94a3b8]">Total Cases:</span>
                  <span className="text-cyan-400 font-bold">{cases.length}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#94a3b8]">Open Cases:</span>
                  <span className="text-green-400 font-bold">{cases.filter(c => c.status === "open").length}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#94a3b8]">High Risk:</span>
                  <span className="text-red-400 font-bold">{cases.filter(c => c.priority === "HIGH" || c.priority === "CRITICAL").length}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-cyan-950 overflow-hidden">
          {sidebarOpen && (
            <div className="text-[9px] text-[#475569] text-center font-mono">
              SYSTEM v4.0 · APPROVED FOR CID
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-y-auto relative">
      <style>{`
        * { box-sizing: border-box; }
        @keyframes pulse   { 0%,100%{opacity:.5} 50%{opacity:1} }
        @keyframes fadeIn  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        a { color: inherit; }
        .fade-in { animation: fadeIn 0.4s ease both; }
      `}</style>

      {/* TOP BAR */}
      <div className="dash-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className="dash-logo">🛡</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: 3, color: T.teal }}>SOCMINT SHIELD</div>
            <div style={{ fontSize: 10, color: T.text2, letterSpacing: 1.2, marginTop: 2 }}>
              Karnataka CID · Officer: {officerProfile.rank} {officerProfile.name} ({officerProfile.badge})
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className={backendOnline !== false ? "status-dot" : ""} style={{
              width: 7, height: 7, borderRadius: "50%",
              background: backendOnline === false ? T.red : backendOnline ? T.green : T.amber,
            }} />
            <span style={{ fontSize: 11, color: backendOnline === false ? T.red : T.text2, fontWeight: 500 }}>
              {backendOnline === null ? "Checking API…" : backendOnline ? "API Online" : "API Offline"}
            </span>
          </div>
          <div className="mono" style={{ fontSize: 11, color: T.text3 }}>{time.toUTCString().slice(5, 25)} UTC</div>
          <div className="mono" style={{ fontSize: 10, color: T.teal, background: "rgba(99,202,183,0.08)", padding: "4px 12px", borderRadius: 20, border: `1px solid ${T.border}` }}>CASE: {caseId}</div>
          <button onClick={() => setShowProfileModal(true)} style={{ fontSize: 10, color: T.text, background: "rgba(255,255,255,0.06)", border: `1px solid ${T.border}`, padding: "4px 12px", borderRadius: 20, cursor: "pointer", fontFamily: T.ff, outline: "none" }}>
            ⚙️ Profile
          </button>
          <button onClick={() => {
            localStorage.removeItem("socmint_token");
            localStorage.removeItem("officer_profile");
            navigate("/login");
          }} style={{ fontSize: 10, color: T.red, background: "rgba(239,68,68,0.08)", border: `1px solid rgba(239,68,68,0.35)`, padding: "4px 12px", borderRadius: 20, cursor: "pointer", fontFamily: T.ff, outline: "none", fontWeight: "bold" }}>
            LOGOUT
          </button>
        </div>
      </div>

      <div style={{
        position: "relative",
        zIndex: 9990,
        maxWidth: 1280,
        margin: "0 auto",
        padding: "28px 20px",
        display: (!result && !identityResult && !phoneResult) ? "flex" : "block",
        flexDirection: "column",
        justifyContent: "center",
        minHeight: (!result && !identityResult && !phoneResult) ? "calc(78vh - 72px)" : "auto"
      }}>
        {backendOnline === false && (
          <div className={cardClass} style={{
            padding: "14px 18px", marginBottom: 16, border: "1px solid rgba(239,68,68,0.35)",
            background: "rgba(239,68,68,0.08)", color: "#fca5a5", fontSize: 12, lineHeight: 1.6,
          }}>
            ⚠ Backend API is not reachable at <span style={{ fontFamily: T.ff }}>{API_BASE}</span>.
            Start it in a terminal: <span style={{ fontFamily: T.ff, color: T.text }}>cd backend &amp;&amp; python -m uvicorn main:app --port 8000</span>
          </div>
        )}

        {/* SEARCH PANEL */}
        <div className={`${cardClass} search-panel glass-card-accent-top`} style={{ marginBottom: 24, position: "relative", zIndex: 10, "--accent": modeAccent }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: 11, color: modeAccent, letterSpacing: 2, fontWeight: 700 }}>
              {isPhoneMode ? "◈ PHONE INTELLIGENCE — TELECOM + UPI + FRAUD ANALYSIS" : isIdentityMode ? "◈ FIND BY IDENTITY — NAME + ORGANISATION SEARCH" : "◈ SUSPECT IDENTIFIER INPUT — 20-PLATFORM CONCURRENT SWEEP"}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {!isIdentityMode && !isPhoneMode && (
                <button onClick={() => { setSearchMode("username"); handleSearch("torvalds"); }} style={{ padding: "5px 14px", borderRadius: 6, border: `1px solid ${T.border}`, background: "rgba(99,202,183,0.07)", color: T.teal, cursor: "pointer", fontFamily: T.ff, fontSize: 10 }}>▶ TRY DEMO</button>
              )}
              {isIdentityMode && (
                <button onClick={() => handleIdentitySearch(true)} style={{ padding: "5px 14px", borderRadius: 6, border: "1px solid rgba(251,146,60,0.3)", background: "rgba(251,146,60,0.07)", color: T.orange, cursor: "pointer", fontFamily: T.ff, fontSize: 10 }}>▶ TRY DEMO</button>
              )}
              {isPhoneMode && (
                <button onClick={() => { setInput(p => ({ ...p, phone: "9845012345" })); handleSearch(null, "9845012345"); }} style={{ padding: "5px 14px", borderRadius: 6, border: "1px solid rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.07)", color: T.green, cursor: "pointer", fontFamily: T.ff, fontSize: 10 }}>▶ TRY DEMO (9845012345)</button>
              )}
            </div>
          </div>

          {/* Mode tabs */}
          <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap", "--mode-accent": modeAccent }}>
            {MODES.map(({ key, label }) => (
              <button key={key} onClick={() => setSearchMode(key)}
                className={`mode-tab ${searchMode === key ? "active" : ""}`}
                style={{ "--mode-accent": modeAccent }}
              >{label}</button>
            ))}
          </div>

          {/* Standard / Phone input */}
          {!isIdentityMode && (
            <div style={{ display: "flex", gap: 12 }}>
              <input className="search-input" value={input[isPhoneMode ? "phone" : searchMode]}
                onChange={e => setInput(prev => ({ ...prev, [isPhoneMode ? "phone" : searchMode]: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder={inputPlaceholder}
                style={{ borderColor: `${modeAccent}44` }} />
              <button className="search-btn" onClick={() => handleSearch()} disabled={anyLoading} style={{
                cursor: anyLoading ? "not-allowed" : "pointer",
                background: anyLoading ? "rgba(99,202,183,0.2)" : `linear-gradient(135deg, ${modeAccent}, #3b82f6)`,
                color: anyLoading ? modeAccent : T.navy2,
              }}>{anyLoading ? "SCANNING…" : isPhoneMode ? "🔍 ANALYSE" : "◈ SEARCH"}</button>
            </div>
          )}

          {/* Identity input */}
          {isIdentityMode && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 9, color: T.text3, letterSpacing: 1, marginBottom: 5 }}>FULL NAME *</div>
                  <input value={identityInput.full_name} onChange={e => setIdentityInput(p => ({ ...p, full_name: e.target.value }))} onKeyDown={e => e.key === "Enter" && handleIdentitySearch()} placeholder="e.g. Sai Kishan"
                    style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(251,146,60,0.35)", borderRadius: 8, padding: "11px 14px", color: T.text, fontFamily: T.ff, fontSize: 13, outline: "none" }} />
                </div>
                <div>
                  <div style={{ fontSize: 9, color: T.text3, letterSpacing: 1, marginBottom: 5 }}>COLLEGE / ORGANIZATION *</div>
                  <input value={identityInput.organization} onChange={e => setIdentityInput(p => ({ ...p, organization: e.target.value }))} onKeyDown={e => e.key === "Enter" && handleIdentitySearch()} placeholder="e.g. PES University"
                    style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(251,146,60,0.35)", borderRadius: 8, padding: "11px 14px", color: T.text, fontFamily: T.ff, fontSize: 13, outline: "none" }} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12, alignItems: "end" }}>
                <div>
                  <div style={{ fontSize: 9, color: T.text3, letterSpacing: 1, marginBottom: 5 }}>CITY (optional)</div>
                  <input value={identityInput.city} onChange={e => setIdentityInput(p => ({ ...p, city: e.target.value }))} placeholder="e.g. Bangalore"
                    style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`, borderRadius: 8, padding: "11px 14px", color: T.text, fontFamily: T.ff, fontSize: 13, outline: "none" }} />
                </div>
                <div>
                  <div style={{ fontSize: 9, color: T.text3, letterSpacing: 1, marginBottom: 5 }}>GRADUATION YEAR (optional)</div>
                  <input value={identityInput.year} onChange={e => setIdentityInput(p => ({ ...p, year: e.target.value }))} placeholder="e.g. 2028"
                    style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`, borderRadius: 8, padding: "11px 14px", color: T.text, fontFamily: T.ff, fontSize: 13, outline: "none" }} />
                </div>
                <button onClick={() => handleIdentitySearch()} disabled={identityLoading || !identityInput.full_name || !identityInput.organization}
                  style={{ padding: "11px 28px", borderRadius: 8, border: "none", cursor: identityLoading ? "not-allowed" : "pointer", background: "linear-gradient(135deg,#ea580c,#f59e0b)", color: "white", fontWeight: 700, fontFamily: T.ff, fontSize: 12, opacity: (!identityInput.full_name || !identityInput.organization) ? 0.4 : 1 }}>
                  {identityLoading ? "SEARCHING…" : "🔎 FIND PERSON"}
                </button>
              </div>
            </div>
          )}

          {/* Progress */}
          {anyLoading && (
            <div style={{ marginTop: 16 }}>
              <div style={{ width: "100%", height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden", marginBottom: 8 }}>
                <div style={{ height: "100%", borderRadius: 2, backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite linear", width: "60%",
                  background: `linear-gradient(90deg, ${modeAccent}, #3b82f6, ${modeAccent})` }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: T.text3 }}>
                <span style={{ color: modeAccent }}>⬤ {currentStep}</span>
                <span>{isPhoneMode ? "7 sources analysed" : isIdentityMode ? "Building identity profile…" : "All 20 platforms in parallel"}</span>
              </div>
              {!isIdentityMode && !isPhoneMode && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10, marginTop: 16 }}>
                  {ALL_PLATFORMS.map(p => <SkeletonCard key={p} />)}
                </div>
              )}
            </div>
          )}

          {error        && <div style={{ marginTop: 12, color: T.red, fontSize: 12, padding: "10px 14px", background: "rgba(239,68,68,0.08)", borderRadius: 6, border: "1px solid rgba(239,68,68,0.2)" }}>⚠ {error}</div>}
          {identityError && <div style={{ marginTop: 12, color: T.red, fontSize: 12, padding: "10px 14px", background: "rgba(239,68,68,0.08)", borderRadius: 6, border: "1px solid rgba(239,68,68,0.2)" }}>⚠ {identityError}</div>}
          {phoneError   && <div style={{ marginTop: 12, color: T.red, fontSize: 12, padding: "10px 14px", background: "rgba(239,68,68,0.08)", borderRadius: 6, border: "1px solid rgba(239,68,68,0.2)" }}>⚠ {phoneError}</div>}
        </div>

        {/* PHONE RESULTS */}
        {phoneResult && isPhoneMode && (
          <div ref={resultsRef}><PhoneIntelCard data={phoneResult} /></div>
        )}

        {/* IDENTITY RESULTS */}
        {identityResult && isIdentityMode && (
          <div ref={resultsRef}><IdentityResults result={identityResult} /></div>
        )}

        {/* STANDARD OSINT RESULTS */}
        {result && !isIdentityMode && !isPhoneMode && (
          <motion.div ref={resultsRef} className="fade-in" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            {/* Results hero */}
            <div className={`${cardClass} results-hero glass-card-accent-top`} style={{ "--accent": riskColor }}>
              <div>
                <div style={{ fontSize: 10, color: T.text3, letterSpacing: 1.5, marginBottom: 6, textTransform: "uppercase" }}>Target Identified</div>
                <div className="results-query">{result.query}</div>
                <div className="results-meta" style={{ marginTop: 10 }}>
                  <span>🔍 {result.platforms_checked} platforms</span>
                  <span>✅ {result.platforms_found} found</span>
                  <span>⏱ {result.elapsed_seconds}s scan</span>
                </div>
              </div>
              <RiskGauge score={result.risk_score.score} level={result.risk_score.level} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
              <StatCard icon="🔍" label="Platforms Checked" value={result.platforms_checked} delay={0.05} glow="rgba(59,130,246,0.12)" />
              <StatCard icon="✅" label="Profiles Found" value={result.platforms_found} color={T.teal} delay={0.1} glow="rgba(99,202,183,0.15)" />
              <StatCard icon="⏱" label="Scan Time" value={`${result.elapsed_seconds}s`} delay={0.15} glow="rgba(245,158,11,0.1)" />
            </div>

            <div className={`${cardClass} rec-banner`} style={{ borderLeft: `3px solid ${riskColor}` }}>
              <div style={{ fontSize: 10, color: T.text3, marginBottom: 6, letterSpacing: 1, textTransform: "uppercase" }}>Recommendation</div>
              <div style={{ fontSize: 13, color: T.text, lineHeight: 1.6 }}>{result.risk_score.recommendation}</div>
            </div>

            {result.risk_score.signals?.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                {result.risk_score.signals.map((s, i) => <SignalBadge key={i} signal={s} />)}
              </div>
            )}

            {result.wikidata && <WikidataCard wikidata={result.wikidata} />}

            <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
              <button className="action-btn" onClick={handleCopyJSON}>📋 Copy JSON</button>
              <button className="action-btn primary" onClick={() => setShowShareModal(true)}>🔗 Share with Delhi Cyber Police</button>
            </div>

            <div className="view-tab-bar">
              {[
                ["platforms", `Platforms (${result.platforms.length})`],
                ["alias", `Alias Map (${result.alias_map?.length||0})`],
                ["shadow", `Shadow Accounts (${result.shadow_accounts?.length||0})`],
                ["nexus", "Nexus Graph"],
                ["financial", "Financial Footprint"],
                ["geo", `Geo (${result.geo_mentions?.length||0})`],
                ["timeline", `Activity (${result.timeline?.length||0})`],
                ["evasion", "Evasion Timeline"],
                ["sentiment", "Sentiment & Tone"],
                ["news", "News & Web"]
              ].map(([view, label]) => (
                <button key={view} onClick={() => setActiveView(view)} className={`view-tab ${activeView === view ? "active" : ""}`}>{label}</button>
              ))}
            </div>

            {activeView === "platforms" && (
              <>
                <div className="filter-tab-bar">
                  {[["all",`All (${result.platforms.length})`],["found",`Found (${foundPlatforms.length})`],["not_found",`Not Found (${notFoundPlatforms.length})`]].map(([tab, label]) => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`filter-tab ${activeTab === tab ? "active" : ""}`}>{label}</button>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14, marginBottom: 24 }}>
                  {displayPlatforms.map((p, i) => <PlatformCard key={i} p={p} />)}
                </div>
              </>
            )}
            {activeView === "alias"    && <AliasMap aliases={result.alias_map} />}
            {activeView === "shadow"   && <ShadowAccounts profileData={result} />}
            {activeView === "nexus"    && <div className={cardClass} style={{ height: "600px", width: "100%", marginBottom: 24, overflow: "hidden" }}><NetworkGraph profileData={result} /></div>}
            {activeView === "financial" && <FinancialFootprint profileData={result} />}
            {activeView === "geo"      && <GeoMentions geos={result.geo_mentions} />}
            {activeView === "timeline" && <BehaviouralTimeline timeline={result.timeline} />}
            {activeView === "evasion"  && <EvasionTimeline profileData={result} />}
            {activeView === "evasion"  && timelineData?.activity_heatmap && <ActivityHeatmap data={timelineData.activity_heatmap} />}
            {activeView === "sentiment" && sentimentData && <SentimentPanel data={sentimentData} />}
            {activeView === "news"     && <NewsPanel query={result.query} preloaded={result.news_articles} />}

            <div className={`${cardClass} glass-card-accent-top`} style={{ padding: 24, marginBottom: 20, border: "1px solid rgba(251,146,60,0.35)", "--accent": T.orange }}>
              <SectionHeader icon="📄" title="Section 65B Digital Evidence Report" subtitle="Indian Evidence Act, 1872 · Court-admissible export" />
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                <input value={reportForm.officer} onChange={e => setReportForm(p => ({ ...p, officer: e.target.value }))} placeholder="Investigating Officer Name"
                  style={{ flex: 1, minWidth: 200, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(251,146,60,0.3)", borderRadius: 8, padding: "10px 14px", color: T.text, fontFamily: T.ff, fontSize: 12, outline: "none" }} />
                <input value={reportForm.badge} onChange={e => setReportForm(p => ({ ...p, badge: e.target.value }))} placeholder="Badge / ID Number"
                  style={{ flex: 1, minWidth: 150, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(251,146,60,0.3)", borderRadius: 8, padding: "10px 14px", color: T.text, fontFamily: T.ff, fontSize: 12, outline: "none" }} />
                <input value={reportForm.station} onChange={e => setReportForm(p => ({ ...p, station: e.target.value }))} placeholder="Police Station / Agency"
                  style={{ flex: 1, minWidth: 200, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(251,146,60,0.3)", borderRadius: 8, padding: "10px 14px", color: T.text, fontFamily: T.ff, fontSize: 12, outline: "none" }} />
                <input value={reportForm.caseId} onChange={e => setReportForm(p => ({ ...p, caseId: e.target.value }))} placeholder="Case ID (e.g. CID/KA/2026/001)"
                  style={{ flex: 1, minWidth: 200, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(251,146,60,0.3)", borderRadius: 8, padding: "10px 14px", color: T.text, fontFamily: T.ff, fontSize: 12, outline: "none" }} />
                <button onClick={handleReport} disabled={reportLoading || !reportForm.officer || !reportForm.caseId}
                  style={{ padding: "10px 24px", borderRadius: 8, border: "none", cursor: "pointer", background: (!reportForm.officer || !reportForm.caseId) ? "rgba(251,146,60,0.2)" : "linear-gradient(135deg,#ea580c,#dc2626)", color: "white", fontWeight: 700, fontFamily: T.ff, fontSize: 11, opacity: (!reportForm.officer || !reportForm.caseId) ? 0.45 : 1 }}>
                  {reportLoading ? "GENERATING…" : "⬇ DOWNLOAD 65B REPORT"}
                </button>
              </div>
              <div style={{ fontSize: 10, color: T.text3 }}>SHA-256 · chain of custody · alias map · officer certificate · court-admissible</div>
            </div>
          </motion.div>
        )}

        {!result && !identityResult && !phoneResult && !anyLoading && (
          <div style={{ textAlign: "center", padding: "16px 0", color: T.text2, marginBottom: 10, position: "relative", zIndex: 10 }}>
            <div style={{ fontSize: 12, letterSpacing: 2, marginBottom: 8, fontWeight: 600, color: T.teal }}>
              {isPhoneMode ? "◈ ENTER AN INDIAN PHONE NUMBER FOR INTELLIGENCE ANALYSIS" : isIdentityMode ? "◈ ENTER NAME + ORGANISATION TO FIND SOCIAL PROFILES" : "◈ ENTER A SUSPECT IDENTIFIER TO BEGIN OSINT SWEEP"}
            </div>
            <div style={{ fontSize: 10, color: T.text2, opacity: 0.8 }}>
              {isPhoneMode ? "Telecom circle · UPI identity map · NCCRP check · web mentions · risk scoring" : isIdentityMode ? "Web search + username checks · confidence scoring · 65B PDF" : "20 platforms concurrently · risk scoring · alias detection · 65B PDF"}
            </div>
          </div>
        )}

        {/* PERSISTENT 3D GLOBE SCANNER BACKGROUND */}
        {!result && !identityResult && !phoneResult && (
          <div style={{
            position: "fixed",
            inset: 0,
            width: "100vw",
            height: "100vh",
            zIndex: anyLoading ? 9998 : 1,
            transition: "z-index 0.5s ease",
            background: "transparent",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: anyLoading ? "none" : "auto",
          }}>
            <GlobeScanner isScanning={anyLoading} scanStep={scanStep} />
          </div>
        )}
      </div>

      {result && <AiChat profileData={result} />}

      {showShareModal && <ShareModal caseId={caseId} onClose={() => setShowShareModal(false)} />}

      <AnimatePresence>
        {showProfileModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 10020, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowProfileModal(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="glass-card"
              style={{
                width: "90%",
                maxWidth: 420,
                padding: 28,
                border: `1px solid ${T.border2}`,
                background: "rgba(10, 22, 40, 0.95)",
                boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
                borderRadius: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, letterSpacing: 2, color: T.teal, margin: 0 }}>⚙️ OFFICER PROFILE</h3>
                <button onClick={() => setShowProfileModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: T.text3, fontSize: 18 }}>×</button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 9, color: T.text3, letterSpacing: 1, display: "block", marginBottom: 6 }}>INVESTIGATING OFFICER NAME</label>
                  <input
                    value={officerProfile.name}
                    onChange={e => setOfficerProfile(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter name"
                    style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 14px", color: T.text, fontFamily: T.ff, fontSize: 12, outline: "none" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 9, color: T.text3, letterSpacing: 1, display: "block", marginBottom: 6 }}>BADGE / ID NUMBER</label>
                  <input
                    value={officerProfile.badge}
                    onChange={e => setOfficerProfile(prev => ({ ...prev, badge: e.target.value }))}
                    placeholder="Enter badge number"
                    style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 14px", color: T.text, fontFamily: T.ff, fontSize: 12, outline: "none" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 9, color: T.text3, letterSpacing: 1, display: "block", marginBottom: 6 }}>POLICE STATION / AGENCY</label>
                  <input
                    value={officerProfile.station}
                    onChange={e => setOfficerProfile(prev => ({ ...prev, station: e.target.value }))}
                    placeholder="Enter police station"
                    style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 14px", color: T.text, fontFamily: T.ff, fontSize: 12, outline: "none" }}
                  />
                </div>

                <button
                  onClick={() => {
                    const updated = { ...officerProfile, saved: true };
                    setOfficerProfile(updated);
                    saveOfficerProfile(updated);
                    setReportForm(prev => ({
                      ...prev,
                      officer: updated.name,
                      station: updated.station,
                      badge: updated.badge,
                    }));
                    setShowProfileModal(false);
                    alert("Officer profile saved successfully!");
                  }}
                  className="action-btn primary"
                  style={{ width: "100%", padding: "12px 0", borderRadius: 8, fontWeight: 700, fontFamily: T.ff, fontSize: 11, cursor: "pointer", marginTop: 10 }}
                >
                  ✓ Save Profile Settings
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FULLSCREEN GLOBE SCANNER OVERLAY */}
      <AnimatePresence>
        {anyLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              position: "fixed",
              inset: 0,
              background: "transparent",
              zIndex: 10010,
              display: "flex",
              flexDirection: "column",
              fontFamily: T.ff,
              pointerEvents: "none"
            }}
          >
            {/* Header info */}
            <div style={{
              position: "absolute",
              top: 24, left: 32, right: 32,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              zIndex: 10,
              pointerEvents: "auto"
            }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: 4, color: T.teal, textShadow: '0 0 10px rgba(99,202,183,0.4)' }}>
                  🛡 SOCMINT SHIELD CORE
                </div>
                <div style={{ fontSize: 8, color: T.text3, letterSpacing: 1.5, marginTop: 4 }}>
                  KARNATAKA CID CYBER UNIT · GEOGRAPHIC SWEEP
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: T.teal, fontFamily: T.ff }}>
                  {Math.min(Math.round(((scanStep + 1) / (isIdentityMode ? 6 : isPhoneMode ? 7 : 8)) * 100), 99)}%
                </div>
                <div style={{ fontSize: 8, color: T.text3, letterSpacing: 1, marginTop: 4 }}>
                  SWEEP PROGRESS
                </div>
              </div>
            </div>

            {/* Bottom Translucent Console overlay */}
            <div style={{
              position: "absolute",
              bottom: 24, left: 32, right: 32,
              background: "rgba(10, 22, 40, 0.85)",
              backdropFilter: "blur(16px)",
              border: `1px solid ${T.border}`,
              borderRadius: 6,
              padding: "16px 24px",
              display: "grid",
              gridTemplateColumns: "1fr 280px",
              gap: 24,
              zIndex: 10,
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
              pointerEvents: "auto"
            }}>
              <div>
                <div style={{ fontSize: 10, color: T.teal, letterSpacing: 2, fontWeight: 700, marginBottom: 8 }}>ACTIVE SCAN OPERATIONS</div>
                <div style={{
                  fontSize: 10,
                  fontFamily: T.ff,
                  lineHeight: 1.6,
                  color: T.text2,
                  height: 96,
                  overflowY: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "end"
                }}>
                  {(isIdentityMode ? IDENTITY_STEPS : isPhoneMode ? PHONE_STEPS : SCAN_STEPS).slice(0, scanStep + 1).map((step, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8 }}>
                      <span style={{ color: T.text3 }}>[{new Date().toTimeString().slice(0,8)}]</span>
                      <span style={{ color: T.green }}>✓</span>
                      <span>{step}</span>
                    </div>
                  ))}
                  <div style={{ color: T.teal, animation: "pulse-g 1.5s infinite", marginTop: 4 }}>
                    ❯ SCANNING SATELLITE DATABASES...<span className="blink">_</span>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", borderLeft: `1px solid ${T.border}`, paddingLeft: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 4 }}>
                  <span style={{ color: T.text3 }}>SEARCH MODE:</span>
                  <span style={{ color: modeAccent, fontWeight: 700 }}>
                    {searchMode.toUpperCase()}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
                  <span style={{ color: T.text3 }}>TARGET VAL:</span>
                  <span style={{ color: T.teal, fontWeight: 700, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: 150 }}>
                    {isIdentityMode ? identityInput.full_name : input[isPhoneMode ? "phone" : searchMode]}
                  </span>
                </div>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
      </div> {/* Close Main Content Area */}

      {/* Floating SAVE TO CASE button */}
      {(result || phoneResult || identityResult) && (
        <button
          onClick={() => {
            fetchCases();
            setIsSaveModalOpen(true);
          }}
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 10005,
            background: "linear-gradient(135deg, #00ffff, #3b82f6)",
            color: "#020c1b",
            fontFamily: T.ff,
            fontWeight: "bold",
            padding: "12px 24px",
            borderRadius: "50px",
            boxShadow: "0 0 15px rgba(0, 255, 255, 0.4)",
            cursor: "pointer",
            border: "none",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "11px",
            letterSpacing: "1px",
            textTransform: "uppercase"
          }}
        >
          <span>💾</span>
          <span>Save to Case</span>
        </button>
      )}

      {/* SAVE TO CASE MODAL */}
      {isSaveModalOpen && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.85)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
          zIndex: 10006,
          backdropFilter: "blur(4px)"
        }}>
          <div style={{
            background: "#0a1628",
            border: "1px solid rgba(0, 255, 255, 0.3)",
            borderRadius: "8px",
            maxWidth: "400px",
            width: "100%",
            padding: "24px",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
            fontFamily: T.ff
          }}>
            <div style={{ textTransform: "uppercase", textAlign: "center", marginBottom: "16px" }}>
              <div style={{ fontSize: "14px", fontWeight: "bold", color: T.teal, letterSpacing: "1.5px" }}>💾 Save to Case File</div>
              <div style={{ height: "1px", background: `linear-gradient(90deg, transparent, ${T.border2}, transparent)`, marginTop: "8px" }}></div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "10px", color: T.teal, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "6px" }}>Select Target Case</label>
                <select
                  value={selectedCaseId}
                  onChange={(e) => setSelectedCaseId(e.target.value)}
                  style={{
                    width: "100%",
                    background: "#020c1b",
                    border: `1px solid rgba(0, 255, 255, 0.2)`,
                    borderRadius: "4px",
                    padding: "8px",
                    color: T.text,
                    fontSize: "12px",
                    outline: "none"
                  }}
                >
                  <option value="">-- Choose Existing Case --</option>
                  {cases.map((c: any) => (
                    <option key={c.case_id} value={c.case_id}>
                      {c.case_id} - {c.title}
                    </option>
                  ))}
                  <option value="NEW_CASE">+ Create New Case...</option>
                </select>
              </div>

              {selectedCaseId === "NEW_CASE" && (
                <>
                  <div>
                    <label style={{ display: "block", fontSize: "10px", color: T.teal, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "6px" }}>New Case Title *</label>
                    <input
                      type="text"
                      required
                      value={newCaseTitle}
                      onChange={(e) => setNewCaseTitle(e.target.value)}
                      style={{
                        width: "100%",
                        background: "#020c1b",
                        border: `1px solid rgba(0, 255, 255, 0.2)`,
                        borderRadius: "4px",
                        padding: "8px",
                        color: T.text,
                        fontSize: "12px",
                        outline: "none"
                      }}
                      placeholder="e.g. Identity Sweep"
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "10px", color: T.teal, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "6px" }}>Priority</label>
                    <select
                      value={newCasePriority}
                      onChange={(e) => setNewCasePriority(e.target.value)}
                      style={{
                        width: "100%",
                        background: "#020c1b",
                        border: `1px solid rgba(0, 255, 255, 0.2)`,
                        borderRadius: "4px",
                        padding: "8px",
                        color: T.text,
                        fontSize: "12px",
                        outline: "none"
                      }}
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="CRITICAL">CRITICAL</option>
                    </select>
                  </div>
                </>
              )}

              <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsSaveModalOpen(false);
                    setSelectedCaseId("");
                    setNewCaseTitle("");
                  }}
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: `1px solid rgba(0, 255, 255, 0.3)`,
                    color: T.teal,
                    padding: "8px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    textTransform: "uppercase",
                    fontWeight: "bold",
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveToCaseSubmit}
                  disabled={saveLoading || (!selectedCaseId) || (selectedCaseId === "NEW_CASE" && !newCaseTitle)}
                  style={{
                    flex: 1,
                    background: "linear-gradient(135deg, #00ffff, #3b82f6)",
                    color: "#020c1b",
                    border: "none",
                    padding: "8px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    textTransform: "uppercase",
                    fontWeight: "bold",
                    cursor: "pointer",
                    opacity: (saveLoading || (!selectedCaseId) || (selectedCaseId === "NEW_CASE" && !newCaseTitle)) ? 0.45 : 1
                  }}
                >
                  {saveLoading ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
