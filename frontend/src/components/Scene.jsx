import { Suspense, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import City from './City'
import DataBeams from './DataBeams'
import CityParticles from './Particles'
import Rain from './Rain'
import ScanPlane from './ScanPlane'

function CameraRig({ isScanning }) {
  const { camera } = useThree()
  const targetZ = useRef(10)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    // Breathing sway
    camera.position.x = Math.sin(t * 0.18) * 0.12
    // Push forward when scanning
    const wantZ = isScanning ? 8 : 10
    targetZ.current += (wantZ - targetZ.current) * 0.008
    camera.position.z = targetZ.current
    camera.lookAt(0, 1, -5)
  })
  return null
}

export default function Scene({ isScanning, activePlatforms, results }) {
  return (
    <Canvas
      camera={{ fov: 70, position: [0, 3, 10], near: 0.1, far: 200 }}
      style={{ position: 'absolute', inset: 0 }}
      gl={{ antialias: true, alpha: false, toneMapping: 0 }}
      shadows
    >
      {/* Fog */}
      <fogExp2 attach="fog" color="#020817" density={0.038} />

      {/* Lighting */}
      <ambientLight color="#0a0a2e" intensity={0.6} />
      <pointLight color="#00ffff" position={[0, 10, 5]}   intensity={1.0} distance={35} />
      <pointLight color="#ff6600" position={[-10, 5, 0]}  intensity={0.5} distance={25} />
      <pointLight color="#8b00ff" position={[10, 3, -5]}  intensity={0.4} distance={20} />
      <rectAreaLight color="#ff006e" position={[0, 0.1, 4]} width={22} height={1.5} intensity={2.5} rotation={[-Math.PI/2,0,0]} />

      <CameraRig isScanning={isScanning} />

      <Suspense fallback={null}>
        <City />
        <DataBeams activePlatforms={activePlatforms} isScanning={isScanning} />
        <CityParticles />
        <Rain />
        <ScanPlane active={isScanning} />
      </Suspense>

      <EffectComposer>
        <Bloom intensity={0.4} luminanceThreshold={0.35} luminanceSmoothing={0.88} />
      </EffectComposer>

      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minAzimuthAngle={-0.3}
        maxAzimuthAngle={0.3}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 2.2}
        enableDamping
        dampingFactor={0.06}
      />
    </Canvas>
  )
}
