import React from 'react';

export default function Header({ caseId }) {
  const [time, setTime] = React.useState(new Date());
  React.useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <header style={{
      background: 'var(--navy2)',
      borderBottom: '1px solid var(--border)',
      padding: '0 24px',
      height: 56,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {/* Left: Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          background: 'var(--gold)',
          color: 'var(--navy)',
          fontFamily: 'var(--head)',
          fontWeight: 700,
          fontSize: 13,
          padding: '4px 10px',
          borderRadius: 3,
          letterSpacing: '0.1em',
        }}>SOCMINT</div>
        <span style={{ fontFamily: 'var(--head)', fontWeight: 600, fontSize: 16, letterSpacing: '0.05em' }}>
          SHIELD
        </span>
        <span style={{ color: 'var(--text3)', fontSize: 12, fontFamily: 'var(--mono)' }}>
          | CID Karnataka
        </span>
      </div>

      {/* Center: Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px var(--green)' }} />
        <span className="mono" style={{ fontSize: 11, color: 'var(--text2)' }}>SYSTEM ONLINE</span>
      </div>

      {/* Right: Case ID + Time */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div className="mono" style={{ fontSize: 11, color: 'var(--text3)' }}>
          CASE: <span style={{ color: 'var(--gold)' }}>{caseId}</span>
        </div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--text2)' }}>
          {time.toUTCString().slice(0, 25)} UTC
        </div>
      </div>
    </header>
  );
}
