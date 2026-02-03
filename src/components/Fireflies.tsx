import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export function Fireflies({ count = 100 }) {
  const shaderRef = useRef<THREE.ShaderMaterial>(null)

  const [positions, sizes] = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const sz = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 80
      pos[i * 3 + 1] = 0.5 + Math.random() * 5 // Height 0.5-5.5
      pos[i * 3 + 2] = (Math.random() - 0.5) * 80
      sz[i] = Math.random()
    }
    return [pos, sz]
  }, [count])

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor: { value: new THREE.Color('#fffae0') } // Pale warm yellow
  }), [])

  useFrame((state) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = state.clock.getElapsedTime()
    }
  })

  const vertexShader = `
    uniform float uTime;
    attribute float aSize;
    varying float vAlpha;

    void main() {
      vec3 pos = position;

      // Gentle floating motion
      float time = uTime * 0.5;
      pos.x += sin(time + pos.z * 0.05) * 1.5;
      pos.y += sin(time * 1.2 + pos.x * 0.05) * 0.5;
      pos.z += cos(time * 0.8 + pos.y * 0.05) * 1.5;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;

      // Size attenuation
      gl_PointSize = (80.0 * aSize + 20.0) * (1.0 / -mvPosition.z);

      // Twinkle
      vAlpha = 0.4 + 0.6 * sin(time * 3.0 + pos.x * 10.0);
    }
  `

  const fragmentShader = `
    uniform vec3 uColor;
    varying float vAlpha;

    void main() {
      // Soft glow circle
      float r = distance(gl_PointCoord, vec2(0.5));
      if (r > 0.5) discard;

      float glow = 1.0 - (r * 2.0);
      glow = pow(glow, 2.0);

      gl_FragColor = vec4(uColor, vAlpha * glow * 0.8);
    }
  `

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
           attach="attributes-aSize"
           count={sizes.length}
           array={sizes}
           itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={shaderRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </points>
  )
}
