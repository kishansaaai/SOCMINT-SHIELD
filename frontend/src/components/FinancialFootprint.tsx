// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { API_BASE, getHeaders } from '../config';

export default function FinancialFootprint({ profileData }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUpi() {
      try {
        const res = await fetch(`${API_BASE}/api/upi-search`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ query: profileData.query, phone: profileData.phone || null })
        });
        const result = await res.json();
        setData(result);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchUpi();
  }, [profileData]);

  if (loading) {
    return (
      <div className="glass-card" style={{ padding: 32, textAlign: 'center' }}>
        <div className="mono" style={{ color: '#63cab7', fontSize: 13, animation: 'pulse 1.5s infinite' }}>
          Tracing financial signatures…
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="glass-card" style={{ padding: 32, textAlign: 'center', color: '#ef4444' }}>
        Failed to trace financial footprint.
      </div>
    );
  }

  return (
    <div className="glass-card" style={{ padding: 24 }}>
      <div className="section-header">
        <div className="section-header-icon">💳</div>
        <div>
          <div className="section-header-title">UPI & Virtual Payment Addresses</div>
          <div className="section-header-sub">Probable financial identities linked to target</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div className="glass-card stat-card" style={{ '--accent': '#3b82f6' }}>
          <div className="stat-label">VPAs Generated</div>
          <div className="stat-value" style={{ color: '#f1f5f9' }}>{data.searched_vpas}</div>
        </div>
        <div className="glass-card stat-card" style={{ '--accent': '#22c55e' }}>
          <div className="stat-label">Active Found</div>
          <div className="stat-value" style={{ color: '#22c55e' }}>{data.found_active}</div>
        </div>
      </div>

      {data.vpas.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {data.vpas.map((vpa, i) => (
            <div
              key={i}
              className="glass-card glass-card-interactive"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 18px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(99,202,183,0.15))',
                  border: '1px solid rgba(99,202,183,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18,
                }}>🏦</div>
                <div>
                  <div className="mono" style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 600 }}>{vpa.vpa}</div>
                  <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>{vpa.provider}</div>
                </div>
              </div>
              <span className="data-chip" style={{
                background: vpa.risk_indicator === 'High' ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
                color: vpa.risk_indicator === 'High' ? '#f87171' : '#4ade80',
                borderColor: vpa.risk_indicator === 'High' ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)',
                fontWeight: 600,
              }}>
                {vpa.status}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card" style={{ padding: 20, textAlign: 'center', color: '#64748b', fontSize: 13, lineHeight: 1.6 }}>
          No active financial footprints or UPI IDs linked directly to this identifier were discovered.
        </div>
      )}
    </div>
  );
}
