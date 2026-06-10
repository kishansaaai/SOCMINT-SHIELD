import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function Rain({ count = 400 }) {
  const ref = useRef()
  const speeds = useMemo(() => new Float32Array(count).map(() => 0.12 + Math.random() * 0.18), [count])

  const { positions, indices } = useMemo(() => {
    const positions = new Float32Array(count * 6)
    const indices   = []
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 32
      const y = Math.random() * 14
      const z = -1 - Math.random() * 18
      const len = 0.25 + Math.random() * 0.15
      positions[i*6]   = x; positions[i*6+1] = y;     positions[i*6+2] = z
      positions[i*6+3] = x; positions[i*6+4] = y-len; positions[i*6+5] = z
      indices.push(i*2, i*2+1)
    }
    return { positions, indices: new Uint16Array(indices) }
  }, [count])

  useFrame(() => {
    if (!ref.current) return
    const pos = ref.current.geometry.attributes.position.array
    for (let i = 0; i < count; i++) {
      pos[i*6+1] -= speeds[i]
      pos[i*6+4] -= speeds[i]
      if (pos[i*6+1] < -1) {
        const y = 12 + Math.random() * 4
        const x = (Math.random() - 0.5) * 32
        pos[i*6]   = x; pos[i*6+1] = y
        pos[i*6+3] = x; pos[i*6+4] = y - 0.25
      }
    }
    ref.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <lineSegments ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color="white" transparent opacity={0.07} depthWrite={false} />
    </lineSegments>
  )
}
