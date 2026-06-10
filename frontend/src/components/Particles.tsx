// @ts-nocheck
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'

export default function CityParticles({ count = 300 }) {
  const ref = useRef()
  const velocities = useMemo(() => new Float32Array(count).map(() => 0.008 + Math.random() * 0.016), [count])

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      arr[i*3]   = (Math.random() - 0.5) * 30
      arr[i*3+1] = Math.random() * 12
      arr[i*3+2] = -2 - Math.random() * 16
    }
    return arr
  }, [count])

  useFrame(() => {
    if (!ref.current) return
    const pos = ref.current.geometry.attributes.position.array
    for (let i = 0; i < count; i++) {
      pos[i*3+1] += velocities[i]
      if (pos[i*3+1] > 12) {
        pos[i*3+1] = -1
        pos[i*3]   = (Math.random() - 0.5) * 30
        pos[i*3+2] = -2 - Math.random() * 16
      }
    }
    ref.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.025} color="#00ffff" transparent opacity={0.35} sizeAttenuation depthWrite={false} />
    </points>
  )
}
