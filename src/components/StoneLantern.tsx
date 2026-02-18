import { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'

function useStoneMaterial(color: string) {
  return useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.9,
      flatShading: true, // Use flat shading to emphasize the chiseled/hexagonal form
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
        // Deform vertex based on local position to simulate hand-carving
        float def = sin(position.x * 20.0) * cos(position.y * 15.0) * sin(position.z * 18.0);
        transformed += normal * def * 0.005;

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

        // 2. Large noise for surface unevenness
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
  const groupRef = useRef<THREE.Group>(null)
  const baseMat = useStoneMaterial('#888888')
  const lightBoxMat = useStoneMaterial('#999999')
  const roofMat = useStoneMaterial('#777777')

  // Geometry Profiles - using LatheGeometry with 6 segments to create hexagonal forms
  const baseGeo = useMemo(() => {
      const points = []
      points.push(new THREE.Vector2(0.35, 0)) // Bottom width
      points.push(new THREE.Vector2(0.25, 0.15))
      points.push(new THREE.Vector2(0.20, 0.4)) // Top of base
      points.push(new THREE.Vector2(0, 0.4)) // Cap
      return new THREE.LatheGeometry(points, 6)
  }, [])

  const postGeo = useMemo(() => {
      const points = []
      points.push(new THREE.Vector2(0.15, 0))
      points.push(new THREE.Vector2(0.12, 0.8)) // Tapered post
      points.push(new THREE.Vector2(0, 0.8))
      return new THREE.LatheGeometry(points, 6)
  }, [])

  const platformGeo = useMemo(() => {
      const points = []
      points.push(new THREE.Vector2(0.12, 0))
      points.push(new THREE.Vector2(0.35, 0.1)) // Flare out
      points.push(new THREE.Vector2(0.35, 0.2)) // Thickness
      points.push(new THREE.Vector2(0.25, 0.3)) // Taper in
      points.push(new THREE.Vector2(0, 0.3))
      return new THREE.LatheGeometry(points, 6)
  }, [])

  const lightBoxGeo = useMemo(() => {
      const points = []
      points.push(new THREE.Vector2(0.22, 0))
      points.push(new THREE.Vector2(0.25, 0.4)) // Slightly wider at top
      points.push(new THREE.Vector2(0, 0.4))
      return new THREE.LatheGeometry(points, 6)
  }, [])

  const roofGeo = useMemo(() => {
      const points = []
      points.push(new THREE.Vector2(0.35, 0)) // Overhang start
      points.push(new THREE.Vector2(0.5, 0.05)) // Eave tip
      // Curve up
      for(let i=1; i<=5; i++) {
          const t = i/5
          const x = 0.5 * (1-t)
          const y = 0.05 + Math.pow(t, 2) * 0.35 // Quadratic curve up
          points.push(new THREE.Vector2(x, y))
      }
      return new THREE.LatheGeometry(points, 6)
  }, [])

  const jewelGeo = useMemo(() => {
      const points = []
      points.push(new THREE.Vector2(0.08, 0))
      points.push(new THREE.Vector2(0.12, 0.08))
      points.push(new THREE.Vector2(0, 0.25)) // Point
      return new THREE.LatheGeometry(points, 8) // Rounder
  }, [])

  useEffect(() => {
    if (groupRef.current) {
        groupRef.current.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.layers.enable(1)
            }
        })
    }
  }, [])

  return (
    <group ref={groupRef} {...props}>
      {/* Base */}
      <mesh geometry={baseGeo} material={baseMat} castShadow receiveShadow position={[0, 0, 0]} />

      {/* Post */}
      <mesh geometry={postGeo} material={baseMat} castShadow receiveShadow position={[0, 0.4, 0]} />

      {/* Platform */}
      <mesh geometry={platformGeo} material={baseMat} castShadow receiveShadow position={[0, 1.2, 0]} />

      {/* Light Box */}
      <mesh geometry={lightBoxGeo} material={lightBoxMat} castShadow receiveShadow position={[0, 1.5, 0]} />

      {/* Roof */}
      <mesh geometry={roofGeo} material={roofMat} castShadow receiveShadow position={[0, 1.9, 0]} />

      {/* Jewel */}
      <mesh geometry={jewelGeo} material={baseMat} castShadow receiveShadow position={[0, 2.3, 0]} />

      {/* Light */}
      <pointLight position={[0, 1.7, 0]} intensity={1.5} color="#ffaa44" distance={3} decay={2} />
      <mesh position={[0, 1.7, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.35, 6]} />
        <meshBasicMaterial color="#ffaa44" transparent opacity={0.5} />
      </mesh>
    </group>
  )
}
