import { useState, useCallback, useEffect, useRef } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

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

const card = {
  background: T.panel,
  border: `1px solid ${T.border}`,
  borderRadius: 12,
  backdropFilter: "blur(8px)",
};

// ─── Risk Gauge SVG ───────────────────────────────────────────────────────────
function RiskGauge({ score = 0, level = "MINIMAL" }) {
  const c = RISK_COLORS[level] || T.text2;
  const angle = (score / 100) * 180 - 90;
  const rad = (deg) => (deg * Math.PI) / 180;
  const nx = 80 + 52 * Math.cos(rad(angle - 90));
  const ny = 80 + 52 * Math.sin(rad(angle - 90));
  return (
    <div style={{ textAlign: "center" }}>
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
    <div style={{ ...card, padding: 14, overflow: "hidden" }}>
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
  const icon  = PLATFORM_ICONS[p.platform] || "🌐";
  const found = p.found;
  const hasPosts = found && p.posts?.length > 0;
  return (
    <div
      onClick={() => found && setExpanded(e => !e)}
      style={{
        ...card,
        padding: "12px 14px",
        opacity: found ? 1 : 0.38,
        cursor: found ? "pointer" : "default",
        border: `1px solid ${found ? (expanded ? T.teal : T.border) : "rgba(255,255,255,0.04)"}`,
        transition: "border-color 0.2s, transform 0.15s",
        transform: expanded ? "scale(1.01)" : "scale(1)",
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 17 }}>{icon}</span>
        <span style={{ fontWeight: 700, fontSize: 12, color: found ? T.text : T.text3, letterSpacing: 0.5 }}>{p.platform}</span>
        <span style={{
          marginLeft: "auto", fontSize: 9, fontWeight: 700, letterSpacing: 1.2,
          color: found ? T.teal : T.text3,
          background: found ? "rgba(99,202,183,0.12)" : "rgba(71,85,105,0.2)",
          padding: "2px 8px", borderRadius: 20,
        }}>{found ? "✓ FOUND" : "NOT FOUND"}</span>
      </div>
      {/* Note for platforms that block automated checks */}
      {!found && p.note && (
        <div style={{ marginTop: 6, fontSize: 9, color: T.amber, lineHeight: 1.4 }}>
          ⚠ {p.note}
        </div>
      )}
      {found && (
        <div style={{ marginTop: 8 }}>
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
    </div>
  );
}

function Chip({ label, val }) {
  return (
    <span style={{ fontSize: 9, color: T.text2, background: "rgba(255,255,255,0.05)", padding: "2px 7px", borderRadius: 10 }}>
      <span style={{ color: T.text3 }}>{label} </span>{val}
    </span>
  );
}

// ─── Signal Badge ─────────────────────────────────────────────────────────────
function SignalBadge({ signal }) {
  return (
    <div style={{
      background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
      borderRadius: 6, padding: "4px 12px", fontSize: 11, color: "#fca5a5",
    }}>⚠ {signal}</div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color = T.text }) {
  return (
    <div style={{ ...card, padding: "18px 20px" }}>
      <div style={{ fontSize: 10, color: T.text3, letterSpacing: 1, marginBottom: 6 }}>{icon} {label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color, fontFamily: T.ff, letterSpacing: -1 }}>{value}</div>
    </div>
  );
}

// ─── Alias Map ────────────────────────────────────────────────────────────────
function AliasMap({ aliases }) {
  if (!aliases?.length) return null;
  const differs = aliases.filter(a => a.differs);
  return (
    <div style={{ ...card, padding: 20, marginBottom: 20 }}>
      <div style={{ fontSize: 11, color: T.teal, letterSpacing: 2, marginBottom: 14, fontWeight: 700 }}>
        ◈ ALIAS / IDENTITY CORRELATION MAP
      </div>
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
    <div style={{ ...card, padding: 20, marginBottom: 20 }}>
      <div style={{ fontSize: 11, color: T.teal, letterSpacing: 2, marginBottom: 14, fontWeight: 700 }}>
        ◈ GEOLOCATION MENTIONS
      </div>
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
    <div style={{ ...card, padding: 20, marginBottom: 20 }}>
      <div style={{ fontSize: 11, color: T.teal, letterSpacing: 2, marginBottom: 14, fontWeight: 700 }}>
        ◈ BEHAVIOURAL ACTIVITY TIMELINE
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 320, overflowY: "auto" }}>
        {timeline.map((item, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            padding: "8px 10px", borderRadius: 6,
            background: "rgba(255,255,255,0.03)", borderLeft: `2px solid ${T.teal}`,
          }}>
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
function NewsPanel({ query }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    if (!query) return;
    setLoading(true);
    fetch(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&pageSize=8&sortBy=relevancy&language=en&apiKey=demo`
    )
      .then(r => r.json())
      .then(d => {
        const arts = (d.articles || []).filter(a => a.title && a.title !== "[Removed]");
        setArticles(arts.slice(0, 8));
        setLoading(false);
      })
      .catch(() => {
        setError("NewsAPI unavailable (demo key). Replace with a real key for live results.");
        setLoading(false);
      });
  }, [query]);

  return (
    <div style={{ ...card, padding: 20, marginBottom: 20 }}>
      <div style={{ fontSize: 11, color: T.teal, letterSpacing: 2, marginBottom: 14, fontWeight: 700 }}>
        ◈ NEWS & WEB MENTIONS
      </div>
      {loading && <div style={{ fontSize: 12, color: T.text3 }}>Fetching news mentions…</div>}
      {error   && <div style={{ fontSize: 11, color: T.amber }}>⚠ {error}</div>}
      {!loading && !error && articles.length === 0 && (
        <div style={{ fontSize: 11, color: T.text3 }}>No news articles found for this query.</div>
      )}
      {articles.map((a, i) => (
        <div key={i} style={{
          padding: "10px 0", borderBottom: i < articles.length - 1 ? `1px solid ${T.border}` : "none",
        }}>
          <a href={a.url} target="_blank" rel="noreferrer"
             style={{ fontSize: 12, color: T.text, textDecoration: "none", fontWeight: 600, lineHeight: 1.4, display: "block", marginBottom: 4 }}>
            {a.title}
          </a>
          <div style={{ display: "flex", gap: 12, fontSize: 10, color: T.text3 }}>
            <span>📰 {a.source?.name}</span>
            {a.publishedAt && <span>🕐 {a.publishedAt?.slice(0, 10)}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Share Modal ──────────────────────────────────────────────────────────────
function ShareModal({ caseId, onClose }) {
  const ref = `SOCMINT/KA→DL/${caseId}`;
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 999,
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div style={{ ...card, padding: 32, maxWidth: 440, width: "90%" }} onClick={e => e.stopPropagation()}>
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
    <div style={{
      ...card,
      padding: "14px 16px",
      border: `1px solid ${CONF_BORDER[lvl]}`,
      marginBottom: 10,
      cursor: "pointer",
      transition: "border-color 0.2s",
    }} onClick={() => setExpanded(e => !e)}>
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
      <div style={{
        ...card, padding: "16px 20px", marginBottom: 20,
        borderLeft: `3px solid ${T.teal}`,
      }}>
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
          <div style={{ ...card, padding: 16, position: "sticky", top: 72 }}>
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

function PhoneResults({ data }) {
  const [mentionTab, setMentionTab] = useState("all");
  const [copied, setCopied]         = useState(null);

  const { phone, telecom, upi_ids, mule_patterns, truecaller,
          nccrp, web_mentions, numverify, risk_score, summary } = data;

  const opStyle  = OP_COLORS[telecom?.operator] || { bg: "rgba(255,255,255,0.05)", border: T.border, text: T.text2 };
  const riskC    = risk_score?.level === "HIGH" ? T.red : risk_score?.level === "MEDIUM" ? T.amber : T.green;
  const fraudMentions = (web_mentions || []).filter(m => m.category === "fraud_complaint");
  const bizMentions   = (web_mentions || []).filter(m => m.category === "business_listing");
  const genMentions   = (web_mentions || []).filter(m => m.category === "general_mention");

  const displayMentions =
    mentionTab === "fraud"   ? fraudMentions :
    mentionTab === "biz"     ? bizMentions :
    mentionTab === "general" ? genMentions :
    (web_mentions || []);

  const copyUpi = (id) => {
    navigator.clipboard.writeText(id);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  const formatted = phone?.e164
    ? `+91 ${phone.normalized.slice(0,5)} ${phone.normalized.slice(5)}`
    : phone?.normalized || "";

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* SECTION 1 — TELECOM IDENTITY CARD */}
      <div style={{ ...card, padding: 24, border: `1px solid ${opStyle.border}` }}>
        <div style={{ fontSize: 10, color: T.text3, letterSpacing: 2, marginBottom: 14, fontWeight: 700 }}>◈ TELECOM IDENTITY</div>
        <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: T.ff, color: T.text, letterSpacing: 2 }}>{formatted}</div>
            {truecaller?.available && truecaller?.name ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: T.teal }}>{truecaller.name}</span>
                <span style={{ fontSize: 9, background: "rgba(99,202,183,0.15)", color: T.teal, padding: "2px 8px", borderRadius: 10, border: `1px solid ${T.border}` }}>PUBLIC RECORD</span>
              </div>
            ) : (
              <div style={{ marginTop: 6 }}>
                <div style={{ fontSize: 11, color: T.text3 }}>
                  Subscriber name not available without auth
                </div>
                <a href={truecaller?.manual_url} target="_blank" rel="noreferrer"
                   style={{ fontSize: 10, color: T.teal, textDecoration: "none" }}>
                  🔍 Check on Truecaller manually →
                </a>
                <div style={{ fontSize: 9, color: T.text3, marginTop: 4, lineHeight: 1.5 }}>
                  For automated lookups: <a href="https://developer.truecaller.com" target="_blank" rel="noreferrer" style={{ color: T.amber, textDecoration: "none" }}>developer.truecaller.com</a> (free tier, 1000/month)
                </div>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div style={{ background: opStyle.bg, border: `1px solid ${opStyle.border}`, borderRadius: 8, padding: "8px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 9, color: T.text3, marginBottom: 4 }}>OPERATOR</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: opStyle.text }}>{telecom?.operator || "Unknown"}</div>
            </div>
            <div style={{ ...card, borderRadius: 8, padding: "8px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 9, color: T.text3, marginBottom: 4 }}>CIRCLE</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{telecom?.circle || "Unknown"}</div>
            </div>
            <div style={{ ...card, borderRadius: 8, padding: "8px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 9, color: T.text3, marginBottom: 4 }}>TYPE</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.amber }}>{telecom?.prepaid_likely ? "PREPAID" : "POSTPAID"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2 — THREAT INDICATORS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {/* NCCRP */}
        <div style={{ ...card, padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 9, color: T.text3, letterSpacing: 1, marginBottom: 8 }}>NCCRP STATUS</div>
          {nccrp?.flagged
            ? <div style={{ fontSize: 22 }}>🔴</div>
            : nccrp?.available === false
              ? <div style={{ fontSize: 22 }}>⚪</div>
              : <div style={{ fontSize: 22 }}>🟢</div>}
          <div style={{ fontSize: 10, fontWeight: 700, marginTop: 4, color: nccrp?.flagged ? T.red : T.text2 }}>
            {nccrp?.flagged ? "FLAGGED" : "UNAVAILABLE"}
          </div>
          <a href={nccrp?.manual_url} target="_blank" rel="noreferrer" style={{ fontSize: 9, color: T.teal, textDecoration: "none" }}>Check manually →</a>
        </div>
        {/* Risk score */}
        <div style={{ ...card, padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 9, color: T.text3, letterSpacing: 1, marginBottom: 8 }}>RISK SCORE</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: riskC, fontFamily: T.ff }}>{risk_score?.score ?? 0}</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: riskC }}>{risk_score?.level}</div>
        </div>
        {/* Fraud circle */}
        <div style={{ ...card, padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 9, color: T.text3, letterSpacing: 1, marginBottom: 8 }}>FRAUD CIRCLE</div>
          <div style={{ fontSize: 22 }}>{mule_patterns?.high_fraud_circle ? "🔴" : "🟢"}</div>
          <div style={{ fontSize: 10, fontWeight: 700, marginTop: 4, color: mule_patterns?.high_fraud_circle ? T.red : T.green }}>
            {mule_patterns?.high_fraud_circle ? "HIGH RISK AREA" : "NORMAL"}
          </div>
        </div>
        {/* Web complaints */}
        <div style={{ ...card, padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 9, color: T.text3, letterSpacing: 1, marginBottom: 8 }}>WEB COMPLAINTS</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: fraudMentions.length > 0 ? T.red : T.green, fontFamily: T.ff }}>{fraudMentions.length}</div>
          <div style={{ fontSize: 10, color: T.text2 }}>fraud mentions</div>
        </div>
      </div>

      {/* SECTION 3 — UPI IDENTITY MAP */}
      <div style={{ ...card, padding: 20 }}>
        <div style={{ fontSize: 11, color: T.teal, letterSpacing: 2, marginBottom: 4, fontWeight: 700 }}>◈ PROBABLE FINANCIAL IDENTITIES</div>
        <div style={{ fontSize: 10, color: T.amber, marginBottom: 14 }}>⚠ For investigator verification only — unconfirmed, generated from phone number</div>
        {["PhonePe","Google Pay","Paytm","Amazon Pay","BHIM","Freecharge","JioMoney","Airtel Payments Bank","IndusInd Bank","Bank of Maharashtra"].map(app => {
          const ids = (upi_ids || []).filter(u => u.app === app || u.provider === app);
          if (!ids.length) return null;
          const appColor = UPI_APP_COLORS[app] || T.teal;
          return (
            <div key={app} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: T.text3, marginBottom: 6, fontWeight: 600 }}>{app}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {ids.map((u, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.04)", border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 6, padding: "5px 10px" }}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", background: appColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: "white", fontWeight: 700, flexShrink: 0 }}>
                      {app.slice(0,2).toUpperCase()}
                    </div>
                    <span style={{ fontSize: 11, color: T.text, fontFamily: T.ff }}>{u.upi_id}</span>
                    <button onClick={() => copyUpi(u.upi_id)} style={{ background: "none", border: "none", cursor: "pointer", color: copied === u.upi_id ? T.green : T.text3, fontSize: 12, padding: 0 }}>
                      {copied === u.upi_id ? "✓" : "⎘"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* SECTION 4 — WEB MENTIONS */}
      {(web_mentions || []).length > 0 && (
        <div style={{ ...card, padding: 20 }}>
          <div style={{ fontSize: 11, color: T.teal, letterSpacing: 2, marginBottom: 14, fontWeight: 700 }}>◈ WEB MENTIONS</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {[["all","All"],["fraud","Fraud"],["biz","Business"],["general","General"]].map(([tab, label]) => (
              <button key={tab} onClick={() => setMentionTab(tab)} style={{
                padding: "4px 12px", borderRadius: 6, border: "none", cursor: "pointer",
                fontFamily: T.ff, fontSize: 10, fontWeight: 600,
                background: mentionTab === tab ? "rgba(99,202,183,0.15)" : "rgba(255,255,255,0.04)",
                color: mentionTab === tab ? T.teal : T.text3,
              }}>{label}</button>
            ))}
          </div>
          {displayMentions.map((m, i) => {
            const catColor = m.category === "fraud_complaint" ? T.red : m.category === "business_listing" ? T.amber : T.text3;
            return (
              <div key={i} style={{ padding: "10px 0", borderBottom: i < displayMentions.length-1 ? `1px solid ${T.border}` : "none" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <a href={m.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: T.text, textDecoration: "none", fontWeight: 600, lineHeight: 1.4, flex: 1 }}>{m.title || m.url}</a>
                  <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 10, background: `${catColor}18`, border: `1px solid ${catColor}44`, color: catColor, whiteSpace: "nowrap", flexShrink: 0 }}>
                    {m.category === "fraud_complaint" ? "FRAUD" : m.category === "business_listing" ? "BUSINESS" : "GENERAL"}
                  </span>
                </div>
                {m.snippet && <div style={{ fontSize: 10, color: T.text3, marginTop: 4, lineHeight: 1.5 }}>{m.snippet.slice(0, 140)}</div>}
                <div style={{ fontSize: 9, color: T.text3, marginTop: 4 }}>{new URL(m.url).hostname}</div>
              </div>
            );
          })}
          {displayMentions.length === 0 && <div style={{ fontSize: 11, color: T.text3 }}>No mentions in this category.</div>}
        </div>
      )}

      {/* SECTION 5 — INVESTIGATOR SUMMARY */}
      <div style={{ ...card, padding: 20, borderLeft: `3px solid ${riskC}` }}>
        <div style={{ fontSize: 11, color: T.teal, letterSpacing: 2, marginBottom: 12, fontWeight: 700 }}>◈ INVESTIGATOR SUMMARY</div>
        <div style={{ fontSize: 12, color: T.text, lineHeight: 1.8 }}>{summary}</div>
        {risk_score?.signals?.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            {risk_score.signals.map((s, i) => <SignalBadge key={i} signal={s} />)}
          </div>
        )}
      </div>
    </div>
  );
}


export default function App() {
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

  const [reportForm, setReportForm]           = useState({ officer: "", caseId: "" });
  const [reportLoading, setReportLoading]     = useState(false);
  const [showShareModal, setShowShareModal]   = useState(false);
  const [caseId]   = useState(() => `KA-CID-${Date.now().toString(36).toUpperCase()}`);
  const [scanStep, setScanStep] = useState(0);
  const resultsRef = useRef(null);

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

  const handleSearch = useCallback(async (demoUsername = null) => {
    if (isPhoneMode) {
      const ph = input.phone.trim();
      if (!ph) return;
      setPhoneLoading(true); setPhoneError(null); setPhoneResult(null); setScanStep(0);
      try {
        const res = await fetch(`${API_BASE}/api/phone-search`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: ph }),
        });
        if (!res.ok) { const t = await res.text(); throw new Error(`Server ${res.status}: ${t}`); }
        const data = await res.json();
        setPhoneResult(data);
        setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      } catch (e) { setPhoneError(e.message); }
      finally { setPhoneLoading(false); }
      return;
    }
    const payload = demoUsername ? { username: demoUsername } : { ...input };
    if (!payload.username && !payload.real_name && !payload.phone && !payload.email) return;
    if (demoUsername) setInput(prev => ({ ...prev, username: demoUsername }));
    setLoading(true); setError(null); setResult(null); setScanStep(0);
    try {
      const res = await fetch(`${API_BASE}/api/search`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const t = await res.text(); throw new Error(`Server ${res.status}: ${t}`); }
      const data = await res.json();
      setResult(data);
      setReportForm(prev => ({ ...prev, caseId }));
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (e) { setError(e.message); }
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
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const t = await res.text(); throw new Error(`Server ${res.status}: ${t}`); }
      const data = await res.json();
      setIdentityResult(data);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (e) { setIdentityError(e.message); }
    finally { setIdentityLoading(false); }
  }, [identityInput]);

  const handleReport = async () => {
    if (!result || !reportForm.officer || !reportForm.caseId) return;
    setReportLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/report`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_data: result, officer_name: reportForm.officer, case_id: reportForm.caseId }),
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
    <div style={{ minHeight: "100vh", background: `linear-gradient(160deg, ${T.navy} 0%, ${T.navy2} 55%, #0d2040 100%)`, fontFamily: T.ff, color: T.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap');
        * { box-sizing: border-box; }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes pulse   { 0%,100%{opacity:.5} 50%{opacity:1} }
        @keyframes fadeIn  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        input::placeholder { color: #334155; } a { color: inherit; }
        .fade-in { animation: fadeIn 0.4s ease both; }
        ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(99,202,183,0.25); border-radius: 3px; }
      `}</style>

      {/* TOP BAR */}
      <div style={{ borderBottom: `1px solid ${T.border}`, background: "rgba(2,12,27,0.92)", backdropFilter: "blur(14px)", padding: "12px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 200 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 9, background: `linear-gradient(135deg, ${T.teal}, #3b82f6)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🛡</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: 3, color: T.teal }}>SOCMINT SHIELD</div>
            <div style={{ fontSize: 9, color: T.text3, letterSpacing: 1.5 }}>KARNATAKA CID · OSINT INTELLIGENCE PLATFORM</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.green, animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: 10, color: T.text2 }}>SYSTEM ONLINE</span>
          </div>
          <div style={{ fontSize: 10, color: T.text3 }}>{time.toUTCString().slice(5, 25)} UTC</div>
          <div style={{ fontSize: 9, color: T.teal, background: "rgba(99,202,183,0.08)", padding: "3px 10px", borderRadius: 20, border: `1px solid ${T.border}` }}>CASE: {caseId}</div>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 20px" }}>
        {/* SEARCH PANEL */}
        <div style={{ ...card, padding: 28, marginBottom: 24 }}>
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
                <button onClick={() => { setInput(p => ({ ...p, phone: "9845012345" })); }} style={{ padding: "5px 14px", borderRadius: 6, border: "1px solid rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.07)", color: T.green, cursor: "pointer", fontFamily: T.ff, fontSize: 10 }}>▶ TRY DEMO (9845012345)</button>
              )}
            </div>
          </div>

          {/* Mode tabs */}
          <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
            {MODES.map(({ key, label }) => (
              <button key={key} onClick={() => setSearchMode(key)} style={{
                padding: "6px 14px", borderRadius: 6,
                border: `1px solid ${searchMode === key ? modeAccent : T.border}`,
                background: searchMode === key ? `${modeAccent}22` : "transparent",
                color: searchMode === key ? modeAccent : T.text3,
                cursor: "pointer", fontFamily: T.ff, fontSize: 10, fontWeight: 700, letterSpacing: 1, transition: "all 0.15s",
              }}>{label}</button>
            ))}
          </div>

          {/* Standard / Phone input */}
          {!isIdentityMode && (
            <div style={{ display: "flex", gap: 12 }}>
              <input value={input[isPhoneMode ? "phone" : searchMode]}
                onChange={e => setInput(prev => ({ ...prev, [isPhoneMode ? "phone" : searchMode]: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder={inputPlaceholder}
                style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: `1px solid ${modeAccent}44`, borderRadius: 8, padding: "12px 16px", color: T.text, fontFamily: T.ff, fontSize: 13, outline: "none" }} />
              <button onClick={() => handleSearch()} disabled={anyLoading} style={{
                padding: "12px 28px", borderRadius: 8, border: "none", cursor: anyLoading ? "not-allowed" : "pointer",
                background: anyLoading ? "rgba(99,202,183,0.2)" : `linear-gradient(135deg, ${modeAccent}, #3b82f6)`,
                color: anyLoading ? modeAccent : T.navy2,
                fontWeight: 700, fontFamily: T.ff, fontSize: 12, letterSpacing: 1.5, minWidth: 130,
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
          <div ref={resultsRef}><PhoneResults data={phoneResult} /></div>
        )}

        {/* IDENTITY RESULTS */}
        {identityResult && isIdentityMode && (
          <div ref={resultsRef}><IdentityResults result={identityResult} /></div>
        )}

        {/* STANDARD OSINT RESULTS */}
        {result && !isIdentityMode && !isPhoneMode && (
          <div ref={resultsRef} className="fade-in">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 200px", gap: 14, marginBottom: 20 }}>
              <StatCard icon="🔍" label="PLATFORMS CHECKED" value={result.platforms_checked} />
              <StatCard icon="✅" label="PROFILES FOUND"    value={result.platforms_found} color={T.teal} />
              <StatCard icon="⏱" label="SCAN TIME"         value={`${result.elapsed_seconds}s`} />
              <div style={{ ...card, padding: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <RiskGauge score={result.risk_score.score} level={result.risk_score.level} />
              </div>
            </div>

            <div style={{ ...card, padding: "12px 18px", marginBottom: 16, borderLeft: `3px solid ${riskColor}`, borderRadius: 8 }}>
              <div style={{ fontSize: 10, color: T.text3, marginBottom: 4 }}>RECOMMENDATION</div>
              <div style={{ fontSize: 12, color: T.text }}>{result.risk_score.recommendation}</div>
            </div>

            {result.risk_score.signals?.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                {result.risk_score.signals.map((s, i) => <SignalBadge key={i} signal={s} />)}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
              <button onClick={handleCopyJSON} style={{ padding: "8px 18px", borderRadius: 6, border: `1px solid ${T.border}`, background: "rgba(255,255,255,0.04)", color: T.text2, cursor: "pointer", fontFamily: T.ff, fontSize: 11 }}>📋 Copy JSON</button>
              <button onClick={() => setShowShareModal(true)} style={{ padding: "8px 18px", borderRadius: 6, border: "1px solid rgba(99,202,183,0.3)", background: "rgba(99,202,183,0.07)", color: T.teal, cursor: "pointer", fontFamily: T.ff, fontSize: 11 }}>🔗 Share with Delhi Cyber Police</button>
            </div>

            <div style={{ display: "flex", gap: 6, marginBottom: 16, borderBottom: `1px solid ${T.border}`, paddingBottom: 10, flexWrap: "wrap" }}>
              {[["platforms",`Platforms (${result.platforms.length})`],["alias",`Alias Map (${result.alias_map?.length||0})`],["geo",`Geo (${result.geo_mentions?.length||0})`],["timeline",`Activity (${result.timeline?.length||0})`],["news","News & Web"]].map(([view, label]) => (
                <button key={view} onClick={() => setActiveView(view)} style={{ padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontFamily: T.ff, fontSize: 10, fontWeight: 700, background: activeView === view ? "rgba(99,202,183,0.15)" : "transparent", color: activeView === view ? T.teal : T.text3 }}>{label.toUpperCase()}</button>
              ))}
            </div>

            {activeView === "platforms" && (
              <>
                <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                  {[["all",`All (${result.platforms.length})`],["found",`Found (${foundPlatforms.length})`],["not_found",`Not Found (${notFoundPlatforms.length})`]].map(([tab, label]) => (
                    <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: "5px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontFamily: T.ff, fontSize: 10, fontWeight: 600, background: activeTab === tab ? "rgba(99,202,183,0.12)" : "rgba(255,255,255,0.03)", color: activeTab === tab ? T.teal : T.text3 }}>{label}</button>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10, marginBottom: 24 }}>
                  {displayPlatforms.map((p, i) => <PlatformCard key={i} p={p} />)}
                </div>
              </>
            )}
            {activeView === "alias"    && <AliasMap aliases={result.alias_map} />}
            {activeView === "geo"      && <GeoMentions geos={result.geo_mentions} />}
            {activeView === "timeline" && <BehaviouralTimeline timeline={result.timeline} />}
            {activeView === "news"     && <NewsPanel query={result.query} />}

            <div style={{ ...card, padding: 24, marginBottom: 20, border: "1px solid rgba(251,146,60,0.35)" }}>
              <div style={{ fontSize: 11, color: T.orange, letterSpacing: 2, marginBottom: 16, fontWeight: 700 }}>◈ SECTION 65B DIGITAL EVIDENCE REPORT — INDIAN EVIDENCE ACT, 1872</div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                <input value={reportForm.officer} onChange={e => setReportForm(p => ({ ...p, officer: e.target.value }))} placeholder="Investigating Officer Name"
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
          </div>
        )}

        {!result && !identityResult && !phoneResult && !anyLoading && (
          <div style={{ textAlign: "center", padding: "70px 0", color: T.text3 }}>
            <div style={{ fontSize: 60, marginBottom: 16, opacity: 0.2 }}>🛡</div>
            <div style={{ fontSize: 12, letterSpacing: 2, marginBottom: 8 }}>
              {isPhoneMode ? "ENTER AN INDIAN PHONE NUMBER FOR INTELLIGENCE ANALYSIS" : isIdentityMode ? "ENTER NAME + ORGANISATION TO FIND SOCIAL PROFILES" : "ENTER A SUSPECT IDENTIFIER TO BEGIN OSINT SWEEP"}
            </div>
            <div style={{ fontSize: 10 }}>
              {isPhoneMode ? "Telecom circle · UPI identity map · NCCRP check · web mentions · risk scoring" : isIdentityMode ? "Web search + username checks · confidence scoring · 65B PDF" : "20 platforms concurrently · risk scoring · alias detection · 65B PDF"}
            </div>
          </div>
        )}
      </div>

      {showShareModal && <ShareModal caseId={caseId} onClose={() => setShowShareModal(false)} />}
    </div>
  );
}
