import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import * as THREE from 'three'

export function Environment() {
  const { scene } = useThree()

  useEffect(() => {
    // Light mist, warm white/grey
    const fogColor = new THREE.Color('#dcdcdc')
    scene.fog = new THREE.FogExp2(fogColor, 0.02)
    scene.background = fogColor
  }, [scene])

  return (
    <>
      {/* Soft ambient light */}
      <ambientLight intensity={0.4} color="#ffffff" />

      {/* Sun/Moon light - warm */}
      <directionalLight
        castShadow
        position={[15, 25, 10]}
        intensity={1.2}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0001}
        color="#fff0d0"
      >
        <orthographicCamera attach="shadow-camera" args={[-30, 30, 30, -30]} />
      </directionalLight>

      {/* Ground - Mossy Green */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#4a5d3f" roughness={0.9} metalness={0.1} />
      </mesh>
    </>
  )
}
