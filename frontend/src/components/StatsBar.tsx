// @ts-nocheck
import { motion } from 'framer-motion'

const LEVEL_COLORS = {
  HIGH: '#ef4444', MEDIUM: '#f59e0b', LOW: '#3b82f6', MINIMAL: '#00ffff',
}

export default function StatsBar({ results, isScanning, activePlatforms, scanProgress }) {
  if (!results && !isScanning) return null
  const found = results ? results.platforms_found : activePlatforms.filter(p => p.found).length
  const checked = results ? results.platforms_checked : activePlatforms.length
  const riskLevel = results?.risk_score?.level
  const riskColor = LEVEL_COLORS[riskLevel] || '#00ffff'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: 'flex', gap: 8, justifyContent: 'center', pointerEvents: 'none',
      }}
    >
      {[
        { label: 'CHECKED', value: checked, color: '#00ffff' },
        { label: 'FOUND',   value: found,   color: '#22c55e' },
        { label: 'PROGRESS',value: `${isScanning ? scanProgress : 100}%`, color: '#f59e0b' },
        { label: 'RISK',    value: riskLevel || (isScanning ? '...' : '—'), color: riskColor },
        results && { label: 'TIME', value: `${results.elapsed_seconds}s`, color: '#94a3b8' },
      ].filter(Boolean).map(({ label, value, color }) => (
        <div key={label} style={{
          padding: '6px 14px',
          background: 'rgba(2,8,23,0.88)',
          border: `1px solid ${color}44`,
          borderRadius: 3,
          textAlign: 'center',
          backdropFilter: 'blur(10px)',
          boxShadow: `0 0 12px ${color}22`,
        }}>
          <div style={{ fontSize: 8, color: 'rgba(0,255,255,0.4)', letterSpacing: 2, marginBottom: 2 }}>{label}</div>
          <div style={{ fontSize: 15, fontWeight: 700, color, fontFamily: 'IBM Plex Mono', textShadow: `0 0 8px ${color}88` }}>{value}</div>
        </div>
      ))}
    </motion.div>
  )
}
