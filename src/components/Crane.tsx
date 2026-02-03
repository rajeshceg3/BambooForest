import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export function Crane(props: any) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (groupRef.current) {
        // Subtle neck movement
        const neck = groupRef.current.getObjectByName('neck')
        if (neck) {
            neck.rotation.z = Math.sin(state.clock.getElapsedTime() * 0.5) * 0.1
        }
    }
  })

  return (
    <group ref={groupRef} {...props}>
      {/* Body */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <boxGeometry args={[0.3, 0.4, 0.6]} />
        <meshStandardMaterial color="#ffffff" roughness={0.8} />
      </mesh>
      {/* Neck */}
      <mesh name="neck" position={[0, 1.2, 0.3]} rotation={[0, 0, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.08, 0.8]} />
        <meshStandardMaterial color="#ffffff" roughness={0.8} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.6, 0.35]} castShadow>
        <boxGeometry args={[0.1, 0.1, 0.2]} />
        <meshStandardMaterial color="#ffffff" roughness={0.8} />
      </mesh>
      {/* Legs */}
      <mesh position={[0.1, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.8]} />
        <meshStandardMaterial color="#333333" roughness={0.8} />
      </mesh>
      <mesh position={[-0.1, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.8]} />
        <meshStandardMaterial color="#333333" roughness={0.8} />
      </mesh>
    </group>
  )
}
