import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { API_BASE } from "../config";

const PLATFORM_COLORS = {
  GitHub: "#2b3137", Reddit: "#ff4500", HackerNews: "#ff6600",
  "Dev.to": "#0a0a0a", GitLab: "#fc6d26", Tumblr: "#36465d",
  "Twitter/X": "#1da1f2", Instagram: "#e1306c", TikTok: "#010101",
  LinkedIn: "#0077b5", Telegram: "#0088cc", Snapchat: "#fffc00",
  YouTube: "#ff0000", Quora: "#b92b27", Facebook: "#1877f2",
  ShareChat: "#ff6347", Koo: "#f5c518", Discord: "#5865f2",
};

const EVENT_ICONS = {
  account_created: "🆕",
  location_mention: "📍",
  post: "📝",
};

const SEVERITY_STYLES = {
  CRITICAL: {
    border: "2px solid #ef4444",
    bg: "rgba(239,68,68,0.08)",
    badge: "#ef4444",
    label: "⚠️ CRITICAL — Crime Matched",
  },
  WARNING: {
    border: "2px solid #f59e0b",
    bg: "rgba(245,158,11,0.06)",
    badge: "#f59e0b",
    label: "⚡ WARNING — Proximity Match",
  },
};

export default function EvasionTimeline({ profileData }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    if (!profileData || fetched) return;
    setLoading(true);
    setError(null);

    fetch(`${API_BASE}/api/evasion-timeline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile_data: profileData }),
    })
      .then((r) => r.json())
      .then((data) => {
        setEvents(data.events || []);
        setFetched(true);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [profileData, fetched]);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <div style={styles.loadingText}>Constructing evasion timeline…</div>
        <div style={styles.loadingSubtext}>
          Cross-referencing account creations, geo mentions, and legal records
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <span style={{ fontSize: 28 }}>⚠️</span>
        <div style={styles.errorText}>Failed to build evasion timeline</div>
        <div style={styles.errorDetail}>{error}</div>
      </div>
    );
  }

  if (!events.length) {
    return (
      <div style={styles.emptyContainer}>
        <span style={{ fontSize: 36 }}>🕵️</span>
        <div style={styles.emptyTitle}>No Evasion Events Detected</div>
        <div style={styles.emptySubtext}>
          No temporal patterns or location correlations found in the target's
          digital footprint.
        </div>
      </div>
    );
  }

  const criticalCount = events.filter((e) => e.severity === "CRITICAL").length;
  const warningCount = events.filter((e) => e.severity === "WARNING").length;

  return (
    <div style={styles.container}>
      {/* Header summary */}
      <div style={styles.summaryBar}>
        <div style={styles.summaryItem}>
          <span style={styles.summaryNumber}>{events.length}</span>
          <span style={styles.summaryLabel}>Events</span>
        </div>
        {criticalCount > 0 && (
          <div style={{ ...styles.summaryItem, ...styles.summaryCritical }}>
            <span style={styles.summaryNumber}>{criticalCount}</span>
            <span style={styles.summaryLabel}>Crime Matches</span>
          </div>
        )}
        {warningCount > 0 && (
          <div style={{ ...styles.summaryItem, ...styles.summaryWarning }}>
            <span style={styles.summaryNumber}>{warningCount}</span>
            <span style={styles.summaryLabel}>Proximity Alerts</span>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div style={styles.timeline}>
        {events.map((event, i) => {
          const sev = event.severity ? SEVERITY_STYLES[event.severity] : null;
          const color = PLATFORM_COLORS[event.platform] || "#64748b";

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
              style={styles.eventRow}
            >
              {/* Timeline spine */}
              <div style={styles.spine}>
                <div
                  style={{
                    ...styles.dot,
                    background: sev ? sev.badge : color,
                    boxShadow: sev
                      ? `0 0 12px ${sev.badge}60`
                      : `0 0 8px ${color}40`,
                  }}
                />
                {i < events.length - 1 && <div style={styles.line} />}
              </div>

              {/* Event card */}
              <div
                style={{
                  ...styles.card,
                  border: sev ? sev.border : "1px solid rgba(99,202,183,0.15)",
                  background: sev ? sev.bg : "rgba(15,31,61,0.6)",
                }}
              >
                {/* Crime match banner */}
                {sev && (
                  <div
                    style={{
                      ...styles.crimeBanner,
                      background: sev.badge,
                    }}
                  >
                    {sev.label}
                  </div>
                )}

                <div style={styles.cardHeader}>
                  {/* Platform badge */}
                  <div
                    style={{
                      ...styles.platformBadge,
                      background: `${color}25`,
                      border: `1px solid ${color}50`,
                      color: color,
                    }}
                  >
                    {event.platform}
                  </div>

                  {/* Event type icon */}
                  <span style={styles.eventIcon}>
                    {EVENT_ICONS[event.event_type] || "📌"}
                  </span>

                  {/* Date */}
                  <span style={styles.dateText}>{event.date_human}</span>
                </div>

                <div style={styles.cardTitle}>{event.title}</div>

                {/* Location pin */}
                {event.location && (
                  <div style={styles.locationRow}>
                    <span style={{ fontSize: 12 }}>📍</span>
                    <span style={styles.locationText}>{event.location}</span>
                  </div>
                )}

                {/* Crime match detail */}
                {event.crimeMatched && (
                  <div style={styles.crimeDetail}>
                    <div style={styles.crimeIcon}>⚖️</div>
                    <div>
                      <div style={styles.crimeTitle}>
                        {event.crimeMatched.title || event.crimeMatched.detail}
                      </div>
                      {event.crimeMatched.date && (
                        <div style={styles.crimeDate}>
                          Legal record date: {event.crimeMatched.date}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {event.date_iso && (
                  <div style={styles.isoDate}>{event.date_iso}</div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <style>{`
        @keyframes evasion-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
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
  summaryCritical: {
    border: "1px solid rgba(239,68,68,0.4)",
    background: "rgba(239,68,68,0.06)",
  },
  summaryWarning: {
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
  timeline: {
    position: "relative",
    paddingLeft: 0,
  },
  eventRow: {
    display: "flex",
    gap: 16,
    marginBottom: 0,
    minHeight: 80,
  },
  spine: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: 20,
    flexShrink: 0,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: "50%",
    flexShrink: 0,
    marginTop: 16,
  },
  line: {
    width: 2,
    flex: 1,
    background: "rgba(99,202,183,0.12)",
    marginTop: 4,
    marginBottom: 0,
    minHeight: 20,
  },
  card: {
    flex: 1,
    borderRadius: 10,
    padding: "14px 18px",
    marginBottom: 10,
    backdropFilter: "blur(12px)",
    overflow: "hidden",
    position: "relative",
  },
  crimeBanner: {
    position: "absolute",
    top: 0,
    right: 0,
    padding: "4px 12px",
    borderRadius: "0 8px 0 8px",
    fontSize: 9,
    fontWeight: 700,
    fontFamily: "'IBM Plex Mono', monospace",
    color: "#fff",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  platformBadge: {
    padding: "3px 10px",
    borderRadius: 6,
    fontSize: 10,
    fontWeight: 700,
    fontFamily: "'IBM Plex Mono', monospace",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  eventIcon: {
    fontSize: 14,
  },
  dateText: {
    fontSize: 11,
    color: "#94a3b8",
    fontFamily: "'IBM Plex Mono', monospace",
    marginLeft: "auto",
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: "#e2e8f0",
    fontFamily: "'IBM Plex Mono', monospace",
    lineHeight: 1.4,
  },
  locationRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  locationText: {
    fontSize: 11,
    color: "#f59e0b",
    fontFamily: "'IBM Plex Mono', monospace",
  },
  crimeDetail: {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
    marginTop: 10,
    padding: "10px 12px",
    borderRadius: 8,
    background: "rgba(239,68,68,0.08)",
    border: "1px solid rgba(239,68,68,0.25)",
  },
  crimeIcon: {
    fontSize: 20,
    flexShrink: 0,
  },
  crimeTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: "#fca5a5",
    fontFamily: "'IBM Plex Mono', monospace",
    lineHeight: 1.4,
  },
  crimeDate: {
    fontSize: 10,
    color: "#94a3b8",
    fontFamily: "'IBM Plex Mono', monospace",
    marginTop: 3,
  },
  isoDate: {
    fontSize: 9,
    color: "#475569",
    fontFamily: "'IBM Plex Mono', monospace",
    marginTop: 6,
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 20px",
    gap: 16,
  },
  spinner: {
    width: 36,
    height: 36,
    border: "3px solid rgba(99,202,183,0.15)",
    borderTop: "3px solid #63cab7",
    borderRadius: "50%",
    animation: "evasion-spin 0.8s linear infinite",
  },
  loadingText: {
    fontSize: 14,
    fontWeight: 700,
    color: "#e2e8f0",
    fontFamily: "'IBM Plex Mono', monospace",
  },
  loadingSubtext: {
    fontSize: 11,
    color: "#94a3b8",
    fontFamily: "'IBM Plex Mono', monospace",
    textAlign: "center",
    maxWidth: 360,
  },
  errorContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "40px 20px",
    gap: 10,
  },
  errorText: {
    fontSize: 14,
    fontWeight: 700,
    color: "#ef4444",
    fontFamily: "'IBM Plex Mono', monospace",
  },
  errorDetail: {
    fontSize: 11,
    color: "#94a3b8",
    fontFamily: "'IBM Plex Mono', monospace",
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
