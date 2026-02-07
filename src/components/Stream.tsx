import { useRef, useMemo } from 'react'
import { MeshTransmissionMaterial } from '@react-three/drei'
import * as THREE from 'three'

export function Stream() {
  const meshRef = useRef<THREE.Mesh>(null)

  // Generate stable rocks
  const rocks = useMemo(() => {
      return [...Array(25)].map(() => {
          const scaleX = 0.3 + Math.random() * 0.4
          const scaleZ = 0.3 + Math.random() * 0.4
          const scaleY = 0.15 + Math.random() * 0.2 // Flattened

          return {
              position: [
                  (Math.random() - 0.5) * 12,
                  scaleY * 0.4, // Embed in ground slightly
                  (Math.random() - 0.5) * 80
              ] as [number, number, number],
              scale: [scaleX, scaleY, scaleZ] as [number, number, number],
              rotation: [
                  (Math.random() - 0.5) * 0.2,
                  Math.random() * Math.PI * 2,
                  (Math.random() - 0.5) * 0.2
              ] as [number, number, number]
          }
      })
  }, [])

  return (
    <group position={[-15, 0.05, 0]} rotation={[0, Math.PI / 4, 0]}>
      {/* Water Surface */}
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[10, 100, 20, 100]} />
        {/* Advanced Transmission Material for realistic water */}
        <MeshTransmissionMaterial
            resolution={512}
            samples={6} // Lower samples for performance, 6 is decent
            thickness={0.5}
            roughness={0.1}
            ior={1.33} // Water IOR
            chromaticAberration={0.03}
            anisotropy={0.5}
            distortion={0.5} // Key for water ripples
            distortionScale={0.5}
            temporalDistortion={0.2} // Animates the distortion
            color="#a0c0d0"
        />
      </mesh>

      {/* River Stones */}
      {rocks.map((rock, i) => (
          <mesh
            key={i}
            position={rock.position}
            scale={rock.scale}
            rotation={rock.rotation}
            receiveShadow
            castShadow
          >
              <icosahedronGeometry args={[1, 1]} />
              <meshStandardMaterial
                color="#5a5a5a"
                roughness={0.7}
              />
          </mesh>
      ))}
    </group>
  )
}
