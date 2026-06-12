// @ts-nocheck
import { useRef, useMemo, Suspense } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { OrbitControls, Stars, useTexture } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import { TextureLoader } from 'three'
import { latLonToVector3 } from '../utils/geoUtils'
import { PLATFORMS } from '../utils/platformConfig'

const GLOBE_RADIUS = 1.85
const TEAL = '#63cab7'
const TEAL_BRIGHT = '#7ee8d6'
const CYAN_GLOW = '#00e5ff'
const PURPLE_GLOW = '#1a8a9e'
const NAVY = '#020c1b'

const PLATFORM_COORDS = {
  GitHub: { lat: 37.7749, lon: -122.4194 },
  Instagram: { lat: 34.0522, lon: -118.2437 },
  'Twitter/X': { lat: 37.7749, lon: -122.4194 },
  YouTube: { lat: 37.6253, lon: -122.4224 },
  Reddit: { lat: 41.8781, lon: -87.6298 },
  Snapchat: { lat: 34.0194, lon: -118.4912 },
  LinkedIn: { lat: 37.4230, lon: -122.0840 },
  Telegram: { lat: 25.2048, lon: 55.2708 },
  TikTok: { lat: 39.9042, lon: 116.4074 },
  Pinterest: { lat: 37.7749, lon: -122.4194 },
  Steam: { lat: 47.6062, lon: -122.3321 },
  HackerNews: { lat: 37.7749, lon: -122.4194 },
  'Dev.to': { lat: 45.4215, lon: -75.6972 },
  GitLab: { lat: 52.3676, lon: 4.9041 },
  Tumblr: { lat: 40.7128, lon: -74.0060 },
  Medium: { lat: 37.7749, lon: -122.4194 },
  Quora: { lat: 37.4419, lon: -122.1430 },
  Facebook: { lat: 37.4530, lon: -122.1817 },
  Discord: { lat: 37.7749, lon: -122.4194 },
  ShareChat: { lat: 12.9716, lon: 77.5946 },
  Koo: { lat: 12.9716, lon: 77.5946 },
  'OLX India': { lat: 28.4595, lon: 77.0266 },
  'Naukri.com': { lat: 28.5355, lon: 77.3910 },
  JioCinema: { lat: 18.9750, lon: 72.8258 },
  Roposo: { lat: 28.4595, lon: 77.0266 },
  'WhatsApp Business': { lat: 37.4530, lon: -122.1817 },
}

function getCoordsForPlatform(name, index) {
  if (PLATFORM_COORDS[name]) return PLATFORM_COORDS[name]
  return { lat: -30 + (index * 23) % 90, lon: -150 + (index * 47) % 300 }
}

// ─── Earth with realistic PBR ─────────────────────────────────────────────────

function EarthGlobe() {
  const globeRef = useRef()
  const [earthMap, specMap, bumpMap] = useTexture([
    'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg',
    'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_specular_2048.jpg',
    'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_normal_2048.jpg',
  ])

  useFrame(() => {
    if (globeRef.current) globeRef.current.rotation.y += 0.001
  })

  return (
    <mesh ref={globeRef}>
      <sphereGeometry args={[GLOBE_RADIUS, 128, 128]} />
      <meshPhysicalMaterial
        map={earthMap}
        normalMap={bumpMap}
        normalScale={new THREE.Vector2(0.8, 0.8)}
        roughnessMap={specMap}
        roughness={0.7}
        metalness={0.1}
        clearcoat={0.15}
        clearcoatRoughness={0.6}
        color={new THREE.Color(0.5, 0.65, 0.85)}
        emissive={new THREE.Color(0.02, 0.06, 0.12)}
        emissiveIntensity={0.5}
        envMapIntensity={0.4}
      />
    </mesh>
  )
}

// ─── Night-side city lights overlay (brighter) ────────────────────────────────

function NightLights() {
  const ref = useRef()
  const nightMap = useLoader(
    TextureLoader,
    'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_lights_2048.png'
  )

  useFrame(() => {
    if (ref.current) ref.current.rotation.y += 0.001
  })

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[GLOBE_RADIUS + 0.003, 128, 128]} />
      <meshBasicMaterial
        map={nightMap}
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  )
}

// ─── Clouds layer (procedural — no external texture needed) ───────────────────

function CloudLayer() {
  const ref = useRef()
  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec2 vUv;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec2 vUv;
      // Simple hash-based noise
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }
      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 4; i++) {
          v += a * noise(p);
          p *= 2.0;
          a *= 0.5;
        }
        return v;
      }
      void main() {
        vec2 uv = vUv + vec2(uTime * 0.008, uTime * 0.003);
        float n = fbm(uv * 8.0);
        float cloud = smoothstep(0.42, 0.68, n);
        gl_FragColor = vec4(1.0, 1.0, 1.0, cloud * 0.12);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    side: THREE.DoubleSide,
  }), [])

  useFrame(({ clock }) => {
    mat.uniforms.uTime.value = clock.elapsedTime
    if (ref.current) ref.current.rotation.y += 0.0014
  })

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[GLOBE_RADIUS + 0.015, 96, 96]} />
      <primitive object={mat} attach="material" />
    </mesh>
  )
}

// ─── Inner atmosphere glow (warm teal) ────────────────────────────────────────

function InnerAtmosphere() {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        vec3 viewDir = normalize(-vPosition);
        float rim = 1.0 - max(0.0, dot(viewDir, vNormal));
        float intensity = pow(rim, 3.5);
        vec3 inner = vec3(0.05, 0.22, 0.32);
        vec3 mid = vec3(0.24, 0.72, 0.68);
        vec3 outer = vec3(0.42, 0.92, 0.85);
        vec3 color = mix(inner, mix(mid, outer, rim), rim);
        gl_FragColor = vec4(color, intensity * 0.7);
      }
    `,
    transparent: true,
    side: THREE.FrontSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }), [])

  return (
    <mesh>
      <sphereGeometry args={[GLOBE_RADIUS + 0.01, 64, 64]} />
      <primitive object={mat} attach="material" />
    </mesh>
  )
}

// ─── Outer atmosphere halo (purple-cyan gradient) ─────────────────────────────

function OuterAtmosphere() {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        vec3 viewDir = normalize(-vPosition);
        float rim = 1.0 - max(0.0, dot(viewDir, vNormal));
        float intensity = pow(rim, 4.0);
        float pulse = 0.85 + 0.15 * sin(uTime * 1.2);
        // Gradient from teal to deep blue along the rim
        vec3 teal = vec3(0.0, 0.9, 1.0);
        vec3 deepBlue = vec3(0.12, 0.42, 0.72);
        vec3 color = mix(teal, deepBlue, pow(rim, 2.0));
        gl_FragColor = vec4(color, intensity * 0.45 * pulse);
      }
    `,
    transparent: true,
    side: THREE.BackSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }), [])

  useFrame(({ clock }) => {
    mat.uniforms.uTime.value = clock.elapsedTime
  })

  return (
    <mesh>
      <sphereGeometry args={[GLOBE_RADIUS * 1.08, 64, 64]} />
      <primitive object={mat} attach="material" />
    </mesh>
  )
}

// ─── Subtle latitude / longitude grid ─────────────────────────────────────────

function LatLongGrid() {
  const lines = useMemo(() => {
    const geoms = []
    const segments = 72

    for (let lat = -60; lat <= 60; lat += 30) {
      const pts = []
      for (let i = 0; i <= segments; i++) {
        const lon = -180 + (i / segments) * 360
        const v = latLonToVector3(lat, lon, GLOBE_RADIUS + 0.008)
        pts.push(new THREE.Vector3(v.x, v.y, v.z))
      }
      geoms.push(new THREE.BufferGeometry().setFromPoints(pts))
    }

    for (let lon = -180; lon < 180; lon += 30) {
      const pts = []
      for (let i = 0; i <= segments; i++) {
        const lat = -90 + (i / segments) * 180
        const v = latLonToVector3(lat, lon, GLOBE_RADIUS + 0.008)
        pts.push(new THREE.Vector3(v.x, v.y, v.z))
      }
      geoms.push(new THREE.BufferGeometry().setFromPoints(pts))
    }

    return geoms
  }, [])

  return (
    <group>
      {lines.map((geom, i) => (
        <line key={i} geometry={geom}>
          <lineBasicMaterial color={TEAL} transparent opacity={0.06} depthWrite={false} />
        </line>
      ))}
    </group>
  )
}

// ─── Orbital rings (sci-fi) ───────────────────────────────────────────────────

function OrbitalRings() {
  const ring1Ref = useRef()
  const ring2Ref = useRef()
  const ring3Ref = useRef()

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (ring1Ref.current) {
      ring1Ref.current.rotation.z = t * 0.12
      ring1Ref.current.rotation.x = Math.PI / 2 + Math.sin(t * 0.08) * 0.05
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.z = -t * 0.09
      ring2Ref.current.rotation.x = Math.PI / 2.4 + Math.cos(t * 0.06) * 0.04
    }
    if (ring3Ref.current) {
      ring3Ref.current.rotation.z = t * 0.06
      ring3Ref.current.rotation.x = Math.PI / 1.8
    }
  })

  return (
    <group>
      <mesh ref={ring1Ref} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[GLOBE_RADIUS * 1.28, 0.003, 6, 180]} />
        <meshBasicMaterial color={CYAN_GLOW} transparent opacity={0.15} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={ring2Ref} rotation={[Math.PI / 2.4, 0.3, 0]}>
        <torusGeometry args={[GLOBE_RADIUS * 1.42, 0.002, 6, 180]} />
        <meshBasicMaterial color={TEAL} transparent opacity={0.08} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={ring3Ref} rotation={[Math.PI / 1.8, -0.2, 0]}>
        <torusGeometry args={[GLOBE_RADIUS * 1.55, 0.0015, 6, 180]} />
        <meshBasicMaterial color={TEAL_BRIGHT} transparent opacity={0.07} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  )
}

// ─── Data particles orbiting the globe ────────────────────────────────────────

function DataParticles({ count = 200 }) {
  const ref = useRef()
  const { positions, speeds, radiuses } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const speeds = new Float32Array(count)
    const radiuses = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const r = GLOBE_RADIUS * (1.15 + Math.random() * 0.8)
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.cos(phi)
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
      speeds[i] = 0.08 + Math.random() * 0.15
      radiuses[i] = r
    }
    return { positions, speeds, radiuses }
  }, [count])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const posArray = ref.current.geometry.attributes.position.array
    const t = clock.elapsedTime
    for (let i = 0; i < count; i++) {
      const r = radiuses[i]
      const speed = speeds[i]
      const baseAngle = (i / count) * Math.PI * 2
      const theta = baseAngle + t * speed
      const phi = Math.acos(2 * (((i * 0.618 + t * 0.01) % 1)) - 1)
      posArray[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      posArray[i * 3 + 1] = r * Math.cos(phi)
      posArray[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
    }
    ref.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color={CYAN_GLOW}
        size={0.018}
        transparent
        opacity={0.5}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  )
}

// ─── Scan sweep ring ──────────────────────────────────────────────────────────

function ScanSweep({ active }) {
  const ringRef = useRef()
  const beamRef = useRef()
  const ring2Ref = useRef()
  const intensityRef = useRef(0)

  useFrame((state) => {
    intensityRef.current = THREE.MathUtils.lerp(intensityRef.current, active ? 1 : 0, 0.04)
    const intensity = intensityRef.current
    const t = state.clock.elapsedTime
    if (ringRef.current) {
      ringRef.current.rotation.y = t * 0.9
      ringRef.current.material.opacity = active ? 0.2 + intensity * 0.4 : 0.06
      ringRef.current.material.color.lerpColors(
        new THREE.Color(TEAL_BRIGHT),
        new THREE.Color(CYAN_GLOW),
        Math.sin(t * 2) * 0.5 + 0.5
      )
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.y = -t * 0.6
      ring2Ref.current.material.opacity = active ? 0.12 + intensity * 0.2 : 0.03
    }
    if (beamRef.current) {
      beamRef.current.rotation.y = t * 0.9
      beamRef.current.material.opacity = active ? 0.3 * intensity : 0
    }
  })

  return (
    <group rotation={[0.35, 0, -0.08]}>
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[GLOBE_RADIUS + 0.04, 0.008, 8, 128]} />
        <meshBasicMaterial color={TEAL_BRIGHT} transparent opacity={0.1} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={ring2Ref} rotation={[Math.PI / 2.3, 0.5, 0]}>
        <torusGeometry args={[GLOBE_RADIUS + 0.06, 0.005, 8, 128]} />
        <meshBasicMaterial color={TEAL} transparent opacity={0.04} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={beamRef}>
        <ringGeometry args={[GLOBE_RADIUS + 0.01, GLOBE_RADIUS + 0.08, 64, 1, 0, Math.PI / 3]} />
        <meshBasicMaterial color={CYAN_GLOW} transparent opacity={0} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  )
}

// ─── Platform marker ──────────────────────────────────────────────────────────

function PlatformMarker({ platform, found, index, visible }) {
  const groupRef = useRef()
  const coreRef = useRef()
  const ringRef = useRef()
  const beamRef = useRef()
  const coords = useMemo(() => getCoordsForPlatform(platform.platform, index), [platform.platform, index])
  const pos = useMemo(() => {
    const v = latLonToVector3(coords.lat, coords.lon, GLOBE_RADIUS)
    return new THREE.Vector3(v.x, v.y, v.z)
  }, [coords])
  const outerPos = useMemo(() => {
    const v = latLonToVector3(coords.lat, coords.lon, GLOBE_RADIUS + 0.12)
    return new THREE.Vector3(v.x, v.y, v.z)
  }, [coords])

  useFrame(({ clock }) => {
    if (!visible) return
    if (groupRef.current) groupRef.current.lookAt(0, 0, 0)
    const t = clock.elapsedTime + index * 0.4
    if (coreRef.current) {
      const base = found ? 1 : 0.6
      coreRef.current.scale.setScalar(base + (found ? Math.sin(t * 4) * 0.2 : 0))
    }
    if (ringRef.current && found) {
      const pulse = (Math.sin(t * 2.5) * 0.5 + 0.5)
      ringRef.current.scale.setScalar(1 + pulse * 1.5)
      ringRef.current.material.opacity = 0.5 - pulse * 0.4
    }
  })

  if (!visible) return null

  return (
    <group>
      <group position={pos} ref={groupRef}>
        <mesh ref={coreRef}>
          <sphereGeometry args={[0.024, 16, 16]} />
          <meshBasicMaterial
            color={found ? CYAN_GLOW : '#475569'}
            transparent
            opacity={found ? 1 : 0.4}
          />
        </mesh>
        {found && (
          <>
            {/* pulsing ring */}
            <mesh ref={ringRef}>
              <ringGeometry args={[0.032, 0.055, 32]} />
              <meshBasicMaterial color={TEAL_BRIGHT} transparent opacity={0.5} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
            </mesh>
            {/* glow sprite */}
            <sprite scale={[0.2, 0.2, 1]}>
              <spriteMaterial
                color={CYAN_GLOW}
                transparent
                opacity={0.35}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </sprite>
          </>
        )}
      </group>
    </group>
  )
}

// ─── Connection arc ───────────────────────────────────────────────────────────

function ConnectionArc({ fromName, toName, isScanning, index }) {
  const pulseRef = useRef()
  const opacityRef = useRef(0)

  const { curve, lineGeom } = useMemo(() => {
    const from = PLATFORM_COORDS[fromName] || getCoordsForPlatform(fromName, 0)
    const to = PLATFORM_COORDS[toName] || getCoordsForPlatform(toName, 1)
    const p1 = latLonToVector3(from.lat, from.lon, GLOBE_RADIUS)
    const p2 = latLonToVector3(to.lat, to.lon, GLOBE_RADIUS)
    const v1 = new THREE.Vector3(p1.x, p1.y, p1.z)
    const v2 = new THREE.Vector3(p2.x, p2.y, p2.z)
    const mid = new THREE.Vector3().addVectors(v1, v2).multiplyScalar(0.5)
    mid.addScaledVector(mid.clone().normalize(), v1.distanceTo(v2) * 0.28)
    const qCurve = new THREE.QuadraticBezierCurve3(v1, mid, v2)
    return { curve: qCurve, lineGeom: new THREE.BufferGeometry().setFromPoints(qCurve.getPoints(48)) }
  }, [fromName, toName])

  const lineMatRef = useRef()
  const pulseMatRef = useRef()

  useFrame((state) => {
    opacityRef.current = THREE.MathUtils.lerp(opacityRef.current, isScanning ? 1 : 0, 0.04)
    const opacity = opacityRef.current
    if (lineMatRef.current) lineMatRef.current.opacity = opacity * 0.4
    if (pulseMatRef.current) pulseMatRef.current.opacity = opacity * 0.9
    if (pulseRef.current && opacity > 0.05) {
      const progress = (state.clock.elapsedTime * (0.35 + (index % 5) * 0.05)) % 1
      pulseRef.current.position.copy(curve.getPointAt(progress))
    }
  })

  return (
    <group>
      <line geometry={lineGeom}>
        <lineBasicMaterial ref={lineMatRef} color={CYAN_GLOW} transparent opacity={0} />
      </line>
      <mesh ref={pulseRef}>
        <sphereGeometry args={[0.022, 10, 10]} />
        <meshBasicMaterial ref={pulseMatRef} color={TEAL_BRIGHT} transparent opacity={0} />
      </mesh>
    </group>
  )
}

// ─── Scene ────────────────────────────────────────────────────────────────────

const CONNECTIONS = [
  { from: 'GitHub', to: 'Telegram' },
  { from: 'Instagram', to: 'TikTok' },
  { from: 'YouTube', to: 'LinkedIn' },
  { from: 'Reddit', to: 'Telegram' },
  { from: 'ShareChat', to: 'GitHub' },
]

function SceneContent({ isScanning, scanStep }) {
  const transitionRef = useRef(0)
  const tiltGroupRef = useRef()

  useFrame((state) => {
    transitionRef.current = THREE.MathUtils.lerp(transitionRef.current, isScanning ? 1 : 0, 0.04)

    const idleCam = new THREE.Vector3(0, 0.5, 5.4)
    const scanCam = new THREE.Vector3(0, 0.15, 4.2)
    state.camera.position.lerp(idleCam.lerp(scanCam, transitionRef.current), 0.035)
    state.camera.lookAt(0, 0, 0)

    if (tiltGroupRef.current) {
      tiltGroupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.15) * 0.04 * (1 - transitionRef.current * 0.5)
    }
  })

  return (
    <>
      <color attach="background" args={[NAVY]} />
      <fog attach="fog" args={[NAVY, 8, 22]} />

      {/* Lighting — richer, more cinematic */}
      <ambientLight intensity={0.2} />
      <directionalLight position={[5, 3, 5]} intensity={1.4} color="#b8dcff" />
      <directionalLight position={[-5, -2, -4]} intensity={0.3} color="#1e3a5f" />
      <pointLight position={[0, 0, 6]} intensity={0.6} color={CYAN_GLOW} distance={14} />
      <pointLight position={[-3, 2, -4]} intensity={0.2} color={'#1a6a8e'} distance={12} />
      <pointLight position={[3, -2, 3]} intensity={0.15} color={TEAL_BRIGHT} distance={10} />

      {/* Starfield */}
      <Stars radius={100} depth={50} count={4000} factor={3.5} saturation={0.2} fade speed={0.3} />

      <group ref={tiltGroupRef} position={[0, -1.2, 0]} rotation={[0.32, 0, -0.06]}>
        <Suspense fallback={null}>
          <EarthGlobe />
          <NightLights />
          <CloudLayer />
        </Suspense>
        <LatLongGrid />
        <InnerAtmosphere />
        <OuterAtmosphere />
        <OrbitalRings />

        {PLATFORMS.map((p, i) => {
          const isPassed = i <= scanStep && isScanning
          const found = (i * 7) % 3 === 0
          return (
            <PlatformMarker
              key={p.id}
              platform={{ platform: p.name }}
              found={isPassed && found}
              index={i}
              visible={isScanning || i % 4 === 0}
            />
          )
        })}

        {CONNECTIONS.map((conn, idx) => (
          <ConnectionArc
            key={idx}
            fromName={conn.from}
            toName={conn.to}
            index={idx}
            isScanning={isScanning}
          />
        ))}
        <DataParticles count={180} />
        <ScanSweep active={isScanning} />
      </group>

      <EffectComposer multisampling={0}>
        <Bloom
          intensity={0.65}
          luminanceThreshold={0.25}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function GlobeScanner({ isScanning, scanStep = 0 }) {
  return (
    <div className="globe-scanner">
      <div className="globe-scanner__glow globe-scanner__glow--primary" />
      <div className="globe-scanner__glow globe-scanner__glow--secondary" />
      <div className="globe-scanner__vignette" />

      <div className="globe-scanner__canvas">
        <Canvas
          camera={{ position: [0, 0.5, 5.4], fov: 42 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        >
          <SceneContent isScanning={isScanning} scanStep={scanStep} />
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            enabled={!isScanning}
            enableDamping
            dampingFactor={0.06}
            rotateSpeed={0.45}
            maxPolarAngle={Math.PI / 2 + 0.15}
            minPolarAngle={Math.PI / 5}
          />
        </Canvas>
      </div>

      <style>{`
        .globe-scanner {
          width: 100%;
          height: 100%;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(ellipse 90% 80% at 50% 45%, #081828 0%, #030c18 40%, #010408 100%);
          overflow: hidden;
        }
        .globe-scanner__glow {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          z-index: 1;
        }
        .globe-scanner__glow--primary {
          width: min(80vw, 700px);
          height: min(80vw, 700px);
          background: radial-gradient(circle, rgba(0, 229, 255, 0.12) 0%, rgba(99, 202, 183, 0.08) 30%, rgba(30, 80, 120, 0.04) 55%, transparent 75%);
          filter: blur(60px);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -52%);
          animation: globe-pulse 6s ease-in-out infinite;
        }
        .globe-scanner__glow--secondary {
          width: min(50vw, 440px);
          height: min(50vw, 440px);
          background: radial-gradient(circle, rgba(0, 229, 255, 0.15) 0%, rgba(99, 202, 183, 0.06) 40%, transparent 70%);
          filter: blur(40px);
          top: 48%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation: globe-pulse 4s ease-in-out 1s infinite;
        }

        .globe-scanner__vignette {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 3;
          background: radial-gradient(ellipse 95% 90% at 50% 50%, transparent 30%, rgba(2, 8, 20, 0.6) 100%);
        }
        .globe-scanner__canvas {
          width: 100%;
          height: 100%;
          z-index: 2;
          position: relative;
        }
        @keyframes globe-pulse {
          0%, 100% { opacity: 0.7; transform: translate(-50%, -52%) scale(1); }
          50% { opacity: 1; transform: translate(-50%, -52%) scale(1.06); }
        }
      `}</style>
    </div>
  )
}
