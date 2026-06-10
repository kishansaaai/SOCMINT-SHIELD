import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const LINES = [
  'Initialising surveillance matrix...',
  'Loading urban intelligence grid...',
  'Establishing secure connection...',
  'Calibrating threat detection systems...',
  'Mapping Bangalore cityscape...',
  'SOCMINT SHIELD online.',
]

export default function LoadingScreen({ onDone }) {
  const [line, setLine]   = useState(0)
  const [progress, setProg] = useState(0)
  const [done, setDone]   = useState(false)

  useEffect(() => {
    const iv = setInterval(() => {
      setProg(p => {
        const next = p + 2
        if (next >= 100) { clearInterval(iv); setTimeout(() => { setDone(true); setTimeout(onDone, 600) }, 300); return 100 }
        if (next % 17 === 0) setLine(l => Math.min(l+1, LINES.length-1))
        return next
      })
    }, 40)
    return () => clearInterval(iv)
  }, [onDone])

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          style={{
            position:'fixed', inset:0, background:'#020817',
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            zIndex:9999, fontFamily:'IBM Plex Mono, monospace',
          }}
        >
          {/* Scanlines */}
          <div style={{ position:'absolute', inset:0, background:'repeating-linear-gradient(transparent,transparent 2px,rgba(0,255,255,0.015) 2px,rgba(0,255,255,0.015) 4px)', pointerEvents:'none' }} />

          <motion.div initial={{ opacity:0, y:-20 }} animate={{ opacity:1, y:0 }} style={{ fontSize:36, fontWeight:700, letterSpacing:6, color:'#00ffff', textShadow:'0 0 30px rgba(0,255,255,0.9)', marginBottom:8 }}>
            SOCMINT SHIELD
          </motion.div>
          <div style={{ fontSize:11, letterSpacing:3, color:'rgba(0,255,255,0.5)', marginBottom:48 }}>
            KARNATAKA CID CYBER INTELLIGENCE PLATFORM
          </div>

          {/* Progress bar */}
          <div style={{ width:340, height:3, background:'rgba(0,255,255,0.1)', borderRadius:2, marginBottom:16, overflow:'hidden' }}>
            <motion.div style={{ height:'100%', background:'#00ffff', boxShadow:'0 0 10px rgba(0,255,255,0.8)', borderRadius:2, width:`${progress}%` }} />
          </div>
          <div style={{ fontSize:11, color:'rgba(0,255,255,0.6)', letterSpacing:1, height:16 }}>
            {LINES[line]}
          </div>
          <div style={{ marginTop:8, fontSize:9, color:'rgba(0,255,255,0.3)', letterSpacing:2 }}>
            {progress}%
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
