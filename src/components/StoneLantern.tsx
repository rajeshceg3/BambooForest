import { useMemo } from 'react'
import * as THREE from 'three'

function useStoneMaterial(color: string) {
  return useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.9,
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

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <normal_fragment_maps>',
        `
        #include <normal_fragment_maps>

        // High frequency noise for stone grain
        float noise = fract(sin(dot(vWorldPos.xyz * 10.0, vec3(12.9898, 78.233, 45.164))) * 43758.5453);

        // Larger noise for surface unevenness
        float largeNoise = sin(vWorldPos.x * 5.0) * cos(vWorldPos.y * 5.0) * sin(vWorldPos.z * 5.0);

        vec3 bump = vec3(noise - 0.5) * 0.1; // Fine grain
        bump += vec3(largeNoise) * 0.05; // Uneven surface

        normal = normalize(normal + bump);
        `
      )

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>

        float grain = fract(sin(dot(vWorldPos.xyz * 20.0, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
        diffuseColor.rgb *= 0.8 + 0.4 * grain; // Speckled look

        // Weathering/Moss at bottom
        if (vWorldPos.y < 0.5) {
            float moss = smoothstep(0.5, 0.0, vWorldPos.y);
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.3, 0.35, 0.25), moss * 0.5);
        }
        `
      )
    }
    return mat
  }, [color])
}

export function StoneLantern(props: any) {
  const baseMat = useStoneMaterial('#888888')
  const lightBoxMat = useStoneMaterial('#999999')
  const roofMat = useStoneMaterial('#777777')

  return (
    <group {...props}>
      {/* Base */}
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow material={baseMat}>
        <boxGeometry args={[0.8, 0.5, 0.8]} />
      </mesh>
      {/* Pillar */}
      <mesh position={[0, 1.25, 0]} castShadow receiveShadow material={baseMat}>
        <cylinderGeometry args={[0.2, 0.3, 1.5, 6]} />
      </mesh>
      {/* Platform */}
      <mesh position={[0, 2.1, 0]} castShadow receiveShadow material={baseMat}>
        <boxGeometry args={[1.2, 0.2, 1.2]} />
      </mesh>
      {/* Light box */}
      <mesh position={[0, 2.6, 0]} castShadow receiveShadow material={lightBoxMat}>
        <boxGeometry args={[0.7, 0.8, 0.7]} />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 3.1, 0]} castShadow receiveShadow material={roofMat}>
        <cylinderGeometry args={[0.1, 1, 0.4, 4]} />
      </mesh>

      {/* The light itself */}
      <pointLight position={[0, 2.6, 0]} intensity={0.5} color="#ffaa44" distance={5} />
      <mesh position={[0, 2.6, 0]}>
        <boxGeometry args={[0.5, 0.6, 0.5]} />
        <meshBasicMaterial color="#ffaa44" transparent opacity={0.3} />
      </mesh>
    </group>
  )
}
