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

        // 1. High frequency noise for stone grain (random perturbation)
        vec3 p = vWorldPos.xyz * 10.0;

        // Three independent hash functions
        float nX = fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
        float nY = fract(sin(dot(p, vec3(39.346, 11.135, 83.155))) * 26968.1212);
        float nZ = fract(sin(dot(p, vec3(73.156, 52.235, 9.151))) * 13579.5453);

        vec3 grainBump = (vec3(nX, nY, nZ) - 0.5) * 0.1;

        // 2. Large noise for surface unevenness (Analytical Gradient)
        // f = sin(5x) * cos(5y) * sin(5z)
        // We want to perturb normal by gradient of f.

        float scale = 5.0;
        float sx = sin(vWorldPos.x * scale);
        float cx = cos(vWorldPos.x * scale);
        float sy = sin(vWorldPos.y * scale);
        float cy = cos(vWorldPos.y * scale);
        float sz = sin(vWorldPos.z * scale);
        float cz = cos(vWorldPos.z * scale);

        // Gradient components
        float dfdx = scale * cx * cy * sz;
        float dfdy = scale * sx * -sy * sz;
        float dfdz = scale * sx * cy * cz;

        vec3 largeBump = vec3(dfdx, dfdy, dfdz) * 0.02; // Strength 0.02

        // Apply bumps
        // We add to the tangent space normal or world space normal?
        // 'normal' here is view space normal in standard shader?
        // No, in 'normal_fragment_maps', 'normal' is the perturbed normal from normal map (if any).
        // If no normal map, it's the interpolated vertex normal (view space usually).

        // Wait, THREE.js shaders work in View Space for 'normal'.
        // My bumps are calculated in World Space.
        // This is a mismatch. I should transform bumps to View Space.
        // viewMatrix is available as uniform.
        // mat3 normalMatrix is available (ModelView inverse transpose).

        // Actually, vWorldPos is world space. The gradient is world space.
        // To add to 'normal' (View Space), we must rotate the gradient by viewMatrix (rotation part).
        // Since viewMatrix is ModelView, and we want World->View.
        // Actually, just transforming by viewMatrix logic is enough (assuming no non-uniform scale on view).

        // Correct way: transform world space gradient to view space normal perturbation.
        vec3 bumpWorld = grainBump + largeBump;
        vec3 bumpView = (viewMatrix * vec4(bumpWorld, 0.0)).xyz;

        normal = normalize(normal + bumpView);
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
