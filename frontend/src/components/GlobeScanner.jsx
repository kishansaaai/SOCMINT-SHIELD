import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { latLonToVector3 } from '../utils/geoUtils'
import { PLATFORMS } from '../utils/platformConfig'

const GLOBE_RADIUS = 1.8

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

// ─── Enhanced continent polygons for realistic coastlines ──────────────────────
const CONTINENT_POLYGONS = [
  // North America
  [
    [-170, 65], [-162, 63], [-155, 60], [-148, 62], [-142, 64], [-138, 60],
    [-135, 56], [-130, 54], [-126, 49], [-124, 46], [-122, 42], [-120, 37],
    [-118, 34], [-117, 32], [-114, 30], [-110, 25], [-105, 20], [-100, 19],
    [-97, 17], [-93, 16], [-88, 15], [-86, 12], [-84, 10], [-82, 9],
    [-80, 8], [-78, 9], [-77, 15], [-76, 20], [-77, 24], [-80, 25],
    [-82, 27], [-81, 30], [-79, 32], [-76, 35], [-74, 40], [-70, 42],
    [-67, 44], [-65, 46], [-60, 47], [-56, 49], [-54, 51], [-56, 54],
    [-60, 58], [-65, 60], [-70, 64], [-78, 68], [-85, 70], [-95, 73],
    [-105, 75], [-120, 73], [-135, 71], [-150, 68], [-165, 66], [-170, 65]
  ],
  // Greenland
  [
    [-60, 78], [-50, 83], [-40, 83], [-25, 82], [-18, 78], [-18, 73],
    [-22, 70], [-30, 67], [-40, 62], [-45, 60], [-50, 61], [-55, 65],
    [-58, 70], [-60, 75], [-60, 78]
  ],
  // South America
  [
    [-80, 10], [-75, 12], [-70, 12], [-63, 10], [-58, 5], [-52, 3],
    [-50, 0], [-48, -2], [-42, -3], [-38, -5], [-36, -8], [-35, -12],
    [-37, -15], [-40, -18], [-42, -22], [-45, -25], [-48, -28],
    [-53, -32], [-57, -35], [-62, -38], [-65, -42], [-68, -46],
    [-70, -50], [-73, -53], [-75, -52], [-74, -48], [-72, -44],
    [-71, -38], [-70, -30], [-72, -22], [-75, -15], [-77, -10],
    [-79, -5], [-80, 0], [-81, 5], [-80, 10]
  ],
  // Africa
  [
    [-17, 15], [-16, 20], [-17, 25], [-14, 28], [-10, 32], [-5, 35],
    [-2, 36], [5, 37], [10, 37], [12, 35], [15, 32], [20, 32],
    [25, 31], [30, 31], [33, 30], [35, 28], [38, 22], [40, 16],
    [43, 12], [45, 10], [48, 8], [50, 11], [50, 8], [47, 4],
    [44, 0], [42, -4], [41, -8], [40, -12], [37, -18], [35, -22],
    [33, -27], [30, -32], [27, -34], [22, -34], [18, -34],
    [16, -30], [14, -22], [12, -12], [10, -4], [9, 0], [8, 4],
    [5, 5], [2, 5], [-2, 5], [-6, 5], [-10, 7], [-14, 10], [-17, 15]
  ],
  // Europe
  [
    [-10, 36], [-9, 38], [-9, 42], [-8, 44], [-4, 44], [-2, 43],
    [0, 44], [3, 43], [5, 44], [7, 47], [5, 48], [3, 50], [4, 52],
    [7, 54], [9, 55], [12, 55], [14, 54], [18, 55], [20, 54],
    [22, 55], [24, 55], [28, 55], [30, 57], [28, 60], [24, 60],
    [22, 62], [20, 64], [25, 71], [30, 70],
    [32, 65], [35, 60], [40, 56], [42, 52], [40, 48], [38, 44],
    [35, 42], [30, 38], [28, 36], [25, 35], [20, 35], [15, 38],
    [13, 44], [14, 46], [12, 48], [10, 48], [8, 48],
    [-5, 48], [-8, 47], [-10, 44], [-10, 36]
  ],
  // Russia / Northern Asia
  [
    [40, 56], [45, 58], [50, 60], [55, 62], [60, 64], [70, 68],
    [80, 70], [90, 72], [100, 73], [110, 74], [120, 73], [130, 72],
    [140, 72], [150, 68], [160, 65], [170, 64], [180, 65],
    [180, 55], [170, 52], [160, 50], [150, 48], [140, 46],
    [130, 43], [120, 42], [110, 42], [100, 44], [90, 46],
    [80, 48], [70, 50], [60, 52], [50, 53], [42, 52], [40, 56]
  ],
  // Middle East + Central Asia
  [
    [25, 35], [30, 38], [35, 40], [38, 42], [40, 44], [42, 42],
    [44, 40], [48, 38], [52, 36], [55, 32], [58, 28], [62, 25],
    [64, 24], [66, 27], [68, 30], [70, 33], [72, 36], [75, 38],
    [70, 42], [68, 44], [70, 46], [75, 48], [80, 48],
    [78, 35], [75, 30], [72, 28], [70, 25], [68, 22],
    [66, 24], [60, 22], [56, 24], [52, 24], [50, 26],
    [48, 28], [44, 30], [40, 30], [38, 28], [35, 28], [33, 30],
    [30, 31], [25, 31], [25, 35]
  ],
  // India
  [
    [68, 24], [67, 22], [68, 20], [70, 18], [72, 16], [73, 14],
    [74, 12], [75, 10], [77, 8], [78, 9], [79, 11], [80, 13],
    [80, 15], [82, 17], [84, 19], [86, 21], [88, 22], [89, 24],
    [92, 22], [92, 26], [90, 28], [88, 27], [85, 25], [82, 24],
    [80, 26], [78, 28], [75, 30], [72, 33], [70, 32], [68, 30],
    [66, 27], [68, 24]
  ],
  // East Asia (China etc.)
  [
    [80, 48], [85, 46], [90, 46], [95, 44], [100, 44], [105, 42],
    [110, 42], [115, 38], [118, 35], [120, 32], [122, 30],
    [120, 26], [118, 24], [116, 22], [112, 20], [108, 20],
    [106, 22], [104, 22], [100, 25], [96, 28], [92, 28],
    [88, 28], [85, 30], [82, 32], [78, 35], [75, 38],
    [72, 40], [70, 42], [68, 44], [70, 46], [75, 48], [80, 48]
  ],
  // Southeast Asia mainland
  [
    [92, 26], [95, 22], [98, 20], [100, 16], [102, 14], [104, 12],
    [106, 10], [107, 12], [108, 16], [108, 20], [106, 22],
    [104, 18], [100, 18], [98, 22], [95, 24], [92, 26]
  ],
  // Australia
  [
    [113, -22], [115, -25], [115, -30], [117, -34], [120, -35],
    [125, -37], [130, -36], [135, -35], [138, -36], [142, -38],
    [146, -38], [150, -37], [152, -33], [153, -28], [151, -24],
    [148, -20], [145, -16], [142, -14], [138, -12], [134, -12],
    [130, -14], [126, -18], [122, -18], [118, -20], [115, -20], [113, -22]
  ],
  // Japan
  [
    [130, 31], [131, 33], [133, 34], [135, 35], [136, 37],
    [139, 38], [140, 40], [141, 42], [143, 44], [145, 44],
    [144, 42], [142, 40], [140, 38], [138, 35], [135, 33],
    [132, 31], [130, 31]
  ],
  // Great Britain
  [
    [-6, 50], [-5, 52], [-4, 54], [-3, 55], [-5, 57], [-4, 58],
    [-2, 58], [0, 57], [2, 56], [2, 53], [1, 51], [0, 50], [-3, 50], [-6, 50]
  ],
  // Indonesia
  [
    [95, 6], [98, 4], [100, 2], [104, -2], [106, -6], [108, -7],
    [110, -8], [115, -8], [118, -8], [120, -6], [124, -8],
    [128, -6], [130, -4], [135, -3], [140, -5], [142, -8],
    [140, -10], [135, -8], [130, -8], [125, -10], [120, -10],
    [115, -9], [110, -9], [106, -8], [104, -6], [100, -2],
    [97, 2], [95, 6]
  ],
  // Madagascar
  [
    [44, -12], [46, -14], [48, -16], [50, -20], [50, -24],
    [48, -25], [46, -24], [44, -20], [43, -16], [44, -12]
  ],
  // Korean Peninsula
  [
    [126, 34], [127, 36], [128, 38], [129, 39], [128, 40],
    [126, 39], [125, 38], [126, 36], [126, 34]
  ],
  // Scandinavia
  [
    [5, 58], [8, 60], [10, 62], [12, 64], [14, 66], [16, 68],
    [18, 69], [22, 70], [26, 70], [30, 70], [30, 68], [28, 65],
    [24, 62], [20, 60], [18, 58], [14, 57], [10, 56], [8, 57], [5, 58]
  ],
  // Italy
  [
    [8, 44], [10, 44], [12, 44], [14, 42], [16, 41], [18, 40],
    [16, 38], [14, 37], [12, 38], [10, 40], [8, 42], [8, 44]
  ],
  // New Zealand
  [
    [166, -34], [168, -36], [172, -38], [176, -42], [178, -44],
    [178, -46], [176, -47], [172, -45], [170, -42], [168, -38],
    [166, -36], [166, -34]
  ],
  // Antarctica
  [
    [-180, -65], [-120, -70], [-60, -68], [0, -70], [60, -68],
    [120, -70], [180, -65], [180, -90], [-180, -90], [-180, -65]
  ]
]

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getCoordsForPlatform(name, index) {
  if (PLATFORM_COORDS[name]) return PLATFORM_COORDS[name]
  const lat = -30 + (index * 23) % 90
  const lon = -150 + (index * 47) % 300
  return { lat, lon }
}

function subdividePolygon(poly, subdivisions = 4) {
  const result = []
  for (let i = 0; i < poly.length; i++) {
    const [lon1, lat1] = poly[i]
    const nextIdx = (i + 1) % poly.length
    const [lon2, lat2] = poly[nextIdx]
    for (let s = 0; s < subdivisions; s++) {
      const t = s / subdivisions
      result.push([lon1 + (lon2 - lon1) * t, lat1 + (lat2 - lat1) * t])
    }
  }
  return result
}

// Build a shared canvas for land-mask testing
function buildLandMask() {
  const W = 720, H = 360
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#fff'
  CONTINENT_POLYGONS.forEach(poly => {
    ctx.beginPath()
    poly.forEach((pt, i) => {
      const x = (pt[0] + 180) * 2
      const y = (90 - pt[1]) * 2
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
    })
    ctx.closePath()
    ctx.fill()
  })
  return ctx.getImageData(0, 0, W, H).data
}

function generateContinentPoints() {
  const imgData = buildLandMask()
  const W = 720, H = 360
  const points = []
  const numLat = 200

  for (let i = 0; i < numLat; i++) {
    const lat = -90 + (i / (numLat - 1)) * 180
    const rad = Math.cos(lat * Math.PI / 180)
    const numLon = Math.max(1, Math.round(400 * rad))
    for (let j = 0; j < numLon; j++) {
      const lon = -180 + (j / numLon) * 360
      const x = Math.min(W - 1, Math.max(0, Math.round((lon + 180) * 2)))
      const y = Math.min(H - 1, Math.max(0, Math.round((90 - lat) * 2)))
      const idx = (y * W + x) * 4
      if (imgData[idx] > 128) {
        const v = latLonToVector3(lat, lon, GLOBE_RADIUS)
        points.push(v.x, v.y, v.z)
      }
    }
  }
  return new Float32Array(points)
}

function generateOceanPoints(count = 2500) {
  const imgData = buildLandMask()
  const W = 720, H = 360
  const points = []
  let seed = 42
  const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }

  for (let attempt = 0; attempt < count * 6 && points.length / 3 < count; attempt++) {
    const lat = -75 + rng() * 150
    const lon = -180 + rng() * 360
    const x = Math.min(W - 1, Math.max(0, Math.round((lon + 180) * 2)))
    const y = Math.min(H - 1, Math.max(0, Math.round((90 - lat) * 2)))
    const idx = (y * W + x) * 4
    if (imgData[idx] < 128) {
      const v = latLonToVector3(lat, lon, GLOBE_RADIUS)
      points.push(v.x, v.y, v.z)
    }
  }
  return new Float32Array(points)
}

// ─── Continent Coastline Outlines ──────────────────────────────────────────────

function ContinentOutlines() {
  const geometries = useMemo(() => {
    return CONTINENT_POLYGONS.map(poly => {
      const subdivided = subdividePolygon(poly, 5)
      const pts = subdivided.map(([lon, lat]) => {
        const v = latLonToVector3(lat, lon, GLOBE_RADIUS + 0.004)
        return new THREE.Vector3(v.x, v.y, v.z)
      })
      // close the loop
      if (pts.length > 0) pts.push(pts[0].clone())
      const g = new THREE.BufferGeometry().setFromPoints(pts)
      return g
    })
  }, [])

  return (
    <group>
      {/* Bright inner outline */}
      {geometries.map((geom, i) => (
        <line key={`o-${i}`} geometry={geom}>
          <lineBasicMaterial
            attach="material"
            color="#00e8cc"
            transparent
            opacity={0.92}
          />
        </line>
      ))}
      {/* Softer glow outline rendered slightly above */}
      {geometries.map((geom, i) => {
        const glowGeom = geom.clone()
        return (
          <line key={`g-${i}`} geometry={glowGeom}>
            <lineBasicMaterial
              attach="material"
              color="#00f0ff"
              transparent
              opacity={0.25}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </line>
        )
      })}
    </group>
  )
}

// ─── Atmosphere Fresnel Glow ───────────────────────────────────────────────────

function AtmosphereGlow() {
  const material = useMemo(() => new THREE.ShaderMaterial({
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
        float intensity = pow(rim, 6.0);
        vec3 color = mix(vec3(0.0, 0.35, 0.6), vec3(0.0, 0.7, 1.0), rim);
        gl_FragColor = vec4(color, intensity * 0.3);
      }
    `,
    transparent: true,
    side: THREE.BackSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }), [])

  return (
    <mesh>
      <sphereGeometry args={[GLOBE_RADIUS * 1.04, 64, 64]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

// ─── Magnifying Glass ──────────────────────────────────────────────────────────

function MagnifyingGlass({ activeIdx, globeRef, transitionVal }) {
  const ref = useRef()
  const localPos = useRef(new THREE.Vector3(-2.0, -1.2, 1.5))

  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.getElapsedTime()

    const targetPos = new THREE.Vector3()
    if (globeRef.current && transitionVal.current > 0.01) {
      const activeIdxNorm = activeIdx % PLATFORMS.length
      const currentPlatform = PLATFORMS[activeIdxNorm]
      const coords = getCoordsForPlatform(currentPlatform.name, activeIdxNorm)
      const localV = latLonToVector3(coords.lat, coords.lon, GLOBE_RADIUS + 0.65)
      targetPos.set(localV.x, localV.y, localV.z)
      globeRef.current.localToWorld(targetPos)
    } else {
      targetPos.set(-2.0, -1.2, 1.5)
    }

    const idlePos = new THREE.Vector3(-2.0, -1.2, 1.5)
    localPos.current.lerpVectors(idlePos, targetPos, transitionVal.current)
    ref.current.position.copy(localPos.current)

    const qIdle = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 4, 0.3, Math.PI / 6))
    const lookMat = new THREE.Matrix4().lookAt(localPos.current, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0))
    const qScan = new THREE.Quaternion().setFromRotationMatrix(lookMat)
    const qOffset = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0))
    qScan.multiply(qOffset)

    const currentQuat = new THREE.Quaternion().slerpQuaternions(qIdle, qScan, transitionVal.current)
    ref.current.quaternion.copy(currentQuat)

    if (transitionVal.current > 0.05) {
      ref.current.rotateY(Math.sin(t * 8) * 0.05 * transitionVal.current)
    }
  })

  return (
    <group ref={ref}>
      {/* Lens rim */}
      <mesh>
        <torusGeometry args={[0.32, 0.024, 8, 24]} />
        <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={0.8} roughness={0.1} />
      </mesh>
      {/* Handle */}
      <mesh position={[0, -0.52, 0]}>
        <cylinderGeometry args={[0.015, 0.02, 0.44, 8]} />
        <meshStandardMaterial color="#00ffff" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Lens glass */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.29, 0.29, 0.008, 16]} />
        <meshStandardMaterial color="#00ffff" transparent opacity={0.25} roughness={0} />
      </mesh>
      {/* Scanning light cone */}
      <mesh position={[0, 0, -0.6]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.32, 1.2, 16, 1, true]} />
        <meshBasicMaterial color="#00ffff" transparent opacity={0.18 * (transitionVal?.current || 0)} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  )
}

// ─── Platform Marker ───────────────────────────────────────────────────────────

function PlatformMarker({ platform, found, index }) {
  const groupRef = useRef()
  const meshRef = useRef()
  const ringRef = useRef()
  const coords = useMemo(() => getCoordsForPlatform(platform.platform, index), [platform.platform, index])
  const pos = useMemo(() => {
    const v = latLonToVector3(coords.lat, coords.lon, GLOBE_RADIUS)
    return new THREE.Vector3(v.x, v.y, v.z)
  }, [coords])

  useEffect(() => {
    if (groupRef.current) groupRef.current.lookAt(0, 0, 0)
  }, [pos])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() + index * 0.5
    if (meshRef.current) {
      meshRef.current.scale.setScalar(found ? 1 + Math.sin(t * 5) * 0.25 : 0.8)
    }
    if (ringRef.current && found) {
      ringRef.current.scale.setScalar(1 + (Math.sin(t * 3) * 0.5 + 0.5) * 1.5)
      ringRef.current.material.opacity = 0.5 - (Math.sin(t * 3) * 0.5 + 0.5) * 0.5
    }
  })

  return (
    <group position={pos} ref={groupRef}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.028, 8, 8]} />
        <meshBasicMaterial color={found ? '#00ffdd' : '#ff4444'} />
      </mesh>
      {found && (
        <>
          <mesh ref={ringRef}>
            <ringGeometry args={[0.035, 0.07, 16]} />
            <meshBasicMaterial color="#00ffdd" transparent opacity={0.5} side={THREE.DoubleSide} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.18]}>
            <cylinderGeometry args={[0.004, 0.012, 0.36, 8, 1, true]} />
            <meshBasicMaterial color="#00ffdd" transparent opacity={0.25} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        </>
      )}
    </group>
  )
}

// ─── Connection Arc (Red/Orange) ───────────────────────────────────────────────

function ConnectionArc({ fromName, toName, color = '#ff4444', index, opacity }) {
  const pulseRef = useRef()

  const fromCoords = PLATFORM_COORDS[fromName] || getCoordsForPlatform(fromName, 0)
  const toCoords = PLATFORM_COORDS[toName] || getCoordsForPlatform(toName, 1)

  const { curve, lineGeom } = useMemo(() => {
    const p1 = latLonToVector3(fromCoords.lat, fromCoords.lon, GLOBE_RADIUS)
    const p2 = latLonToVector3(toCoords.lat, toCoords.lon, GLOBE_RADIUS)
    const v1 = new THREE.Vector3(p1.x, p1.y, p1.z)
    const v2 = new THREE.Vector3(p2.x, p2.y, p2.z)
    const mid = new THREE.Vector3().addVectors(v1, v2).multiplyScalar(0.5)
    const dist = v1.distanceTo(v2)
    mid.addScaledVector(mid.clone().normalize(), dist * 0.3)
    const qCurve = new THREE.QuadraticBezierCurve3(v1, mid, v2)
    const pts = qCurve.getPoints(40)
    return { curve: qCurve, lineGeom: new THREE.BufferGeometry().setFromPoints(pts) }
  }, [fromCoords, toCoords])

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    if (pulseRef.current) {
      const speed = 0.4 + (index * 0.06) % 0.3
      const progress = (t * speed) % 1.0
      pulseRef.current.position.copy(curve.getPointAt(progress))
    }
  })

  return (
    <group>
      <line geometry={lineGeom}>
        <lineBasicMaterial attach="material" color={color} transparent opacity={opacity * 0.45} />
      </line>
      {/* Brighter glow duplicate */}
      <line geometry={lineGeom.clone()}>
        <lineBasicMaterial attach="material" color={color} transparent opacity={opacity * 0.15} blending={THREE.AdditiveBlending} depthWrite={false} />
      </line>
      <mesh ref={pulseRef}>
        <sphereGeometry args={[0.028, 8, 8]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={opacity * 0.9} />
      </mesh>
    </group>
  )
}

// ─── Small Orbit Ring ──────────────────────────────────────────────────────────

function SmallOrbitRing({ radius, tiltX, tiltZ, speed, color, opacity }) {
  const groupRef = useRef()
  const dotRef = useRef()

  const ringGeom = useMemo(() => {
    const pts = []
    for (let i = 0; i <= 64; i++) {
      const angle = (i / 64) * Math.PI * 2
      pts.push(new THREE.Vector3(radius * Math.cos(angle), 0, radius * Math.sin(angle)))
    }
    return new THREE.BufferGeometry().setFromPoints(pts)
  }, [radius])

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    if (groupRef.current) groupRef.current.rotation.y = t * speed
    if (dotRef.current) {
      const angle = t * speed * 2
      dotRef.current.position.set(radius * Math.cos(angle), 0, radius * Math.sin(angle))
    }
  })

  return (
    <group rotation={[tiltX, 0, tiltZ]}>
      <group ref={groupRef}>
        <lineLoop geometry={ringGeom}>
          <lineBasicMaterial attach="material" color={color} transparent opacity={opacity * 0.5} />
        </lineLoop>
        <mesh ref={dotRef}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshBasicMaterial color={color} transparent opacity={opacity * 0.9} />
        </mesh>
      </group>
    </group>
  )
}

// ─── Main Scene Content ────────────────────────────────────────────────────────

function SceneContent({ isScanning, scanStep }) {
  const globeRef = useRef()
  const transitionVal = useRef(0)

  const continentPoints = useMemo(() => generateContinentPoints(), [])
  const oceanPoints = useMemo(() => generateOceanPoints(2500), [])

  useFrame((state) => {
    const target = isScanning ? 1.0 : 0.0
    transitionVal.current = THREE.MathUtils.lerp(transitionVal.current, target, 0.05)

    if (globeRef.current) {
      globeRef.current.rotation.y += 0.0018
    }

    const idleCamPos = new THREE.Vector3(0, 0.8, 5.2)
    const scanCamPos = new THREE.Vector3(0, 0, 4.0)
    const targetCamPos = isScanning ? scanCamPos : idleCamPos
    state.camera.position.lerp(targetCamPos, 0.04)
    state.camera.lookAt(0, 0, 0)
  })

  const CONNECTIONS = useMemo(() => [
    { from: 'GitHub', to: 'Telegram', color: '#ff4444' },
    { from: 'Instagram', to: 'TikTok', color: '#ff6622' },
    { from: 'YouTube', to: 'LinkedIn', color: '#ff8844' },
    { from: 'Reddit', to: 'Telegram', color: '#ff3333' },
    { from: 'Snapchat', to: 'Steam', color: '#ff6622' },
    { from: 'Discord', to: 'TikTok', color: '#ff4444' },
    { from: 'Facebook', to: 'LinkedIn', color: '#ff8844' },
    { from: 'ShareChat', to: 'GitHub', color: '#ff5533' },
  ], [])

  return (
    <group>
      <ambientLight intensity={0.35} />
      <pointLight position={[8, 8, 8]} intensity={0.6} color="#88ccff" />
      <pointLight position={[-5, -3, 5]} intensity={0.3} color="#0066ff" />

      {/* Tilted globe group — Earth's axial tilt */}
      <group rotation={[0.35, 0, -0.08]}>

        {/* Rotating globe */}
        <group ref={globeRef}>
          {/* Dark core sphere */}
          <mesh>
            <sphereGeometry args={[GLOBE_RADIUS - 0.01, 64, 64]} />
            <meshBasicMaterial color="#020a18" transparent opacity={0.96} />
          </mesh>

          {/* Very subtle wireframe grid (almost invisible) */}
          <mesh>
            <sphereGeometry args={[GLOBE_RADIUS + 0.002, 36, 36]} />
            <meshBasicMaterial color="#003355" wireframe transparent opacity={0.04} depthWrite={false} />
          </mesh>

          {/* Dense continent dot matrix */}
          <points>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[continentPoints, 3]} />
            </bufferGeometry>
            <pointsMaterial
              color="#00e8d0"
              size={0.028}
              sizeAttenuation
              transparent
              opacity={0.82}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </points>

          {/* Brighter core glow layer of continent dots */}
          <points>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[continentPoints, 3]} />
            </bufferGeometry>
            <pointsMaterial
              color="#00ffff"
              size={0.016}
              sizeAttenuation
              transparent
              opacity={0.5}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </points>

          {/* Sparse ocean dots */}
          <points>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[oceanPoints, 3]} />
            </bufferGeometry>
            <pointsMaterial
              color="#003366"
              size={0.01}
              sizeAttenuation
              transparent
              opacity={0.22}
              depthWrite={false}
            />
          </points>

          {/* Coastline outlines */}
          <ContinentOutlines />

          {/* Platform markers */}
          {PLATFORMS.map((p, i) => {
            const isPassed = i <= scanStep && isScanning
            const found = (i * 7) % 3 === 0
            return (
              <PlatformMarker
                key={p.id}
                platform={{ platform: p.name }}
                found={isPassed && found}
                index={i}
              />
            )
          })}

          {/* Red/Orange connection arcs */}
          {CONNECTIONS.map((conn, idx) => (
            <ConnectionArc
              key={idx}
              fromName={conn.from}
              toName={conn.to}
              color={conn.color}
              index={idx}
              opacity={Math.max(0.35, transitionVal.current)}
            />
          ))}
        </group>

        {/* Atmosphere Fresnel glow (inside tilt group, outside rotation) */}
        <AtmosphereGlow />

        {/* Secondary atmosphere layer */}
        <mesh>
          <sphereGeometry args={[GLOBE_RADIUS + 0.06, 64, 64]} />
          <meshBasicMaterial color="#004466" transparent opacity={0.08} side={THREE.BackSide} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>

      {/* Small coloured orbit indicators near the north pole */}
      <group position={[0, GLOBE_RADIUS * 0.95, 0]}>
        <SmallOrbitRing radius={0.22} tiltX={0.3} tiltZ={0.1} speed={0.6} color="#ff4444" opacity={0.85} />
        <SmallOrbitRing radius={0.18} tiltX={-0.2} tiltZ={0.3} speed={-0.5} color="#44ff44" opacity={0.75} />
        <SmallOrbitRing radius={0.14} tiltX={0.1} tiltZ={-0.2} speed={0.8} color="#4488ff" opacity={0.8} />
      </group>

      {/* Magnifying Glass — preserved from original */}
      <MagnifyingGlass
        activeIdx={scanStep}
        globeRef={globeRef}
        transitionVal={transitionVal}
      />
    </group>
  )
}

// ─── Export ────────────────────────────────────────────────────────────────────

export default function GlobeScanner({ isScanning, scanStep = 0 }) {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#030810',
      overflow: 'hidden'
    }}>
      {/* Soft cyan nebula glow */}
      <div style={{
        position: 'absolute',
        width: '600px',
        height: '600px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0, 180, 220, 0.12) 0%, rgba(0, 100, 180, 0.04) 40%, transparent 70%)',
        filter: 'blur(40px)',
        pointerEvents: 'none',
        zIndex: 1
      }} />

      {/* Subtle deep blue accent */}
      <div style={{
        position: 'absolute',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0, 60, 140, 0.1) 0%, transparent 65%)',
        filter: 'blur(30px)',
        pointerEvents: 'none',
        zIndex: 1
      }} />

      {/* 3D Canvas */}
      <div style={{ width: '100%', height: '100%', zIndex: 2, position: 'relative' }}>
        <Canvas
          camera={{ position: [0, 0.8, 5.2], fov: 48 }}
          style={{ background: 'transparent' }}
          gl={{ antialias: true, alpha: true }}
        >
          <SceneContent isScanning={isScanning} scanStep={scanStep} />
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            enabled={!isScanning}
            maxPolarAngle={Math.PI / 2 + 0.2}
            minPolarAngle={Math.PI / 5}
          />
        </Canvas>
      </div>
    </div>
  )
}
