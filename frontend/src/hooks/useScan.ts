import { useState, useCallback } from 'react'
import { PlatformResult } from '../types'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface ScanLogEntry {
  ts: string;
  platform: string;
  found: boolean;
  status: string;
}

export function useScan() {
  const [isScanning, setIsScanning]     = useState<boolean>(false)
  const [results, setResults]           = useState<any | null>(null)
  const [error, setError]               = useState<string | null>(null)
  const [activePlatforms, setActive]    = useState<PlatformResult[]>([])
  const [scanProgress, setScanProgress] = useState<number>(0)
  const [scanLog, setScanLog]           = useState<ScanLogEntry[]>([])

  const startScan = useCallback(async (payload: any, endpoint?: string) => {
    setIsScanning(true)
    setResults(null)
    setError(null)
    setActive([])
    setScanProgress(0)
    setScanLog([])

    // Determine the correct API endpoint based on search mode
    const url = endpoint
      ? `${API_BASE}${endpoint}`
      : `${API_BASE}/api/search`

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.detail || `Server ${res.status}`)
      }
      const data = await res.json()

      // Animate platform reveal for search results
      const platforms = data.platforms || []
      if (platforms.length > 0) {
        for (let i = 0; i < platforms.length; i++) {
          await new Promise(r => setTimeout(r, 80))
          const p = platforms[i]
          setActive(prev => [...prev, p])
          setScanProgress(Math.round(((i+1)/platforms.length)*100))
          const ts = new Date().toTimeString().slice(0,8)
          setScanLog(prev => [...prev, {
            ts,
            platform: p.platform,
            found: p.found,
            status: p.found ? 'ACQUIRED' : 'NO TRACE',
          }])
        }
      } else {
        // Phone search / identity search — no platform animation
        setScanProgress(100)
      }

      setResults(data)
    } catch (e: any) {
      setError(e.message || String(e))
    } finally {
      setIsScanning(false)
    }
  }, [])

  return { isScanning, results, error, activePlatforms, scanProgress, scanLog, startScan }
}

