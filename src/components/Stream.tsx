import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export function Stream() {
  const meshRef = useRef<THREE.Mesh>(null)

  const material = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#a0c0d0',
      transparent: true,
      opacity: 0.6,
      roughness: 0.1,
      metalness: 0.5,
    })
  }, [])

  useFrame((state) => {
    if (meshRef.current) {
        // Subtle movement
        (meshRef.current.material as THREE.MeshStandardMaterial).normalScale.set(
            1 + Math.sin(state.clock.getElapsedTime()) * 0.1,
            1 + Math.cos(state.clock.getElapsedTime()) * 0.1
        )
    }
  })

  return (
    <group position={[-15, 0.05, 0]} rotation={[0, Math.PI / 4, 0]}>
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[10, 100]} />
        <primitive object={material} attach="material" />
      </mesh>

      {/* Some rocks near the stream */}
      {[...Array(20)].map((_, i) => (
          <mesh
            key={i}
            position={[
                (Math.random() - 0.5) * 12,
                0.2,
                (Math.random() - 0.5) * 80
            ]}
            scale={0.2 + Math.random() * 0.4}
          >
              <dodecahedronGeometry />
              <meshStandardMaterial color="#666666" roughness={0.8} />
          </mesh>
      ))}
    </group>
  )
}
