import { useRef, useMemo, useState } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { TextureLoader } from 'three'
import { latLonToVector3 } from '../utils/geoUtils'
import { PLATFORMS } from '../utils/platformConfig'

function PlatformMarker({ platform, found, index }) {
  const meshRef = useRef()
  const ringRef = useRef()
  const [hovered, setHovered] = useState(false)
  const pos = useMemo(() => latLonToVector3(platform.lat, platform.lon, 2.06), [platform])
  const color = found ? '#00ffff' : '#3b1a1a'

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() + index * 0.4
    if (meshRef.current) {
      const s = found ? 1 + 0.4 * Math.sin(t * 3) : 1
      meshRef.current.scale.setScalar(s)
    }
    if (ringRef.current && found) {
      ringRef.current.scale.setScalar(1 + (Math.sin(t * 2) * 0.5 + 0.5) * 1.5)
      ringRef.current.material.opacity = 0.6 - (Math.sin(t * 2) * 0.5 + 0.5) * 0.5
    }
  })

  return (
    <group position={[pos.x, pos.y, pos.z]}>
      <mesh ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[0.032, 8, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {found && (
        <mesh ref={ringRef}>
          <ringGeometry args={[0.04, 0.055, 16]} />
          <meshBasicMaterial color="#00ffff" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}
      {hovered && (
        <Html distanceFactor={6} style={{ pointerEvents: 'none' }}>
          <div style={{
            background: 'rgba(2,8,23,0.92)', border: '1px solid rgba(0,255,255,0.5)',
            color: '#00ffff', padding: '3px 8px', fontSize: 10, whiteSpace: 'nowrap',
            fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 1,
            boxShadow: '0 0 10px rgba(0,255,255,0.4)',
          }}>
            {platform.icon} {platform.name.toUpperCase()}
            <div style={{ color: found ? '#00ffff' : '#ef4444', fontSize: 9 }}>
              {found ? '● ACQUIRED' : '○ NO TRACE'}
            </div>
          </div>
        </Html>
      )}
    </group>
  )
}

export default function Globe({ activePlatforms, isScanning }) {
  const globeRef = useRef()
  const atmRef = useRef()

  const earthTex = useLoader(TextureLoader, 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg')
  const specTex = useLoader(TextureLoader, 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_specular_2048.jpg')

  useFrame(() => {
    if (globeRef.current) globeRef.current.rotation.y += 0.001
    if (atmRef.current) atmRef.current.rotation.y += 0.0008
  })

  // Build a map of platform name → found status from activePlatforms
  const platformStatus = useMemo(() => {
    const map = {}
    activePlatforms.forEach(p => { map[p.platform] = p.found })
    return map
  }, [activePlatforms])

  return (
    <group>
      {/* Earth */}
      <mesh ref={globeRef}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshPhongMaterial
          map={earthTex}
          specularMap={specTex}
          specular={new THREE.Color(0x222222)}
          shininess={8}
        />
      </mesh>

      {/* Atmosphere glow */}
      <mesh ref={atmRef}>
        <sphereGeometry args={[2.12, 64, 64]} />
        <meshBasicMaterial color="#00ffff" transparent opacity={0.07} side={THREE.BackSide} />
      </mesh>

      {/* Grid wireframe */}
      <mesh>
        <sphereGeometry args={[2.02, 24, 24]} />
        <meshBasicMaterial color="#00ffff" transparent opacity={0.04} wireframe />
      </mesh>

      {/* Platform markers */}
      {PLATFORMS.map((platform, i) => {
        const found = platformStatus[platform.name] ?? false
        const isActive = activePlatforms.some(p => p.platform === platform.name)
        if (!isActive && !isScanning) return null
        return (
          <PlatformMarker
            key={platform.id}
            platform={platform}
            found={found}
            index={i}
          />
        )
      })}
    </group>
  )
}
