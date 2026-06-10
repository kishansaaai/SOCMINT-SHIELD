import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { generateBuildings, makeWindowTexture } from '../utils/buildingGen'

function Building({ b, index }) {
  const meshRef = useRef()
  const edgesRef = useRef()

  const windowTex = useMemo(() => {
    const canvas = makeWindowTexture(b.windowDensity, index)
    const tex = new THREE.CanvasTexture(canvas)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    return tex
  }, [b.windowDensity, index])

  const neonColor = useMemo(() => new THREE.Color(b.neonColor || '#00ffff'), [b.neonColor])

  return (
    <group position={[b.x, b.h / 2, b.z]}>
      <mesh ref={meshRef} castShadow>
        <boxGeometry args={[b.w, b.h, b.d]} />
        <meshStandardMaterial
          color="#080820"
          emissive="#080820"
          emissiveMap={windowTex}
          emissiveIntensity={b.row === 'far' ? 0.6 : 0.9}
          roughness={0.85}
          metalness={0.1}
        />
      </mesh>
      {/* Neon edge strip */}
      {b.neon && (
        <lineSegments position={[0, b.h / 2 - 0.01, 0]}>
          <edgesGeometry args={[new THREE.BoxGeometry(b.w + 0.01, 0.02, b.d + 0.01)]} />
          <lineBasicMaterial color={neonColor} transparent opacity={b.row === 'far' ? 0.4 : 0.85} />
        </lineSegments>
      )}
      {/* Blinking antenna on landmark */}
      {b.landmark === 'cyber_tower' && (
        <BlinkLight y={b.h / 2 + 0.15} />
      )}
    </group>
  )
}

function BlinkLight({ y }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.visible = Math.sin(clock.getElapsedTime() * 3) > 0
    }
  })
  return (
    <mesh ref={ref} position={[0, y, 0]}>
      <sphereGeometry args={[0.04, 6, 6]} />
      <meshBasicMaterial color="#ff2200" />
    </mesh>
  )
}

function GroundPlane() {
  const gridTex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 512; c.height = 512
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#050510'
    ctx.fillRect(0, 0, 512, 512)
    ctx.strokeStyle = 'rgba(0,255,255,0.18)'
    ctx.lineWidth = 0.5
    const step = 512 / 20
    for (let i = 0; i <= 20; i++) {
      ctx.beginPath(); ctx.moveTo(i * step, 0); ctx.lineTo(i * step, 512); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, i * step); ctx.lineTo(512, i * step); ctx.stroke()
    }
    const tex = new THREE.CanvasTexture(c)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(4, 4)
    return tex
  }, [])

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -8]} receiveShadow>
      <planeGeometry args={[40, 30]} />
      <meshStandardMaterial
        color="#050510"
        map={gridTex}
        metalness={0.85}
        roughness={0.15}
        envMapIntensity={0.5}
      />
    </mesh>
  )
}

export default function City() {
  const buildings = useMemo(() => generateBuildings(42), [])

  return (
    <group>
      <GroundPlane />
      {buildings.map((b, i) => (
        <Building key={i} b={b} index={i} />
      ))}
    </group>
  )
}
