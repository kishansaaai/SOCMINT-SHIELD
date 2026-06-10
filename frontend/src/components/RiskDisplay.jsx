import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

const LEVEL_COLORS = {
  HIGH:    { color: '#ef4444', glow: 'rgba(239,68,68,0.6)'  },
  MEDIUM:  { color: '#f59e0b', glow: 'rgba(245,158,11,0.6)' },
  LOW:     { color: '#3b82f6', glow: 'rgba(59,130,246,0.6)' },
  MINIMAL: { color: '#00ffff', glow: 'rgba(0,255,255,0.6)'  },
}

export default function RiskDisplay({ risk }) {
  const [count, setCount] = useState(0)
  const target = risk?.score ?? 0
  const level  = risk?.level ?? 'MINIMAL'
  const { color, glow } = LEVEL_COLORS[level] || LEVEL_COLORS.MINIMAL

  useEffect(() => {
    if (!target) return
    setCount(0)
    const step = Math.ceil(target / 40)
    const id = setInterval(() => {
      setCount(c => {
        const next = c + step
        if (next >= target) { clearInterval(id); return target }
        return next
      })
    }, 30)
    return () => clearInterval(id)
  }, [target])

  if (!risk) return (
    <div style={{ padding: '12px 0', color: 'rgba(0,255,255,0.3)', fontSize: 11, letterSpacing: 2 }}>
      AWAITING SCAN...
    </div>
  )

  return (
    <div>
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={{
          fontSize: 72, fontWeight: 700, lineHeight: 1,
          color, textShadow: `0 0 30px ${glow}, 0 0 60px ${glow}`,
          fontFamily: 'IBM Plex Mono, monospace',
        }}
      >{count}</motion.div>
      <div style={{ color, fontSize: 13, letterSpacing: 3, marginTop: 4, textShadow: `0 0 10px ${glow}` }}>
        {level} RISK
      </div>
      {/* Score bar */}
      <div style={{ marginTop: 10, height: 4, background: 'rgba(0,255,255,0.1)', borderRadius: 2 }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${target}%` }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          style={{ height: '100%', background: color, borderRadius: 2, boxShadow: `0 0 8px ${glow}` }}
        />
      </div>
      {/* Recommendation */}
      <div style={{ marginTop: 10, fontSize: 10, color: 'rgba(0,255,255,0.5)', lineHeight: 1.6 }}>
        {risk.recommendation}
      </div>
      {/* Signals */}
      {risk.signals?.length > 0 && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {risk.signals.map((s, i) => (
            <div key={i} style={{
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 3, padding: '3px 8px', fontSize: 9, color: '#fca5a5', letterSpacing: 0.5,
            }}>⚠ {s}</div>
          ))}
        </div>
      )}
    </div>
  )
}
