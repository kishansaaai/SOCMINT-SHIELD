// @ts-nocheck
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { latLonToVector3 } from '../utils/geoUtils'

function DataStream({ platform, found }) {
  const tRef   = useRef(0)
  const dotRef = useRef()

  const curve = useMemo(() => {
    const { x, y, z } = latLonToVector3(platform.lat, platform.lon, 2.05)
    const start = new THREE.Vector3(x, y, z)
    const mid   = new THREE.Vector3(
      x * 1.8 + (Math.random() - 0.5) * 1.5,
      y * 1.8 + (Math.random() - 0.5) * 1.5,
      z * 1.8 + (Math.random() - 0.5) * 1.5,
    )
    const end = new THREE.Vector3(
      (Math.random() - 0.5) * 5,
      (Math.random() - 0.5) * 5,
      (Math.random() - 0.5) * 5,
    )
    return new THREE.CatmullRomCurve3([start, mid, end])
  }, [platform])

  const points = useMemo(() => curve.getPoints(60), [curve])
  const lineGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(points)
    return geo
  }, [points])

  useFrame((_, delta) => {
    tRef.current = (tRef.current + delta * 0.4) % 1
    if (dotRef.current) {
      const p = curve.getPoint(tRef.current)
      dotRef.current.position.set(p.x, p.y, p.z)
    }
  })

  const color = found ? '#00ffff' : '#1a3344'
  const opacity = found ? 0.5 : 0.15

  return (
    <group>
      <line geometry={lineGeo}>
        <lineBasicMaterial color={color} transparent opacity={opacity} />
      </line>
      {found && (
        <mesh ref={dotRef}>
          <sphereGeometry args={[0.022, 8, 8]} />
          <meshBasicMaterial color="#00ffff" />
        </mesh>
      )}
    </group>
  )
}

export default function DataStreams({ platforms }) {
  if (!platforms?.length) return null
  return (
    <group>
      {platforms.map((p, i) => (
        <DataStream key={i} platform={p} found={p.found} />
      ))}
    </group>
  )
}
