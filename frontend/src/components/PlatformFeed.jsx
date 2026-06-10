import { motion } from 'framer-motion'

const STATUS_FOUND  = { color: '#00ffff', text: 'ACQUIRED',  glow: 'rgba(0,255,255,0.4)' }
const STATUS_MISS   = { color: '#374151', text: 'NO TRACE',  glow: 'none' }

export default function PlatformFeed({ activePlatforms, isScanning, allPlatforms }) {
  const activeMap = {}
  activePlatforms.forEach(p => { activeMap[p.platform] = p })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {allPlatforms.map((plat, i) => {
        const active = activeMap[plat.name]
        const scanning = isScanning && !active
        const found  = active?.found ?? false
        const st     = active ? (found ? STATUS_FOUND : STATUS_MISS) : null

        return (
          <motion.div
            key={plat.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: active || !isScanning ? 1 : 0.3, x: 0 }}
            transition={{ delay: i * 0.02 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '5px 8px', borderRadius: 2,
              background: found ? 'rgba(0,255,255,0.04)' : 'transparent',
              border: found ? '1px solid rgba(0,255,255,0.15)' : '1px solid transparent',
              transition: 'all 0.3s',
            }}
          >
            <span style={{ fontSize: 13, width: 20, textAlign: 'center' }}>{plat.icon}</span>
            <span style={{
              flex: 1, fontSize: 10, fontFamily: 'IBM Plex Mono', letterSpacing: 1,
              color: found ? '#e2e8f0' : 'rgba(255,255,255,0.3)',
            }}>{plat.name.toUpperCase()}</span>

            {scanning && (
              <span style={{ fontSize: 9, color: 'rgba(0,255,255,0.4)', letterSpacing: 1 }}>
                SCANNING<span className="blink">_</span>
              </span>
            )}
            {st && (
              <span style={{
                fontSize: 9, letterSpacing: 1, color: st.color,
                textShadow: st.glow !== 'none' ? `0 0 6px ${st.glow}` : 'none',
              }}>
                {found ? '●' : '○'} {st.text}
              </span>
            )}
            {!active && !isScanning && (
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.15)', letterSpacing: 1 }}>STANDBY</span>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
