import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PLATFORMS } from '../utils/platformConfig'

const MODES = [
  { key:'username',  label:'USERNAME'  },
  { key:'real_name', label:'REAL NAME' },
  { key:'phone',     label:'PHONE'     },
  { key:'email',     label:'EMAIL'     },
]

function Clock() {
  const [t, setT] = useState(new Date())
  useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id) }, [])
  const ist = new Date(t.getTime() + 5.5*3600000)
  const p = n => String(n).padStart(2,'0')
  return `${p(ist.getUTCHours())}:${p(ist.getUTCMinutes())}:${p(ist.getUTCSeconds())} IST`
}

const panel = { background:'rgba(2,8,23,0.9)', border:'1px solid rgba(0,255,255,0.22)', backdropFilter:'blur(14px)', borderRadius:3 }

export default function LeftPanel({ mode, setMode, input, setInput, onScan, isScanning, results, lastScan, scanLog }) {
  const [glitch, setGlitch] = useState(false)
  const logRef = useRef()

  useEffect(() => {
    const s = () => setTimeout(() => { setGlitch(true); setTimeout(() => setGlitch(false), 300); s() }, 12000 + Math.random()*18000)
    s()
  }, [])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [scanLog])

  return (
    <div style={{ ...panel, width:'100%', height:'100%', display:'flex', flexDirection:'column', padding:'16px 14px', overflowY:'auto' }}>
      {/* Header */}
      <div style={{ marginBottom:16 }}>
        <div className={glitch ? 'glitch' : ''} style={{ fontSize:15, fontWeight:700, letterSpacing:4, color:'#00ffff', textShadow:'0 0 14px rgba(0,255,255,0.9)' }}>
          ◈ SOCMINT SHIELD
        </div>
        <div style={{ fontSize:8, color:'rgba(0,255,255,0.4)', letterSpacing:2, marginTop:2 }}>KARNATAKA CID · CYBER INTELLIGENCE</div>
        <div style={{ fontSize:11, color:'rgba(0,255,255,0.65)', marginTop:6 }}><Clock /></div>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:5 }}>
          <div style={{ width:7, height:7, borderRadius:'50%', background:'#00ff88', boxShadow:'0 0 6px #00ff88', animation:'pulse-g 2s infinite' }} />
          <span style={{ fontSize:9, color:'#00ff88', letterSpacing:2 }}>SYSTEM ONLINE</span>
        </div>
      </div>

      <div style={{ height:1, background:'rgba(0,255,255,0.12)', marginBottom:14 }} />

      {/* Modes */}
      <div style={{ fontSize:8, color:'rgba(0,255,255,0.4)', letterSpacing:2, marginBottom:8 }}>◈ SEARCH MODE</div>
      <div style={{ display:'flex', flexDirection:'column', gap:2, marginBottom:14 }}>
        {MODES.map(m => (
          <button key={m.key} onClick={() => setMode(m.key)} style={{
            padding:'6px 12px', textAlign:'left', border:'none', cursor:'pointer',
            fontFamily:'IBM Plex Mono', fontSize:10, letterSpacing:2,
            background: mode===m.key ? 'rgba(0,255,255,0.16)' : 'transparent',
            color: mode===m.key ? '#00ffff' : 'rgba(0,255,255,0.32)',
            borderLeft: mode===m.key ? '2px solid #00ffff' : '2px solid transparent',
          }}>{m.label}</button>
        ))}
      </div>

      <div style={{ height:1, background:'rgba(0,255,255,0.1)', marginBottom:14 }} />

      {/* Input */}
      <div style={{ fontSize:8, color:'rgba(0,255,255,0.4)', letterSpacing:2, marginBottom:7 }}>◈ TARGET IDENTIFIER</div>
      <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key==='Enter' && onScan()}
        placeholder="ENTER TARGET..." disabled={isScanning} className="neon-input"
        style={{ width:'100%', padding:'9px 11px', fontSize:12, borderRadius:2, marginBottom:8, letterSpacing:1 }} />
      <button onClick={onScan} disabled={isScanning || !input.trim()} className="neon-btn"
        style={{ width:'100%', padding:'10px 0', fontSize:11, letterSpacing:3, borderRadius:2, marginBottom:6 }}>
        {isScanning ? <span>◈ SCANNING<span className="blink">_</span></span> : '◈ INITIATE SCAN'}
      </button>
      <button onClick={() => { setMode('username'); setInput('torvalds') }}
        style={{ width:'100%', padding:'5px 0', fontSize:9, letterSpacing:2, background:'transparent', border:'1px solid rgba(0,255,255,0.18)', color:'rgba(0,255,255,0.4)', fontFamily:'IBM Plex Mono', cursor:'pointer', borderRadius:2 }}>
        [ LOAD DEMO: torvalds ]
      </button>

      {/* Scan log */}
      {scanLog?.length > 0 && (
        <>
          <div style={{ height:1, background:'rgba(0,255,255,0.1)', margin:'14px 0 8px' }} />
          <div style={{ fontSize:8, color:'rgba(0,255,255,0.4)', letterSpacing:2, marginBottom:6 }}>◈ SCAN LOG</div>
          <div ref={logRef} style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:2, maxHeight:180 }}>
            {scanLog.map((entry, i) => (
              <motion.div key={i} initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }}
                style={{ fontSize:9, fontFamily:'IBM Plex Mono', display:'flex', gap:6 }}>
                <span style={{ color:'rgba(0,255,255,0.3)' }}>[{entry.ts}]</span>
                <span style={{ color: entry.found ? '#00ffff' : '#374151' }}>{entry.platform.toUpperCase().slice(0,8).padEnd(8)}</span>
                <span style={{ color: entry.found ? '#22c55e' : '#6b7280' }}>{entry.found ? 'ACQUIRED' : 'NO TRACE'}</span>
              </motion.div>
            ))}
          </div>
        </>
      )}

      {/* Beam legend */}
      {results && (
        <>
          <div style={{ height:1, background:'rgba(0,255,255,0.1)', margin:'10px 0 8px' }} />
          <div style={{ fontSize:8, color:'rgba(0,255,255,0.4)', letterSpacing:2, marginBottom:6 }}>◈ BEAM LEGEND</div>
          <div style={{ display:'flex', flexDirection:'column', gap:3, maxHeight:120, overflowY:'auto' }}>
            {PLATFORMS.slice(0,10).map(p => (
              <div key={p.id} style={{ display:'flex', alignItems:'center', gap:6, fontSize:9 }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:p.color, boxShadow:`0 0 4px ${p.color}` }} />
                <span style={{ color:'rgba(255,255,255,0.5)' }}>{p.name}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ flex:1 }} />

      {/* Status */}
      <div style={{ height:1, background:'rgba(0,255,255,0.1)', margin:'12px 0 8px' }} />
      {[['PLATFORMS','20'],['LAST SCAN', lastScan||'—'],['STATUS', isScanning?'SCANNING':results?'COMPLETE':'STANDBY']].map(([k,v]) => (
        <div key={k} style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
          <span style={{ fontSize:8, color:'rgba(0,255,255,0.3)', letterSpacing:1 }}>{k}</span>
          <span style={{ fontSize:8, color: isScanning&&k==='STATUS'?'#f59e0b':results&&k==='STATUS'?'#00ffff':'rgba(0,255,255,0.5)', letterSpacing:1 }}>{v}</span>
        </div>
      ))}
    </div>
  )
}
