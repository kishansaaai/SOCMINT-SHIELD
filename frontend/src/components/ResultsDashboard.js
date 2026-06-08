import React, { useState } from 'react';

const PLATFORM_ICONS = {
  'GitHub':     '🐙', 'Reddit':     '🤖', 'YouTube':    '📺',
  'Twitter/X':  '🐦', 'Instagram':  '📸', 'TikTok':     '🎵',
  'LinkedIn':   '💼', 'Telegram':   '✈️', 'HackerNews': '🔶',
  'Dev.to':     '👨‍💻', 'GitLab':     '🦊', 'Tumblr':     '📝',
  'Pinterest':  '📌', 'Medium':     '✍️', 'Quora':      '❓',
  'Steam':      '🎮', 'Pastebin':   '📋', 'Flickr':     '📷',
  'SoundCloud': '🎧', 'Snapchat':   '👻',
};

const RISK_COLORS = {
  HIGH: 'var(--red)', MEDIUM: 'var(--amber)', LOW: 'var(--blue-acc)', MINIMAL: 'var(--green)'
};

export default function ResultsDashboard({ results, onReport, caseId }) {
  const [officerName, setOfficerName] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState(null);

  const found = results.platforms.filter(p => p.found);
  const notFound = results.platforms.filter(p => !p.found);
  const risk = results.risk_score || {};

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Stats Bar */}
      <StatsBar results={results} risk={risk} />

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
        {/* Left: Platform results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <PlatformGrid platforms={found} label="CONFIRMED IDENTITIES" found={true} onSelect={setSelectedPlatform} selected={selectedPlatform} />
          {notFound.length > 0 && (
            <PlatformGrid platforms={notFound} label="NOT FOUND" found={false} onSelect={setSelectedPlatform} selected={selectedPlatform} />
          )}
        </div>

        {/* Right: Risk + Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <RiskPanel risk={risk} />
          <ActionsPanel
            onGenerateReport={() => setShowReportModal(true)}
            caseId={caseId}
            elapsed={results.elapsed_seconds}
          />
          {selectedPlatform && <PlatformDetail platform={selectedPlatform} />}
        </div>
      </div>

      {/* Report modal */}
      {showReportModal && (
        <ReportModal
          onClose={() => setShowReportModal(false)}
          onGenerate={() => { onReport(officerName || 'Duty Officer'); setShowReportModal(false); }}
          officerName={officerName}
          setOfficerName={setOfficerName}
          caseId={caseId}
        />
      )}
    </div>
  );
}

function StatsBar({ results, risk }) {
  const stats = [
    { label: 'PLATFORMS FOUND', value: results.platforms_found, sub: `of ${results.platforms_checked} checked`, color: 'var(--green)' },
    { label: 'SCAN TIME', value: `${results.elapsed_seconds}s`, sub: 'parallel sweep', color: 'var(--cyan)' },
    { label: 'RISK SCORE', value: risk.score || 0, sub: risk.level || 'MINIMAL', color: RISK_COLORS[risk.level] || 'var(--green)' },
    { label: 'QUERY', value: results.query, sub: 'search identifier', color: 'var(--gold)', mono: true },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
      {stats.map(s => (
        <div key={s.label} className="panel" style={{ padding: '14px 16px' }}>
          <div className="mono dimmed" style={{ fontSize: 10, letterSpacing: '0.1em', marginBottom: 6 }}>{s.label}</div>
          <div className={s.mono ? 'mono' : 'head'} style={{ fontSize: s.mono ? 13 : 26, fontWeight: 700, color: s.color, marginBottom: 2 }}>
            {s.value}
          </div>
          <div className="dimmed" style={{ fontSize: 11 }}>{s.sub}</div>
        </div>
      ))}
    </div>
  );
}

function PlatformGrid({ platforms, label, found, onSelect, selected }) {
  if (platforms.length === 0) return null;
  return (
    <div className="panel" style={{ padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span className="mono" style={{ fontSize: 11, color: found ? 'var(--green)' : 'var(--text3)', letterSpacing: '0.08em' }}>
          {found ? '▸' : '▹'} {label}
        </span>
        <span className={`tag ${found ? 'tag-found' : 'tag-miss'}`}>{platforms.length}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
        {platforms.map(p => (
          <PlatformCard key={p.platform} platform={p} found={found} onSelect={onSelect} selected={selected?.platform === p.platform} />
        ))}
      </div>
    </div>
  );
}

function PlatformCard({ platform, found, onSelect, selected }) {
  return (
    <div
      onClick={() => found && onSelect(selected ? null : platform)}
      style={{
        background: selected ? 'rgba(200,169,81,0.08)' : found ? 'var(--navy2)' : 'var(--navy)',
        border: `1px solid ${selected ? 'var(--gold)' : found ? 'var(--border2)' : 'var(--border)'}`,
        borderRadius: 5,
        padding: '10px 12px',
        cursor: found ? 'pointer' : 'default',
        transition: 'all 0.15s',
        opacity: found ? 1 : 0.5,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: found ? 6 : 0 }}>
        <span style={{ fontSize: 16 }}>{PLATFORM_ICONS[platform.platform] || '🌐'}</span>
        <span style={{ fontFamily: 'var(--head)', fontWeight: 600, fontSize: 13, flex: 1 }}>
          {platform.platform}
        </span>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: found ? 'var(--green)' : 'var(--text3)', flexShrink: 0 }} />
      </div>
      {found && (
        <>
          {platform.display_name && (
            <div className="mono" style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {platform.display_name}
            </div>
          )}
          {platform.bio && (
            <div style={{ fontSize: 11, color: 'var(--text3)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {platform.bio}
            </div>
          )}
          {platform.url && (
            <a href={platform.url} target="_blank" rel="noreferrer"
               style={{ fontSize: 10, color: 'var(--gold)', fontFamily: 'var(--mono)', marginTop: 4, display: 'block' }}
               onClick={e => e.stopPropagation()}>
              → View Profile
            </a>
          )}
        </>
      )}
    </div>
  );
}

function RiskPanel({ risk }) {
  const level = risk.level || 'MINIMAL';
  const score = risk.score || 0;
  const riskColor = RISK_COLORS[level] || 'var(--green)';
  const breakdown = risk.breakdown || {};

  return (
    <div className="panel" style={{ padding: '16px', borderColor: riskColor }}>
      <div className="mono dimmed" style={{ fontSize: 10, letterSpacing: '0.1em', marginBottom: 12 }}>▸ AI RISK ASSESSMENT</div>

      {/* Score circle */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{
          display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          width: 96, height: 96, borderRadius: '50%',
          border: `3px solid ${riskColor}`,
          boxShadow: `0 0 20px ${riskColor}40`,
        }}>
          <div className="head" style={{ fontSize: 32, fontWeight: 700, color: riskColor, lineHeight: 1 }}>{score}</div>
          <div className="mono" style={{ fontSize: 9, color: riskColor }}>/100</div>
        </div>
        <div className={`tag tag-${level.toLowerCase()}`} style={{ marginTop: 8 }}>{level} RISK</div>
      </div>

      {/* Breakdown bars */}
      {Object.entries(breakdown).map(([key, val]) => (
        <div key={key} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span className="mono" style={{ fontSize: 10, color: 'var(--text3)' }}>{key.replace(/_/g,' ').toUpperCase()}</span>
            <span className="mono" style={{ fontSize: 10, color: 'var(--text2)' }}>{val}/20</span>
          </div>
          <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
            <div style={{ height: 4, width: `${(val/20)*100}%`, background: riskColor, borderRadius: 2, transition: 'width 0.6s ease' }} />
          </div>
        </div>
      ))}

      {/* Signals */}
      {risk.signals?.length > 0 && (
        <div style={{ marginTop: 12, padding: '10px', background: 'var(--navy2)', borderRadius: 4 }}>
          <div className="mono dimmed" style={{ fontSize: 10, marginBottom: 6 }}>SIGNALS DETECTED</div>
          {risk.signals.map((s, i) => (
            <div key={i} style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 3 }}>• {s}</div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 12, padding: '8px 10px', background: 'rgba(200,169,81,0.06)', border: '1px solid rgba(200,169,81,0.2)', borderRadius: 4 }}>
        <div style={{ fontSize: 11, color: 'var(--text2)' }}>{risk.recommendation}</div>
      </div>
    </div>
  );
}

function ActionsPanel({ onGenerateReport, caseId, elapsed }) {
  return (
    <div className="panel" style={{ padding: '16px' }}>
      <div className="mono dimmed" style={{ fontSize: 10, letterSpacing: '0.1em', marginBottom: 12 }}>▸ ACTIONS</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button className="btn btn-primary" onClick={onGenerateReport} style={{ width: '100%' }}>
          📄 Generate Section 65B Report
        </button>
        <div className="mono" style={{ fontSize: 10, color: 'var(--text3)', textAlign: 'center' }}>
          Court-admissible PDF with SHA-256 hash
        </div>
      </div>
    </div>
  );
}

function PlatformDetail({ platform }) {
  return (
    <div className="panel" style={{ padding: '16px', borderColor: 'var(--gold)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 20 }}>{PLATFORM_ICONS[platform.platform] || '🌐'}</span>
        <span className="head" style={{ fontSize: 16, fontWeight: 700 }}>{platform.platform}</span>
      </div>
      {[
        ['URL', platform.url],
        ['Display Name', platform.display_name],
        ['Bio', platform.bio],
        ['Location', platform.location],
        ['Followers', platform.followers],
        ['Created', platform.created_at?.slice(0,10)],
        ['Karma', platform.karma],
        ['Repos', platform.public_repos],
      ].filter(([,v]) => v).map(([k,v]) => (
        <div key={k} style={{ marginBottom: 8 }}>
          <div className="mono dimmed" style={{ fontSize: 10 }}>{k.toUpperCase()}</div>
          <div style={{ fontSize: 12, color: 'var(--text)', wordBreak: 'break-all' }}>
            {k === 'URL' ? <a href={v} target="_blank" rel="noreferrer" style={{ color: 'var(--gold)' }}>{v}</a> : String(v)}
          </div>
        </div>
      ))}
      {platform.posts?.length > 0 && (
        <>
          <div className="mono dimmed" style={{ fontSize: 10, marginTop: 8, marginBottom: 6 }}>
            RECENT {(platform.post_label || 'posts').toUpperCase()}
          </div>
          {platform.posts.slice(0,3).map((p,i) => (
            <div key={i} style={{ fontSize: 11, padding: '6px 8px', background: 'var(--navy2)', borderRadius: 3, marginBottom: 4 }}>
              <div style={{ color: 'var(--text2)', marginBottom: 2 }}>{p.title || p.name}</div>
              {p.url && <a href={p.url} target="_blank" rel="noreferrer" style={{ color: 'var(--gold)', fontSize: 10, fontFamily: 'var(--mono)' }}>→ open</a>}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function ReportModal({ onClose, onGenerate, officerName, setOfficerName, caseId }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div className="panel" style={{ padding: 28, width: 440, borderColor: 'var(--gold)' }} onClick={e => e.stopPropagation()}>
        <div className="head" style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Generate Section 65B Report</div>
        <div className="mono dimmed" style={{ fontSize: 11, marginBottom: 20 }}>Court-admissible evidence package with SHA-256 hash</div>

        <div style={{ marginBottom: 16 }}>
          <label className="mono dimmed" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>CASE ID</label>
          <div className="mono" style={{ fontSize: 13, color: 'var(--gold)', padding: '8px 12px', background: 'var(--navy2)', borderRadius: 4 }}>{caseId}</div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label className="mono dimmed" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>OFFICER NAME</label>
          <input
            className="input"
            placeholder="Enter your name for the certificate"
            value={officerName}
            onChange={e => setOfficerName(e.target.value)}
            autoFocus
          />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" onClick={onGenerate} style={{ flex: 1 }}>
            📄 Download PDF
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
