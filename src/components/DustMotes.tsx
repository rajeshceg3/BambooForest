import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface DustMotesProps {
  count?: number
}

export function DustMotes({ count = 2000 }: DustMotesProps) {
  const shaderRef = useRef<THREE.ShaderMaterial>(null)

  const [positions, sizes, phases] = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const sz = new Float32Array(count)
    const ph = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      // Spread across the environment
      pos[i * 3] = (Math.random() - 0.5) * 100
      pos[i * 3 + 1] = Math.random() * 20 // Height 0 to 20
      pos[i * 3 + 2] = (Math.random() - 0.5) * 100

      sz[i] = Math.random()
      ph[i] = Math.random() * Math.PI * 2 // Random starting phase
    }
    return [pos, sz, ph]
  }, [count])

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor: { value: new THREE.Color('#ffffff') }
  }), [])

  useFrame((state) => {
    if (shaderRef.current) {
      shaderRef.current.uniforms.uTime.value = state.clock.getElapsedTime()
    }
  })

  const vertexShader = `
    uniform float uTime;
    attribute float aSize;
    attribute float aPhase;
    varying float vAlpha;

    void main() {
      vec3 pos = position;

      // Extremely slow, drifting motion
      float time = uTime * 0.1;

      // Swirl math
      pos.x += sin(time + aPhase + pos.y * 0.1) * 2.0;
      pos.z += cos(time + aPhase + pos.x * 0.1) * 2.0;
      // Very slow falling, wrapping around
      pos.y -= uTime * 0.2 * aSize;
      pos.y = mod(pos.y, 20.0);

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;

      // Tiny particles
      gl_PointSize = (10.0 * aSize + 5.0) * (1.0 / -mvPosition.z);

      // Random opacity based on phase and time
      vAlpha = 0.1 + 0.3 * sin(time * 5.0 + aPhase);

      // Fade out near ground and top
      // GLSL requires edge0 < edge1 for smoothstep.
      // So instead of smoothstep(20.0, 15.0, pos.y), we use (1.0 - smoothstep(15.0, 20.0, pos.y))
      float heightAlpha = smoothstep(0.0, 2.0, pos.y) * (1.0 - smoothstep(15.0, 20.0, pos.y));
      vAlpha *= heightAlpha;
    }
  `

  const fragmentShader = `
    uniform vec3 uColor;
    varying float vAlpha;

    void main() {
      // Soft circle
      float r = distance(gl_PointCoord, vec2(0.5));
      if (r > 0.5) discard;

      // Extra soft edges
      float alpha = vAlpha * (1.0 - (r * 2.0));

      gl_FragColor = vec4(uColor, alpha);
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
        <bufferAttribute
           attach="attributes-aPhase"
           count={phases.length}
           array={phases}
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
