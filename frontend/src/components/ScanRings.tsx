// @ts-nocheck
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function ScanRings({ visible }) {
  const r1 = useRef()
  const r2 = useRef()
  const mat1 = useRef()
  const mat2 = useRef()

  useFrame(() => {
    if (!visible) return
    if (r1.current) r1.current.rotation.x += 0.05
    if (r2.current) r2.current.rotation.z += 0.04
  })

  if (!visible) return null

  return (
    <group>
      <mesh ref={r1}>
        <torusGeometry args={[2.25, 0.008, 2, 128]} />
        <meshBasicMaterial ref={mat1} color="#00ffff" transparent opacity={0.8} />
      </mesh>
      <mesh ref={r2} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.25, 0.008, 2, 128]} />
        <meshBasicMaterial ref={mat2} color="#00ffff" transparent opacity={0.6} />
      </mesh>
    </group>
  )
}
