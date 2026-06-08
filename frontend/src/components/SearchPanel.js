import React, { useState } from 'react';

const INPUT_TYPES = [
  { key: 'username',  label: 'USERNAME',   placeholder: 'e.g. john_doe',             icon: '👤' },
  { key: 'real_name', label: 'REAL NAME',  placeholder: 'e.g. John Doe',             icon: '🪪' },
  { key: 'phone',     label: 'PHONE',      placeholder: 'e.g. +919876543210',        icon: '📱' },
  { key: 'email',     label: 'EMAIL',      placeholder: 'e.g. john@example.com',     icon: '✉️' },
];

export default function SearchPanel({ onSearch, loading }) {
  const [active, setActive] = useState('username');
  const [values, setValues] = useState({ username: '', real_name: '', phone: '', email: '' });

  const handleSubmit = () => {
    const query = {};
    if (values.username)  query.username  = values.username.trim();
    if (values.real_name) query.real_name = values.real_name.trim();
    if (values.phone)     query.phone     = values.phone.trim();
    if (values.email)     query.email     = values.email.trim();
    if (Object.keys(query).length === 0) return;
    onSearch(query);
  };

  const handleKey = (e) => { if (e.key === 'Enter') handleSubmit(); };

  return (
    <div className="panel" style={{ padding: '20px 24px', marginBottom: 24 }}>
      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ fontFamily: 'var(--head)', fontWeight: 700, fontSize: 18, letterSpacing: '0.05em' }}>
          IDENTITY SWEEP
        </span>
        <span className="mono dimmed" style={{ fontSize: 11 }}>// 20-platform parallel scan</span>
      </div>

      {/* Tab selector */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {INPUT_TYPES.map(t => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            style={{
              padding: '6px 14px',
              borderRadius: 4,
              border: `1px solid ${active === t.key ? 'var(--gold)' : 'var(--border)'}`,
              background: active === t.key ? 'rgba(200,169,81,0.12)' : 'transparent',
              color: active === t.key ? 'var(--gold)' : 'var(--text3)',
              fontFamily: 'var(--head)',
              fontWeight: 600,
              fontSize: 12,
              letterSpacing: '0.08em',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Active input */}
      {INPUT_TYPES.map(t => active === t.key && (
        <div key={t.key} style={{ display: 'flex', gap: 12 }}>
          <input
            className="input"
            placeholder={t.placeholder}
            value={values[t.key]}
            onChange={e => setValues(v => ({ ...v, [t.key]: e.target.value }))}
            onKeyDown={handleKey}
            autoFocus
          />
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={loading || !values[t.key].trim()}
            style={{ whiteSpace: 'nowrap', minWidth: 140 }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="spinner" style={{ width: 14, height: 14 }} /> SCANNING...
              </span>
            ) : '⚡ SWEEP NOW'}
          </button>
        </div>
      ))}

      {/* Optional extra fields */}
      <details style={{ marginTop: 12 }}>
        <summary style={{ color: 'var(--text3)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--mono)' }}>
          + Add more identifiers (optional)
        </summary>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 12 }}>
          {INPUT_TYPES.filter(t => t.key !== active).map(t => (
            <div key={t.key}>
              <label className="mono dimmed" style={{ fontSize: 10, display: 'block', marginBottom: 4 }}>{t.label}</label>
              <input
                className="input"
                placeholder={t.placeholder}
                value={values[t.key]}
                onChange={e => setValues(v => ({ ...v, [t.key]: e.target.value }))}
                onKeyDown={handleKey}
                style={{ fontSize: 12 }}
              />
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
