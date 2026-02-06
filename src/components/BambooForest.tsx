import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Zone } from '../types'

interface BambooForestProps {
  currentZone?: Zone
  count?: number
}

export function BambooForest({ currentZone = 'GROVE', count = 4000 }: BambooForestProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)

  // Custom material setup
  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
        color: '#7b904b', // Base color, overridden by shader
        roughness: 0.8,
        flatShading: false,
    })

    // Inject shader for wind and procedural texturing
    mat.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = { value: 0 }
        mat.userData.shader = shader

        // --- VERTEX SHADER ---
        shader.vertexShader = `
          uniform float uTime;
          varying vec3 vLocalPosition;
          varying vec3 vWorldPosition;
          ${shader.vertexShader}
        `

        shader.vertexShader = shader.vertexShader.replace(
          '#include <begin_vertex>',
          `
          #include <begin_vertex>
          vLocalPosition = position;

          #ifdef USE_INSTANCING
             vWorldPosition = (instanceMatrix * vec4(position, 1.0)).xyz;
          #else
             vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          #endif

          // Wind Animation
          // Height range is -2.5 to 2.5
          float heightFactor = smoothstep(-2.5, 2.5, position.y);
          float swayStrength = 0.5 * heightFactor * heightFactor;

          #ifdef USE_INSTANCING
            float worldX = instanceMatrix[3][0];
            float worldZ = instanceMatrix[3][2];

            // Complex wind function
            float windX = sin(uTime * 0.5 + worldX * 0.3) * swayStrength + sin(uTime * 1.2 + worldZ * 0.7) * swayStrength * 0.2;
            float windZ = cos(uTime * 0.4 + worldZ * 0.3) * swayStrength + cos(uTime * 1.5 + worldX * 0.8) * swayStrength * 0.2;

            transformed.x += windX;
            transformed.z += windZ;
          #endif
          `
        )

        // --- FRAGMENT SHADER ---
        shader.fragmentShader = `
          varying vec3 vLocalPosition;
          varying vec3 vWorldPosition;
          ${shader.fragmentShader}
        `

        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <color_fragment>',
          `
          #include <color_fragment>

          // Procedural Bamboo Texture

          // Normalized height 0.0 (bottom) to 1.0 (top)
          float h = (vLocalPosition.y + 2.5) / 5.0;

          // 1. Vertical Gradient (Darker base, fresh green top)
          vec3 darkGreen = vec3(0.18, 0.25, 0.12); // #2e401f
          vec3 lightGreen = vec3(0.55, 0.65, 0.35); // #8ca659
          vec3 yellowGreen = vec3(0.7, 0.75, 0.45); // #b3bf73

          vec3 stalkColor = mix(darkGreen, lightGreen, smoothstep(0.0, 0.6, h));
          stalkColor = mix(stalkColor, yellowGreen, smoothstep(0.6, 1.0, h));

          // 2. Nodes (Rings)
          // Create rings every ~1.0 units
          float nodeFreq = 1.0;
          float nodeThickness = 0.03;

          // Distance to nearest integer node
          float nodeDist = abs(fract(vLocalPosition.y * nodeFreq) - 0.5);

          // Darken the ring area
          if (nodeDist < nodeThickness) {
             stalkColor *= 0.7; // Darker ring
          } else if (nodeDist < nodeThickness * 2.0) {
             stalkColor *= 1.1; // Highlight edge of ring
          }

          // 3. Subtle vertical streaks (simulating fiber)
          float streaks = sin(vWorldPosition.x * 20.0) * sin(vWorldPosition.z * 20.0) * 0.05;
          stalkColor += streaks;

          // 4. Instance variation based on position
          float randomVar = sin(vWorldPosition.x * 0.1) * cos(vWorldPosition.z * 0.1);
          stalkColor += randomVar * 0.05;

          diffuseColor.rgb = stalkColor;
          `
        )
    }
    return mat
  }, [])

  // Generate instances
  const instances = useMemo(() => {
    const temp: THREE.Matrix4[] = []
    const tempObject = new THREE.Object3D()

    for (let i = 0; i < count; i++) {
      let x = 0, z = 0
      let valid = false

      while (!valid) {
        x = (Math.random() - 0.5) * 2000
        z = (Math.random() - 0.5) * 2000

        const distToCenter = Math.sqrt(x * x + z * z)
        const distToClearing = Math.sqrt((x - 10) ** 2 + (z - 10) ** 2)
        const distToStream = Math.abs(x + z) / Math.sqrt(2) // Distance to line x+z=0 (approx stream)

        valid = true
        if (distToClearing < 12) valid = false
        if (distToStream < 6) valid = false
        if (distToCenter < 5) valid = false
      }

      const rotationY = Math.random() * Math.PI * 2
      const scale = 0.7 + Math.random() * 0.8

      tempObject.position.set(x, 2.5, z)
      tempObject.rotation.set(0, rotationY, 0)
      tempObject.scale.set(scale, scale, scale)
      tempObject.updateMatrix()
      temp.push(tempObject.matrix.clone())
    }
    return temp
  }, [count])

  useEffect(() => {
    if (!meshRef.current) return

    instances.forEach((matrix, i) => {
      meshRef.current!.setMatrixAt(i, matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [instances])

  useFrame((state) => {
      if (material.userData.shader) {
          // Faster wind in deep forest
          const windSpeed = currentZone === 'DEEP_FOREST' ? 1.5 : 1.0
          material.userData.shader.uniforms.uTime.value = state.clock.getElapsedTime() * windSpeed
      }
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, instances.length]}
      castShadow
      receiveShadow
    >
      {/* Bamboo geometry: top slightly narrower than bottom */}
      <cylinderGeometry args={[0.08, 0.15, 5, 32]} />
      <primitive object={material} attach="material" />
    </instancedMesh>
  )
}
