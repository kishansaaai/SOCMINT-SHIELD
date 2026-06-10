// @ts-nocheck
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

export default function GridFloor() {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.material.opacity = 0.06 + 0.05 * Math.sin(clock.getElapsedTime() * 0.5)
    }
  })
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.2, 0]}>
      <planeGeometry args={[28, 28, 24, 24]} />
      <meshBasicMaterial color="#00ffff" transparent opacity={0.08} wireframe />
    </mesh>
  )
}
