// @ts-nocheck
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const PLATFORM_COLORS = {
  GitHub: "#2b3137", Reddit: "#ff4500", HackerNews: "#ff6600",
  "Dev.to": "#0a0a0a", GitLab: "#fc6d26", Tumblr: "#36465d",
  "Twitter/X": "#1da1f2", Instagram: "#e1306c", TikTok: "#010101",
  LinkedIn: "#0077b5", Telegram: "#0088cc", Snapchat: "#fffc00",
  YouTube: "#ff0000", Quora: "#b92b27", Facebook: "#1877f2",
  ShareChat: "#ff6347", Koo: "#f5c518", Discord: "#5865f2",
};

const LABEL_COLORS = {
  CONFIRMED: { text: "#ef4444", bg: "rgba(239,68,68,0.15)", border: "rgba(239,68,68,0.4)" },
  PROBABLE: { text: "#f59e0b", bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.4)" },
  POSSIBLE: { text: "#3b82f6", bg: "rgba(59,130,246,0.15)", border: "rgba(59,130,246,0.4)" },
};

function CollapsibleSignals({ signals }) {
  const [open, setOpen] = useState(false);

  if (!signals || signals.length === 0) return null;

  return (
    <div style={styles.signalsContainer}>
      <button 
        onClick={() => setOpen(!open)} 
        style={styles.signalsToggle}
      >
        <span style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "0.2s", display: "inline-block", marginRight: 6 }}>▶</span>
        {signals.length} Detection Signals
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: "hidden" }}
          >
            <div style={styles.signalsList}>
              {signals.map((sig, i) => (
                <div key={i} style={styles.signalItem}>
                  <span style={{ color: "#63cab7", marginRight: 8 }}>⚡</span>
                  {sig}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ShadowAccounts({ profileData }) {
  const accounts = profileData?.shadow_accounts || [];

  if (!accounts.length) {
    return (
      <div style={styles.emptyContainer}>
        <span style={{ fontSize: 36 }}>👻</span>
        <div style={styles.emptyTitle}>No Shadow Accounts Detected</div>
        <div style={styles.emptySubtext}>
          Our algorithms did not detect any burner or alternate profiles associated with this identity.
        </div>
      </div>
    );
  }

  const confirmedCount = accounts.filter(a => a.confidence_label === "CONFIRMED").length;
  const probableCount = accounts.filter(a => a.confidence_label === "PROBABLE").length;

  return (
    <div style={styles.container}>
      {/* Summary Bar */}
      <div style={styles.summaryBar}>
        <div style={styles.summaryItem}>
          <span style={styles.summaryNumber}>{accounts.length}</span>
          <span style={styles.summaryLabel}>Total Found</span>
        </div>
        {confirmedCount > 0 && (
          <div style={{ ...styles.summaryItem, ...styles.summaryConfirmed }}>
            <span style={{...styles.summaryNumber, color: "#ef4444"}}>{confirmedCount}</span>
            <span style={styles.summaryLabel}>Confirmed</span>
          </div>
        )}
        {probableCount > 0 && (
          <div style={{ ...styles.summaryItem, ...styles.summaryProbable }}>
            <span style={{...styles.summaryNumber, color: "#f59e0b"}}>{probableCount}</span>
            <span style={styles.summaryLabel}>Probable</span>
          </div>
        )}
      </div>

      {/* Account Grid */}
      <div style={styles.grid}>
        {accounts.map((acc, i) => {
          const color = PLATFORM_COLORS[acc.platform] || "#64748b";
          const labelStyle = LABEL_COLORS[acc.confidence_label] || LABEL_COLORS.POSSIBLE;

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              style={{
                ...styles.card,
                border: `1px solid ${labelStyle.border}`,
              }}
            >
              <div style={styles.cardHeader}>
                <div style={{ ...styles.platformBadge, background: `${color}25`, border: `1px solid ${color}50`, color: color }}>
                  {acc.platform}
                </div>
                <div style={{ ...styles.confidenceBadge, background: labelStyle.bg, color: labelStyle.text, border: `1px solid ${labelStyle.border}` }}>
                  {acc.confidence_label}
                </div>
              </div>

              <div style={styles.handleRow}>
                <span style={styles.handleLabel}>@</span>
                <span style={styles.handleText}>{acc.handle}</span>
              </div>

              {acc.url && (
                <a href={acc.url} target="_blank" rel="noreferrer" style={styles.link}>
                  View Profile ↗
                </a>
              )}

              <div style={styles.metricsGrid}>
                <div style={styles.metricCol}>
                  <div style={styles.metricVal}>{acc.overall_confidence}%</div>
                  <div style={styles.metricLab}>Overall Score</div>
                </div>
                <div style={styles.metricCol}>
                  <div style={styles.metricVal}>{acc.handle_similarity}%</div>
                  <div style={styles.metricLab}>Name Match</div>
                </div>
                <div style={styles.metricCol}>
                  <div style={styles.metricVal}>{acc.writing_overlap}%</div>
                  <div style={styles.metricLab}>Writing Match</div>
                </div>
              </div>

              <CollapsibleSignals signals={acc.signals} />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  container: {
    marginBottom: 24,
  },
  summaryBar: {
    display: "flex",
    gap: 16,
    marginBottom: 24,
    flexWrap: "wrap",
  },
  summaryItem: {
    padding: "12px 20px",
    borderRadius: 10,
    background: "rgba(15,31,61,0.7)",
    border: "1px solid rgba(99,202,183,0.15)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    minWidth: 100,
  },
  summaryConfirmed: {
    border: "1px solid rgba(239,68,68,0.4)",
    background: "rgba(239,68,68,0.06)",
  },
  summaryProbable: {
    border: "1px solid rgba(245,158,11,0.4)",
    background: "rgba(245,158,11,0.06)",
  },
  summaryNumber: {
    fontSize: 22,
    fontWeight: 800,
    color: "#e2e8f0",
    fontFamily: "'IBM Plex Mono', monospace",
  },
  summaryLabel: {
    fontSize: 10,
    color: "#94a3b8",
    fontFamily: "'IBM Plex Mono', monospace",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 2,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: 16,
  },
  card: {
    background: "rgba(15,31,61,0.6)",
    borderRadius: 12,
    padding: "20px",
    backdropFilter: "blur(12px)",
    display: "flex",
    flexDirection: "column",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  platformBadge: {
    padding: "4px 10px",
    borderRadius: 6,
    fontSize: 10,
    fontWeight: 700,
    fontFamily: "'IBM Plex Mono', monospace",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  confidenceBadge: {
    padding: "4px 10px",
    borderRadius: 6,
    fontSize: 10,
    fontWeight: 700,
    fontFamily: "'IBM Plex Mono', monospace",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  handleRow: {
    display: "flex",
    alignItems: "center",
    marginBottom: 8,
  },
  handleLabel: {
    fontSize: 20,
    color: "#63cab7",
    marginRight: 4,
    fontFamily: "'IBM Plex Mono', monospace",
  },
  handleText: {
    fontSize: 18,
    fontWeight: 600,
    color: "#e2e8f0",
  },
  link: {
    fontSize: 12,
    color: "#3b82f6",
    textDecoration: "none",
    marginBottom: 20,
    fontFamily: "'IBM Plex Mono', monospace",
  },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 8,
    background: "rgba(0,0,0,0.2)",
    borderRadius: 8,
    padding: "12px",
    marginBottom: 16,
  },
  metricCol: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  metricVal: {
    fontSize: 14,
    fontWeight: 700,
    color: "#e2e8f0",
    fontFamily: "'IBM Plex Mono', monospace",
  },
  metricLab: {
    fontSize: 9,
    color: "#94a3b8",
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  signalsContainer: {
    marginTop: "auto",
    paddingTop: 12,
    borderTop: "1px solid rgba(255,255,255,0.05)",
  },
  signalsToggle: {
    background: "none",
    border: "none",
    color: "#94a3b8",
    fontSize: 11,
    fontFamily: "'IBM Plex Mono', monospace",
    cursor: "pointer",
    padding: 0,
    display: "flex",
    alignItems: "center",
  },
  signalsList: {
    marginTop: 12,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  signalItem: {
    fontSize: 11,
    color: "#cbd5e1",
    lineHeight: 1.4,
    display: "flex",
    alignItems: "flex-start",
  },
  emptyContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "50px 20px",
    gap: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "#e2e8f0",
    fontFamily: "'IBM Plex Mono', monospace",
  },
  emptySubtext: {
    fontSize: 11,
    color: "#94a3b8",
    fontFamily: "'IBM Plex Mono', monospace",
    textAlign: "center",
    maxWidth: 360,
  },
};
