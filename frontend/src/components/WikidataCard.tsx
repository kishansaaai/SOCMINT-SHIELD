// @ts-nocheck
import React from 'react';
import { motion } from 'framer-motion';

interface WikidataCardProps {
  wikidata: {
    found: boolean;
    id: string | null;
    label: string | null;
    description: string | null;
    aliases: string[];
    dob: string | null;
    nationality: string | null;
    occupation: string | null;
    socials: Record<string, string>;
  };
}

const SOCIAL_PLATFORM_LINKS = {
  twitter: (username: string) => `https://twitter.com/${username}`,
  instagram: (username: string) => `https://instagram.com/${username}`,
  facebook: (username: string) => `https://facebook.com/${username}`,
  youtube: (channel: string) => `https://youtube.com/${channel.startsWith('UC') ? 'channel/' + channel : 'c/' + channel}`,
  tiktok: (username: string) => `https://tiktok.com/@${username}`,
  linkedin: (username: string) => `https://linkedin.com/in/${username}`,
  telegram: (username: string) => `https://t.me/${username}`,
};

const SOCIAL_ICONS = {
  twitter: "𝕏",
  instagram: "📸",
  facebook: "📘",
  youtube: "▶️",
  tiktok: "🎵",
  linkedin: "💼",
  telegram: "✈️",
};

export default function WikidataCard({ wikidata }: WikidataCardProps) {
  if (!wikidata || !wikidata.found) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-card"
      style={{ padding: 24, marginBottom: 24 }}
    >
      <div className="section-header">
        <div className="section-header-icon">🌐</div>
        <div>
          <div className="section-header-title">Wikidata Identity Profile</div>
          <div className="section-header-sub">Structured public registry correlation</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className="glass-card stat-card" style={{ '--accent': '#63cab7', padding: '12px 16px' }}>
          <div className="stat-label">Entity ID</div>
          <div className="stat-value" style={{ color: '#63cab7', fontFamily: 'IBM Plex Mono', fontSize: 18 }}>
            <a
              href={`https://www.wikidata.org/wiki/${wikidata.id}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#63cab7', textDecoration: 'none' }}
            >
              {wikidata.id} ↗
            </a>
          </div>
        </div>
        <div className="glass-card stat-card" style={{ '--accent': '#3b82f6', padding: '12px 16px' }}>
          <div className="stat-label">Citizen Registry</div>
          <div className="stat-value" style={{ color: '#f1f5f9', fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {wikidata.nationality || "Unknown"}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: 12 }}>
          <div className="mono" style={{ color: '#64748b', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Official Label</div>
          <div style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 700, marginTop: 4 }}>{wikidata.label}</div>
        </div>

        {wikidata.description && (
          <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: 12 }}>
            <div className="mono" style={{ color: '#64748b', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Description</div>
            <div style={{ color: '#e2e8f0', fontSize: 13, lineHeight: 1.5, marginTop: 4 }}>{wikidata.description}</div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: 12 }}>
          <div>
            <div className="mono" style={{ color: '#64748b', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Date of Birth</div>
            <div className="mono" style={{ color: '#e2e8f0', fontSize: 13, marginTop: 4 }}>{wikidata.dob || "N/A"}</div>
          </div>
          <div>
            <div className="mono" style={{ color: '#64748b', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Occupation</div>
            <div style={{ color: '#e2e8f0', fontSize: 13, marginTop: 4 }}>{wikidata.occupation || "N/A"}</div>
          </div>
        </div>

        {wikidata.aliases && wikidata.aliases.length > 0 && (
          <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: 12 }}>
            <div className="mono" style={{ color: '#64748b', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Known Aliases / Alternate Spellings</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {wikidata.aliases.map((alias, i) => (
                <span
                  key={i}
                  className="data-chip"
                  style={{
                    background: 'rgba(99, 202, 183, 0.06)',
                    color: '#63cab7',
                    borderColor: 'rgba(99, 202, 183, 0.2)',
                    fontSize: 11,
                  }}
                >
                  {alias}
                </span>
              ))}
            </div>
          </div>
        )}

        {wikidata.socials && Object.keys(wikidata.socials).length > 0 && (
          <div>
            <div className="mono" style={{ color: '#64748b', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Linked Social Accounts</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {Object.entries(wikidata.socials).map(([platform, handle]) => {
                const getLink = SOCIAL_PLATFORM_LINKS[platform];
                const icon = SOCIAL_ICONS[platform] || "👤";
                return (
                  <a
                    key={platform}
                    href={getLink ? getLink(handle) : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="data-chip data-chip-interactive"
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      color: '#f1f5f9',
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                      padding: '6px 12px',
                    }}
                  >
                    <span>{icon}</span>
                    <span className="mono" style={{ fontWeight: 600 }}>{platform.toUpperCase()}:</span>
                    <span className="mono">{handle}</span>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
