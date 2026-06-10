import { useRef, useMemo, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PLATFORMS, getPlatformByName } from '../utils/platformConfig'
import { generateBuildings } from '../utils/buildingGen'

const BUILDINGS = generateBuildings(42)

function getBeamPos(platformId) {
  const plat = PLATFORMS.find(p => p.id === platformId)
  if (!plat) return { x: 0, z: -5, h: 3 }
  // Find closest building to platform's bx/bz
  let best = BUILDINGS[0], bestDist = 9999
  for (const b of BUILDINGS) {
    const d = Math.abs(b.x - plat.bx) + Math.abs(b.z - plat.bz)
    if (d < bestDist) { bestDist = d; best = b }
  }
  return { x: best.x, z: best.z, h: best.h }
}

function DataPacket({ color, startY, traveling }) {
  const ref = useRef()
  const speed = 0.06 + Math.random() * 0.04
  const tRef = useRef(Math.random())

  useFrame(() => {
    if (!ref.current || !traveling) return
    tRef.current += speed
    if (tRef.current > 15) tRef.current = 0
    ref.current.position.y = startY + tRef.current
    ref.current.material.opacity = tRef.current > 12 ? (15 - tRef.current) / 3 : 1
  })

  return (
    <mesh ref={ref} position={[0, startY, 0]}>
      <sphereGeometry args={[0.028, 6, 6]} />
      <meshBasicMaterial color={color} transparent opacity={1} />
    </mesh>
  )
}

function Beam({ platform, found, visible }) {
  const beamRef  = useRef()
  const sphereRef = useRef()
  const scaleRef = useRef(0)
  const pos = useMemo(() => getBeamPos(platform.id), [platform.id])
  const color = useMemo(() => new THREE.Color(found ? platform.color : '#441111'), [found, platform.color])
  const beamH = 16

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    // Grow beam
    if (scaleRef.current < 1) scaleRef.current = Math.min(1, scaleRef.current + 0.025)
    if (!visible && scaleRef.current > 0) scaleRef.current = Math.max(0, scaleRef.current - 0.02)

    if (beamRef.current) {
      beamRef.current.scale.y = scaleRef.current
      beamRef.current.material.opacity = found
        ? 0.55 + Math.sin(t * 2.5) * 0.2
        : 0.15 + Math.sin(t * 1.5) * 0.06
    }
    if (sphereRef.current) {
      const ps = found ? 1 + Math.sin(t * 5) * 0.3 : 0.5
      sphereRef.current.scale.setScalar(ps)
      sphereRef.current.position.y = pos.h + beamH * scaleRef.current
    }
  })

  if (!visible && scaleRef.current <= 0) return null

  return (
    <group position={[pos.x, 0, pos.z]}>
      {/* Main beam */}
      <mesh ref={beamRef} position={[0, pos.h + (beamH / 2) * scaleRef.current, 0]}>
        <cylinderGeometry args={[0.018, 0.025, beamH, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} depthWrite={false} />
      </mesh>

      {/* Top sphere */}
      <mesh ref={sphereRef} position={[0, pos.h + beamH, 0]}>
        <sphereGeometry args={[0.09, 10, 10]} />
        <meshStandardMaterial
          color={color} emissive={color}
          emissiveIntensity={found ? 2.5 : 0.5}
          transparent opacity={found ? 0.95 : 0.4}
        />
      </mesh>

      {/* Data packets */}
      {found && [0, 1, 2, 3].map(i => (
        <DataPacket key={i} color={platform.color} startY={pos.h} traveling={found} />
      ))}

      {/* Platform label */}
      {found && (
        <mesh position={[0, pos.h - 0.3, 0]}>
          <sphereGeometry args={[0.04, 6, 6]} />
          <meshBasicMaterial color={platform.color} />
        </mesh>
      )}
    </group>
  )
}

export default function DataBeams({ activePlatforms, isScanning }) {
  const statusMap = useMemo(() => {
    const m = {}
    activePlatforms.forEach(p => { m[p.platform] = p.found })
    return m
  }, [activePlatforms])

  return (
    <group>
      {PLATFORMS.map(plat => {
        const isActive = plat.name in statusMap || isScanning
        const found = statusMap[plat.name] ?? false
        if (!isActive) return null
        return (
          <Beam
            key={plat.id}
            platform={plat}
            found={found}
            visible={plat.name in statusMap}
          />
        )
      })}
    </group>
  )
}
