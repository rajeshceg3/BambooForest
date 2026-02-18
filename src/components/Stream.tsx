import { useRef, useMemo } from 'react'
import { MeshTransmissionMaterial } from '@react-three/drei'
import * as THREE from 'three'
import { SimplexNoise } from 'three-stdlib'

// Simple seedable random (LCG)
function mulberry32(a: number) {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
}

export function Stream() {
  const meshRef = useRef<THREE.Mesh>(null)

  const rockMaterial = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
        color: '#5a5a5a',
        roughness: 0.6,
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
            vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
            `
        )

        shader.fragmentShader = `
            varying vec3 vWorldPos;
            ${shader.fragmentShader}
        `

        // Inject roughness variation
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <roughnessmap_fragment>',
            `
            #include <roughnessmap_fragment>
            float mossNoiseR = sin(vWorldPos.x * 2.0) * cos(vWorldPos.z * 2.0);
            // Moss is rougher (0.9), wet rock is smoother (0.4)
            float mossFactorR = smoothstep(0.4, 0.6, mossNoiseR);
            // Also adjust for height (wet near water level)
            float wetness = smoothstep(0.5, 0.0, vWorldPos.y);

            float baseRoughness = mix(0.6, 0.3, wetness);
            roughnessFactor = mix(baseRoughness, 0.9, mossFactorR);
            `
        )

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <color_fragment>',
            `
            #include <color_fragment>

            // Procedural rock texture
            float n = sin(vWorldPos.x * 10.0) * cos(vWorldPos.z * 10.0);

            vec3 rockColor = diffuseColor.rgb;

            // Varied rock color
            rockColor += vec3(n * 0.05);

            // Add some mossy patches
            float mossNoise = sin(vWorldPos.x * 2.0) * cos(vWorldPos.z * 2.0);

            // Soft blend for moss
            float mossFactor = smoothstep(0.3, 0.7, mossNoise);
            // Only on top surfaces/higher up
            mossFactor *= smoothstep(0.0, 0.2, vWorldPos.y);

            vec3 mossColor = vec3(0.2, 0.35, 0.15);
            rockColor = mix(rockColor, mossColor, mossFactor);

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

  // Generate stable rocks with procedural geometry
  const rocks = useMemo(() => {
      const rand = mulberry32(12345);
      const simplex = new SimplexNoise();

      const rockData: {
          position: [number, number, number],
          rotation: [number, number, number],
          scale: [number, number, number],
          geometry: THREE.BufferGeometry
      }[] = [];

      for(let i=0; i<300; i++) {
          const scaleX = 0.3 + rand() * 0.5
          const scaleZ = 0.3 + rand() * 0.5
          const scaleY = 0.2 + rand() * 0.3

          // Create base geometry (high resolution sphere)
          // Subdivision 3 for balance between detail and performance (300 rocks)
          const geometry = new THREE.IcosahedronGeometry(1, 3);
          const posAttribute = geometry.attributes.position;

          const vertex = new THREE.Vector3();
          const scratch = new THREE.Vector3();

          // Apply displacement
          for (let v = 0; v < posAttribute.count; v++) {
              vertex.fromBufferAttribute(posAttribute, v);

              // Scale coordinates for noise frequency
              const nx = vertex.x * 1.5;
              const ny = vertex.y * 1.5;
              const nz = vertex.z * 1.5;

              // Use 3D noise (casting to any because types might be missing noise3d)
              let noise = (simplex as any).noise3d(nx, ny, nz);
              noise += 0.5 * (simplex as any).noise3d(nx * 2 + 10, ny * 2 + 10, nz * 2 + 10);

              // Displace vertex along its normal
              scratch.copy(vertex).normalize();
              const displacement = noise * 0.3;
              vertex.addScaledVector(scratch, displacement);

              // Flatten bottom slightly for stability look
              if (vertex.y < -0.4) {
                  const d = -0.4 - vertex.y;
                  vertex.y += d * 0.5;
                  vertex.x *= 1.0 + d * 0.2;
                  vertex.z *= 1.0 + d * 0.2;
              }

              posAttribute.setXYZ(v, vertex.x, vertex.y, vertex.z);
          }

          geometry.computeVertexNormals();

          rockData.push({
              position: [
                  (rand() - 0.5) * 18,
                  scaleY * 0.2,
                  (rand() - 0.5) * 2000
              ],
              scale: [scaleX, scaleY, scaleZ],
              rotation: [
                  (rand() - 0.5) * 0.5,
                  rand() * Math.PI * 2,
                  (rand() - 0.5) * 0.5
              ],
              geometry: geometry
          })
      }
      return rockData;
  }, [])

  return (
    <group position={[-15, 0.05, 0]} rotation={[0, Math.PI / 4, 0]}>
      {/* Water Surface */}
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 2000, 32, 512]} />
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
            ref={(mesh) => { if (mesh) mesh.layers.enable(1); }} // Enable focus
            position={rock.position}
            scale={rock.scale}
            rotation={rock.rotation}
            receiveShadow
            castShadow
            geometry={rock.geometry}
            material={rockMaterial}
          />
      ))}
    </group>
  )
}
