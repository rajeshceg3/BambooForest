import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export function Stream() {
  const meshRef = useRef<THREE.Mesh>(null)

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBaseColor: { value: new THREE.Color('#8ab3c9') }, // Muted blue
        uDeepColor: { value: new THREE.Color('#4a6b7c') }, // Darker blue
      },
      transparent: true,
      side: THREE.DoubleSide,
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vViewPosition;
        varying vec3 vNormal;

        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vViewPosition = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uBaseColor;
        uniform vec3 uDeepColor;

        varying vec2 vUv;
        varying vec3 vViewPosition;
        varying vec3 vNormal;

        // Simple noise function
        float random (in vec2 st) {
            return fract(sin(dot(st.xy,
                                 vec2(12.9898,78.233)))*
                43758.5453123);
        }

        float noise (in vec2 st) {
            vec2 i = floor(st);
            vec2 f = fract(st);

            // Four corners in 2D of a tile
            float a = random(i);
            float b = random(i + vec2(1.0, 0.0));
            float c = random(i + vec2(0.0, 1.0));
            float d = random(i + vec2(1.0, 1.0));

            vec2 u = f * f * (3.0 - 2.0 * f);

            return mix(a, b, u.x) +
                    (c - a)* u.y * (1.0 - u.x) +
                    (d - b) * u.x * u.y;
        }

        #define NUM_OCTAVES 5

        float fbm ( in vec2 _st) {
            float v = 0.0;
            float a = 0.5;
            vec2 shift = vec2(100.0);
            // Rotate to reduce axial bias
            mat2 rot = mat2(cos(0.5), sin(0.5),
                            -sin(0.5), cos(0.50));
            for (int i = 0; i < NUM_OCTAVES; ++i) {
                v += a * noise(_st);
                _st = rot * _st * 2.0 + shift;
                a *= 0.5;
            }
            return v;
        }

        void main() {
          vec3 viewDir = normalize(vViewPosition);
          vec3 normal = normalize(vNormal);

          // Flowing noise
          vec2 flowUv = vUv * vec2(3.0, 20.0); // Stretch along stream
          float flow = fbm(flowUv + vec2(0.0, uTime * 0.5));

          // Second layer of flow
          float flow2 = fbm(flowUv * 1.5 - vec2(0.0, uTime * 0.3));

          float combinedFlow = mix(flow, flow2, 0.5);

          // Color mixing
          vec3 color = mix(uDeepColor, uBaseColor, combinedFlow + 0.2);

          // Highlights
          float highlight = smoothstep(0.6, 0.8, combinedFlow);
          color += vec3(0.2) * highlight;

          // Fresnel Effect for Alpha
          float fresnel = dot(viewDir, normal);
          fresnel = clamp(1.0 - fresnel, 0.0, 1.0);
          fresnel = pow(fresnel, 3.0);

          float alpha = 0.6 + 0.4 * fresnel;

          // Edge fade (fake shore)
          float edge = 1.0 - 2.0 * abs(vUv.x - 0.5);
          alpha *= smoothstep(0.0, 0.2, edge);

          gl_FragColor = vec4(color, alpha);
        }
      `
    })
  }, [])

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

  useFrame((state) => {
    if (material) {
        material.uniforms.uTime.value = state.clock.getElapsedTime()
    }
  })

  return (
    <group position={[-15, 0.05, 0]} rotation={[0, Math.PI / 4, 0]}>
      {/* Water Surface */}
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[10, 100, 20, 100]} />
        <primitive object={material} attach="material" />
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
              <icosahedronGeometry args={[1, 0]} />
              <meshStandardMaterial
                color="#5a5a5a"
                roughness={0.9}
                flatShading={true}
              />
          </mesh>
      ))}
    </group>
  )
}
