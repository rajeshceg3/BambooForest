import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export function Crane(props: any) {
  const groupRef = useRef<THREE.Group>(null)

  // Material (White feathers)
  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#f0f0f0",
    roughness: 0.9,
    metalness: 0.1,
  }), [])

  // Dark legs/beak
  const darkMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#1a1a1a",
    roughness: 0.8,
  }), [])

  // Red crown
  const redMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: "#cc0000",
    roughness: 0.8,
  }), [])

  useFrame((state) => {
    if (groupRef.current) {
        const t = state.clock.getElapsedTime()

        // Idle sway (very subtle breathing/balance) on inner group
        const inner = groupRef.current.getObjectByName('innerGroup')
        if (inner) {
            inner.position.y = Math.sin(t * 1.5) * 0.005
        }

        // Neck/Head animation
        const neckGroup = groupRef.current.getObjectByName('neckGroup')
        if (neckGroup) {
            // Gentle S-curve motion simulation
            neckGroup.rotation.z = Math.sin(t * 0.5) * 0.05
            neckGroup.rotation.x = 0.2 + Math.sin(t * 0.3) * 0.05
        }
    }
  })

  return (
    <group ref={groupRef} {...props}>
      <group name="innerGroup">
          {/* Body - Ovoid */}
          <mesh position={[0, 0.9, 0]} scale={[0.8, 0.7, 1.2]} castShadow>
             <sphereGeometry args={[0.35, 16, 16]} />
             <primitive object={material} attach="material" />
          </mesh>

          {/* Tail Feathers */}
          <mesh position={[0, 0.9, -0.4]} rotation={[-1.8, 0, 0]} castShadow>
             <coneGeometry args={[0.15, 0.4, 16]} />
             <primitive object={material} attach="material" />
          </mesh>

          {/* Neck Group - Articulated */}
          <group name="neckGroup" position={[0, 1.05, 0.3]} rotation={[0.2, 0, 0]}>
             {/* Lower Neck (Tapered Cylinder) */}
             <mesh position={[0, 0.25, 0]} rotation={[-0.1, 0, 0]} castShadow>
                 <cylinderGeometry args={[0.035, 0.06, 0.5, 16]} />
                 <primitive object={material} attach="material" />
             </mesh>

             {/* Upper Neck (Thinner Cylinder) */}
             <mesh position={[0, 0.7, 0.05]} rotation={[0.3, 0, 0]} castShadow>
                 <cylinderGeometry args={[0.025, 0.035, 0.5, 16]} />
                 <primitive object={material} attach="material" />
             </mesh>

             {/* Head Group */}
             <group position={[0, 0.95, 0.15]} rotation={[-0.4, 0, 0]}>
                 {/* Head Sphere */}
                 <mesh castShadow>
                     <sphereGeometry args={[0.07, 16, 16]} />
                     <primitive object={material} attach="material" />
                 </mesh>
                 {/* Red Crown */}
                 <mesh position={[0, 0.06, 0]} castShadow>
                     <sphereGeometry args={[0.03, 16, 16]} />
                     <primitive object={redMaterial} attach="material" />
                 </mesh>
                 {/* Beak */}
                 <mesh position={[0, -0.02, 0.15]} rotation={[Math.PI/2, 0, 0]} castShadow>
                     <coneGeometry args={[0.015, 0.25, 16]} />
                     <primitive object={darkMaterial} attach="material" />
                 </mesh>
             </group>
          </group>

          {/* Legs */}
          <group position={[0, 0.7, 0]}>
            {/* Left Leg */}
            <mesh position={[0.1, -0.45, 0]} castShadow>
                <cylinderGeometry args={[0.015, 0.02, 0.9, 8]} />
                <primitive object={darkMaterial} attach="material" />
            </mesh>
            {/* Right Leg */}
            <mesh position={[-0.1, -0.45, 0]} castShadow>
                <cylinderGeometry args={[0.015, 0.02, 0.9, 8]} />
                <primitive object={darkMaterial} attach="material" />
            </mesh>
            {/* Feet/Toes (Simple cones) */}
            <mesh position={[0.1, -0.9, 0.05]} rotation={[Math.PI/2, 0, 0]} castShadow>
                 <coneGeometry args={[0.02, 0.1, 8]} />
                 <primitive object={darkMaterial} attach="material" />
            </mesh>
            <mesh position={[-0.1, -0.9, 0.05]} rotation={[Math.PI/2, 0, 0]} castShadow>
                 <coneGeometry args={[0.02, 0.1, 8]} />
                 <primitive object={darkMaterial} attach="material" />
            </mesh>
          </group>
      </group>
    </group>
  )
}
