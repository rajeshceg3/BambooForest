import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export function Deer(props: any) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (groupRef.current) {
        // Very slow movement
        groupRef.current.position.x += Math.sin(state.clock.getElapsedTime() * 0.1) * 0.005

        // Head look around
        const head = groupRef.current.getObjectByName('head')
        if (head) {
            head.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.5) * 0.2
            head.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.3) * 0.1
        }
    }
  })

  return (
    <group ref={groupRef} {...props}>
      {/* Body */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <boxGeometry args={[0.6, 0.8, 1.2]} />
        <meshStandardMaterial color="#8b5a2b" roughness={0.8} />
      </mesh>
      {/* Neck */}
      <mesh position={[0, 1.4, 0.5]} rotation={[Math.PI / 4, 0, 0]} castShadow>
        <boxGeometry args={[0.3, 0.8, 0.3]} />
        <meshStandardMaterial color="#8b5a2b" roughness={0.8} />
      </mesh>
      {/* Head */}
      <mesh name="head" position={[0, 1.8, 0.8]} castShadow>
        <boxGeometry args={[0.35, 0.35, 0.5]} />
        <meshStandardMaterial color="#8b5a2b" roughness={0.8} />
      </mesh>
      {/* Legs */}
      <mesh position={[0.2, 0.4, 0.4]} castShadow>
        <boxGeometry args={[0.1, 0.8, 0.1]} />
        <meshStandardMaterial color="#8b5a2b" roughness={0.8} />
      </mesh>
      <mesh position={[-0.2, 0.4, 0.4]} castShadow>
        <boxGeometry args={[0.1, 0.8, 0.1]} />
        <meshStandardMaterial color="#8b5a2b" roughness={0.8} />
      </mesh>
      <mesh position={[0.2, 0.4, -0.4]} castShadow>
        <boxGeometry args={[0.1, 0.8, 0.1]} />
        <meshStandardMaterial color="#8b5a2b" roughness={0.8} />
      </mesh>
      <mesh position={[-0.2, 0.4, -0.4]} castShadow>
        <boxGeometry args={[0.1, 0.8, 0.1]} />
        <meshStandardMaterial color="#8b5a2b" roughness={0.8} />
      </mesh>
    </group>
  )
}
