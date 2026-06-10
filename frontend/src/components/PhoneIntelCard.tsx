// @ts-nocheck
import React, { useState } from 'react';

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

function SignalBadge({ signal }) {
  return <div className="signal-badge">⚠ {signal}</div>;
}

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

export default function PhoneIntelCard({ data }) {
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
      <div className={`${cardClass} glass-card-accent-top`} style={{ padding: 24, border: `1px solid ${opStyle.border}`, "--accent": opStyle.text }}>
        <SectionHeader icon="📱" title="Telecom Identity" subtitle="Subscriber and operator intelligence" />
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
                <div style={{ fontSize: 11, color: T.text3, marginBottom: 8 }}>
                  Subscriber name not available without auth
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <a href={truecaller?.manual_url} target="_blank" rel="noreferrer"
                     style={{ fontSize: 11, color: T.teal, textDecoration: "none", background: "rgba(99,202,183,0.08)", border: `1px solid rgba(99,202,183,0.3)`, padding: "6px 12px", borderRadius: 6, display: 'inline-flex', alignItems: 'center' }}>
                    🔍 Truecaller Manual Check →
                  </a>
                  {truecaller?.fallback_url && (
                    <a href={truecaller.fallback_url} target="_blank" rel="noreferrer"
                       style={{ fontSize: 11, color: T.amber, textDecoration: "none", background: "rgba(245,158,11,0.08)", border: `1px solid rgba(245,158,11,0.3)`, padding: "6px 12px", borderRadius: 6, display: 'inline-flex', alignItems: 'center' }}>
                      🔍 DuckDuckGo Search Fallback →
                    </a>
                  )}
                </div>
                <div style={{ fontSize: 9, color: T.text3, marginTop: 8, lineHeight: 1.5 }}>
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
            <div className={cardClass} style={{ borderRadius: 8, padding: "8px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 9, color: T.text3, marginBottom: 4 }}>CIRCLE</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{telecom?.circle || "Unknown"}</div>
            </div>
            <div className={cardClass} style={{ borderRadius: 8, padding: "8px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 9, color: T.text3, marginBottom: 4 }}>TYPE</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.amber }}>{telecom?.prepaid_likely ? "PREPAID" : "POSTPAID"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2 — THREAT & VERIFICATION PORTS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
        {/* NCCRP */}
        <div className={`${cardClass} stat-card glass-card-accent-top`} style={{ padding: 18, textAlign: "center", "--accent": nccrp?.flagged ? T.red : T.green }}>
          <div style={{ fontSize: 9, color: T.text3, letterSpacing: 1, marginBottom: 8 }}>NCCRP STATUS</div>
          {nccrp?.flagged
            ? <div style={{ fontSize: 22 }}>🔴</div>
            : nccrp?.available === false
              ? <div style={{ fontSize: 22 }}>⚪</div>
              : <div style={{ fontSize: 22 }}>🟢</div>}
          <div style={{ fontSize: 10, fontWeight: 700, marginTop: 4, color: nccrp?.flagged ? T.red : T.text2, marginBottom: 6 }}>
            {nccrp?.flagged ? "FLAGGED" : "UNAVAILABLE"}
          </div>
          <a href={nccrp?.manual_url} target="_blank" rel="noreferrer" style={{ fontSize: 9, color: T.teal, textDecoration: "none" }}>Portal Check →</a>
        </div>
        {/* Risk score */}
        <div className={`${cardClass} stat-card glass-card-accent-top`} style={{ padding: 18, textAlign: "center", "--accent": riskC }}>
          <div className="stat-label">Risk Score</div>
          <div className="stat-value" style={{ color: riskC }}>{risk_score?.score ?? 0}</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: riskC }}>{risk_score?.level}</div>
        </div>
        {/* Fraud circle */}
        <div className={`${cardClass} stat-card glass-card-accent-top`} style={{ padding: 18, textAlign: "center", "--accent": mule_patterns?.high_fraud_circle ? T.red : T.green }}>
          <div className="stat-label">Fraud Circle</div>
          <div style={{ fontSize: 22 }}>{mule_patterns?.high_fraud_circle ? "🔴" : "🟢"}</div>
          <div style={{ fontSize: 10, fontWeight: 700, marginTop: 4, color: mule_patterns?.high_fraud_circle ? T.red : T.green }}>
            {mule_patterns?.high_fraud_circle ? "HIGH RISK AREA" : "NORMAL"}
          </div>
        </div>
        {/* Web complaints */}
        <div className={`${cardClass} stat-card glass-card-accent-top`} style={{ padding: 18, textAlign: "center", "--accent": fraudMentions.length > 0 ? T.red : T.green }}>
          <div className="stat-label">Web Complaints</div>
          <div className="stat-value" style={{ color: fraudMentions.length > 0 ? T.red : T.green }}>{fraudMentions.length}</div>
          <div style={{ fontSize: 10, color: T.text2 }}>fraud mentions</div>
        </div>
      </div>

      {/* SECTION 2b — OFFICIAL VERIFICATION PORTALS */}
      <div className={cardClass} style={{ padding: 24 }}>
        <SectionHeader icon="⚖️" title="Official Verification Registries" subtitle="Cross-reference target against Indian state resources" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 12 }}>
          <div className="glass-card stat-card" style={{ '--accent': T.blue, padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 6 }}>cybercrime.gov.in</div>
              <div style={{ fontSize: 10, color: T.text2, lineHeight: 1.4 }}>{data.nccrp_note}</div>
            </div>
            <a
              href={data.nccrp_check_url}
              target="_blank"
              rel="noopener noreferrer"
              className="action-btn"
              style={{ display: 'inline-block', textDecoration: 'none', marginTop: 12, fontSize: 10, padding: "8px 12px", textAlign: 'center' }}
            >
              Verify Cybercrime Portal ↗
            </a>
          </div>
          <div className="glass-card stat-card" style={{ '--accent': T.amber, padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 6 }}>Sanchar Saathi</div>
              <div style={{ fontSize: 10, color: T.text2, lineHeight: 1.4 }}>{data.tafcop_note}</div>
            </div>
            <a
              href={data.tafcop_check_url}
              target="_blank"
              rel="noopener noreferrer"
              className="action-btn"
              style={{ display: 'inline-block', textDecoration: 'none', marginTop: 12, fontSize: 10, padding: "8px 12px", textAlign: 'center' }}
            >
              Verify TAFCOP Mobile Connections ↗
            </a>
          </div>
        </div>
      </div>

      {/* SECTION 3 — UPI IDENTITY MAP */}
      <div className={cardClass} style={{ padding: 24 }}>
        <SectionHeader icon="💳" title="Probable Financial Identities" subtitle="Generated from phone number — verify before use" />
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
        <div className={cardClass} style={{ padding: 24 }}>
          <SectionHeader icon="🌐" title="Web Mentions" subtitle="Fraud complaints, business listings, general references" />
          <div className="filter-tab-bar">
            {[["all","All"],["fraud","Fraud"],["biz","Business"],["general","General"]].map(([tab, label]) => (
              <button key={tab} onClick={() => setMentionTab(tab)} className={`filter-tab ${mentionTab === tab ? "active" : ""}`}>{label}</button>
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
      <div className={`${cardClass} rec-banner`} style={{ padding: 24, borderLeft: `3px solid ${riskC}` }}>
        <SectionHeader icon="📋" title="Investigator Summary" subtitle="Automated risk assessment narrative" />
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
