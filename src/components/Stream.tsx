import { useRef, useMemo } from 'react'
import { MeshTransmissionMaterial } from '@react-three/drei'
import * as THREE from 'three'

export function Stream() {
  const meshRef = useRef<THREE.Mesh>(null)

  const rockMaterial = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
        color: '#5a5a5a',
        roughness: 0.8,
        flatShading: false,
    })

    mat.onBeforeCompile = (shader) => {
        shader.vertexShader = `
            varying vec3 vWorldPos;
            ${shader.vertexShader}
        `

        shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            `
            #include <begin_vertex>

            // Simple 3D noise function or just combination of sines
            float noise = sin(position.x * 3.0) * cos(position.y * 4.0 + position.z * 2.0);
            float noise2 = cos(position.x * 5.0 + position.z * 4.0) * 0.5;

            // Displace along normal
            float displacement = (noise + noise2) * 0.15;
            transformed += normal * displacement;

            vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
            `
        )

        shader.fragmentShader = `
            varying vec3 vWorldPos;
            ${shader.fragmentShader}
        `

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <color_fragment>',
            `
            #include <color_fragment>

            // Procedural rock texture
            float n = sin(vWorldPos.x * 10.0) * cos(vWorldPos.z * 10.0);
            float n2 = sin(vWorldPos.y * 20.0 + vWorldPos.x * 5.0);

            vec3 rockColor = diffuseColor.rgb;

            // Add some mossy patches
            float mossNoise = sin(vWorldPos.x * 2.0) * cos(vWorldPos.z * 2.0);
            if (mossNoise > 0.5 && vWorldPos.y > 0.1) { // Moss on top
                 rockColor = mix(rockColor, vec3(0.2, 0.3, 0.15), 0.5);
            }

            // Add speckles
            float speckle = fract(sin(dot(vWorldPos.xyz, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
            if (speckle > 0.9) rockColor *= 0.8;
            if (speckle < 0.1) rockColor *= 1.2;

            diffuseColor.rgb = rockColor;
            `
        )
    }
    return mat
  }, [])

  // Generate stable rocks
  const rocks = useMemo(() => {
      return [...Array(25)].map(() => {
          const scaleX = 0.3 + Math.random() * 0.4
          const scaleZ = 0.3 + Math.random() * 0.4
          const scaleY = 0.2 + Math.random() * 0.2

          return {
              position: [
                  (Math.random() - 0.5) * 12,
                  scaleY * 0.3, // Embed in ground
                  (Math.random() - 0.5) * 80
              ] as [number, number, number],
              scale: [scaleX, scaleY, scaleZ] as [number, number, number],
              rotation: [
                  (Math.random() - 0.5) * 0.5, // More random tilt
                  Math.random() * Math.PI * 2,
                  (Math.random() - 0.5) * 0.5
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
            samples={6}
            thickness={0.5}
            roughness={0.1}
            ior={1.33}
            chromaticAberration={0.03}
            anisotropy={0.5}
            distortion={0.5}
            distortionScale={0.5}
            temporalDistortion={0.2}
            color="#8fbcd4"
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
            material={rockMaterial}
          >
              <icosahedronGeometry args={[1, 2]} />
          </mesh>
      ))}
    </group>
  )
}
