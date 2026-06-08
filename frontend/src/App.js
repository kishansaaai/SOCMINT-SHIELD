import React, { useState } from 'react';
import SearchPanel from './components/SearchPanel';
import ResultsDashboard from './components/ResultsDashboard';
import Header from './components/Header';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

export default function App() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [caseId] = useState(() => `KA-CID-${Date.now().toString(36).toUpperCase()}`);

  const handleSearch = async (query) => {
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(query),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setResults(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReport = async (officerName) => {
    if (!results) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_data: results,
          officer_name: officerName,
          case_id: caseId,
        }),
      });
      const data = await res.json();
      // Download PDF
      const bytes = Uint8Array.from(atob(data.pdf_base64), c => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = data.filename; a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Report generation failed: ' + e.message);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header caseId={caseId} />
      <main style={{ flex: 1, maxWidth: 1280, margin: '0 auto', width: '100%', padding: '24px 20px' }}>
        <SearchPanel onSearch={handleSearch} loading={loading} />
        {error && (
          <div className="panel" style={{ padding: '16px', marginTop: 20, borderColor: 'var(--red)', color: 'var(--red)' }}>
            ⚠ {error}
          </div>
        )}
        {loading && <LoadingState />}
        {results && !loading && (
          <ResultsDashboard results={results} onReport={handleReport} caseId={caseId} />
        )}
        {!results && !loading && !error && <EmptyState />}
      </main>
    </div>
  );
}

function LoadingState() {
  const steps = [
    'Initializing identity sweep...',
    'Querying GitHub, Reddit, YouTube...',
    'Checking Instagram, Twitter/X, TikTok...',
    'Scanning HackerNews, Dev.to, GitLab...',
    'Running AI risk analysis...',
    'Aggregating intelligence report...',
  ];
  const [step, setStep] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setStep(s => (s + 1) % steps.length), 900);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ width: 56, height: 56, margin: '0 auto', border: '3px solid var(--border)', borderTopColor: 'var(--gold)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
      <div className="mono gold" style={{ fontSize: 13, marginBottom: 8 }}>
        ● {steps[step]}
      </div>
      <div className="dimmed" style={{ fontSize: 12 }}>Scanning 20 platforms simultaneously</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px', opacity: 0.5 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
      <div className="head" style={{ fontSize: 20, color: 'var(--text2)', marginBottom: 8 }}>
        Enter a username, name, phone, or email to begin
      </div>
      <div className="dimmed mono" style={{ fontSize: 12 }}>
        SOCMINT Shield — 20-platform sweep in under 60 seconds
      </div>
    </div>
  );
}
