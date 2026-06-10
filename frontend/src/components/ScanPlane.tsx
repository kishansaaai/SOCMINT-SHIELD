// @ts-nocheck
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

export default function ScanPlane({ active }) {
  const ref = useRef()
  const zRef = useRef(5)

  useFrame((_, delta) => {
    if (!active || !ref.current) return
    zRef.current -= delta * 6
    ref.current.position.z = zRef.current
    if (zRef.current < -22) zRef.current = 5
  })

  if (!active) return null

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 5]}>
      <planeGeometry args={[32, 0.08]} />
      <meshBasicMaterial color="#00ffff" transparent opacity={0.18} depthWrite={false} />
    </mesh>
  )
}
