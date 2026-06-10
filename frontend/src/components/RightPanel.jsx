import { useState } from 'react'
import { motion } from 'framer-motion'
import { PLATFORMS } from '../utils/platformConfig'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const panel = { background:'rgba(2,8,23,0.9)', border:'1px solid rgba(0,255,255,0.22)', backdropFilter:'blur(14px)', borderRadius:3 }

const RISK_C = { HIGH:'#ef4444', MEDIUM:'#f59e0b', LOW:'#3b82f6', MINIMAL:'#00ffff' }

export default function RightPanel({ results, activePlatforms, isScanning }) {
  const [officer, setOfficer] = useState('')
  const [caseId, setCaseId]   = useState('')
  const [loading, setLoading] = useState(false)

  const risk    = results?.risk_score
  const riskC   = RISK_C[risk?.level] || '#00ffff'
  const found   = activePlatforms.filter(p => p.found).length
  const statusMap = {}
  activePlatforms.forEach(p => { statusMap[p.platform] = p })

  const handleReport = async () => {
    if (!results || !officer || !caseId) return
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/report`, { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ profile_data:results, officer_name:officer, case_id:caseId }) })
      const d = await res.json()
      const bytes = Uint8Array.from(atob(d.pdf_base64), c => c.charCodeAt(0))
      const url = URL.createObjectURL(new Blob([bytes], { type:'application/pdf' }))
      const a = document.createElement('a'); a.href=url; a.download=d.filename; a.click()
      URL.revokeObjectURL(url)
    } catch(e) { alert(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ ...panel, width:'100%', height:'100%', display:'flex', flexDirection:'column', padding:'14px 12px', overflowY:'auto' }}>
      {/* THREAT LEVEL */}
      <div style={{ fontSize:8, color:'rgba(0,255,255,0.45)', letterSpacing:2, marginBottom:8 }}>◈ THREAT LEVEL</div>
      {risk ? (
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:64, fontWeight:700, color:riskC, textShadow:`0 0 30px ${riskC}`, fontFamily:'IBM Plex Mono', lineHeight:1 }}>{risk.score}</div>
          <div style={{ fontSize:12, color:riskC, letterSpacing:3, marginTop:4 }}>{risk.level} RISK</div>
          <div style={{ height:3, background:'rgba(0,255,255,0.1)', borderRadius:2, marginTop:8 }}>
            <motion.div initial={{ width:0 }} animate={{ width:`${risk.score}%` }} transition={{ duration:1.2, ease:'easeOut' }}
              style={{ height:'100%', background:riskC, borderRadius:2, boxShadow:`0 0 8px ${riskC}` }} />
          </div>
          <div style={{ fontSize:9, color:'rgba(255,255,255,0.4)', marginTop:6, lineHeight:1.6 }}>{risk.recommendation}</div>
          {risk.signals?.map((s,i) => (
            <div key={i} style={{ marginTop:4, fontSize:8, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:2, padding:'2px 7px', color:'#fca5a5' }}>⚠ {s}</div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize:10, color:'rgba(0,255,255,0.25)', marginBottom:14 }}>AWAITING SCAN...</div>
      )}

      <div style={{ height:1, background:'rgba(0,255,255,0.1)', marginBottom:10 }} />

      {/* PLATFORM SWEEP */}
      <div style={{ fontSize:8, color:'rgba(0,255,255,0.45)', letterSpacing:2, marginBottom:8 }}>
        ◈ PLATFORM SWEEP {isScanning ? `(${activePlatforms.length}/20)` : results ? `(${found} FOUND)` : ''}
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:2, marginBottom:14, maxHeight:220, overflowY:'auto' }}>
        {PLATFORMS.map(plat => {
          const p = statusMap[plat.name]
          const scanning = isScanning && !p
          return (
            <motion.div key={plat.id} initial={{ opacity:0 }} animate={{ opacity:1 }}
              style={{ display:'flex', alignItems:'center', gap:7, padding:'4px 6px', borderRadius:2,
                borderLeft: p ? `2px solid ${plat.color}` : '2px solid transparent',
                background: p?.found ? `${plat.color}0a` : 'transparent' }}>
              <span style={{ fontSize:12, width:18 }}>{plat.icon}</span>
              <span style={{ flex:1, fontSize:9, letterSpacing:1, color: p ? '#e2e8f0' : 'rgba(255,255,255,0.25)' }}>
                {plat.name.toUpperCase().slice(0,10)}
              </span>
              {scanning && <span style={{ fontSize:8, color:'rgba(0,255,255,0.4)' }}>SCAN<span className="blink">_</span></span>}
              {p && <span style={{ fontSize:8, color: p.found ? '#22c55e' : '#374151', letterSpacing:1 }}>{p.found ? '● ACQUIRED' : '○ NO TRACE'}</span>}
              {!p && !isScanning && <span style={{ fontSize:8, color:'rgba(255,255,255,0.12)' }}>—</span>}
            </motion.div>
          )
        })}
      </div>

      {/* SIGINT FEED */}
      {results?.timeline?.length > 0 && (
        <>
          <div style={{ height:1, background:'rgba(0,255,255,0.1)', marginBottom:10 }} />
          <div style={{ fontSize:8, color:'rgba(0,255,255,0.45)', letterSpacing:2, marginBottom:6 }}>◈ SIGINT FEED</div>
          <div style={{ maxHeight:120, overflowY:'auto', display:'flex', flexDirection:'column', gap:3 }}>
            {results.timeline.map((item,i) => (
              <div key={i} style={{ display:'flex', gap:6, fontSize:9 }}>
                <span style={{ color:'#00ffff', background:'rgba(0,255,255,0.1)', padding:'1px 4px', borderRadius:2, fontSize:8, whiteSpace:'nowrap' }}>{item.platform?.slice(0,4).toUpperCase()}</span>
                <span style={{ color:'#64748b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>
                  {item.url
                    ? <a href={item.url} target="_blank" rel="noreferrer" style={{ color:'#93c5fd', textDecoration:'none' }}>{(item.title||'untitled').slice(0,40)}</a>
                    : (item.title||'untitled').slice(0,40)
                  }
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ flex:1 }} />

      {/* 65B REPORT */}
      <div style={{ padding:'10px', border:'1px solid rgba(255,102,0,0.35)', background:'rgba(255,102,0,0.04)', borderRadius:3, marginTop:10 }}>
        <div style={{ fontSize:8, color:'#ff6600', letterSpacing:2, marginBottom:8 }}>◈ SECTION 65B REPORT</div>
        <input value={officer} onChange={e => setOfficer(e.target.value)} placeholder="OFFICER NAME" className="neon-input"
          style={{ width:'100%', padding:'6px 9px', fontSize:9, marginBottom:5, borderRadius:2, borderColor:'rgba(255,102,0,0.4)', color:'#ff6600' }} />
        <input value={caseId} onChange={e => setCaseId(e.target.value)} placeholder="CASE ID" className="neon-input"
          style={{ width:'100%', padding:'6px 9px', fontSize:9, marginBottom:7, borderRadius:2, borderColor:'rgba(255,102,0,0.4)', color:'#ff6600' }} />
        <button onClick={handleReport} disabled={loading||!results||!officer||!caseId}
          style={{ width:'100%', padding:'8px 0', fontSize:10, letterSpacing:2,
            background:'linear-gradient(135deg,rgba(255,102,0,0.18),rgba(220,38,38,0.18))',
            border:'1px solid rgba(255,102,0,0.55)', color:'#ff6600', fontFamily:'IBM Plex Mono',
            cursor:'pointer', borderRadius:2, opacity:(!results||!officer||!caseId)?0.35:1 }}>
          {loading ? 'GENERATING...' : '⬇ GENERATE 65B REPORT'}
        </button>
      </div>
    </div>
  )
}
