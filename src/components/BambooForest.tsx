import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Zone } from '../types'

interface BambooForestProps {
  currentZone?: Zone
  count?: number
}

export function BambooForest({ currentZone = 'GROVE', count = 4000 }: BambooForestProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const leafMeshRef = useRef<THREE.InstancedMesh>(null)
  const { camera } = useThree()

  // Custom material setup for Bamboo Stalks
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

          // --- NODAL BULGE ---
          float nodeFreq = 1.0;
          float yPos = position.y + 2.5;
          float distToNode = abs(fract(yPos * nodeFreq) - 0.5);
          // Sharpened bulge for distinct ridge
          float bulge = pow(smoothstep(0.05, 0.0, distToNode), 2.0) * 0.02;

          float currentRadius = length(position.xz);
          if (currentRadius > 0.001) {
              transformed.xz += normalize(position.xz) * bulge;
          }

          // --- IRREGULARITY ---
          float irregularity = sin(yPos * 10.0 + vWorldPosition.x) * 0.003;
          transformed.xz += irregularity;

          // Wind Animation
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

        // Inject roughness variation
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <roughnessmap_fragment>',
            `
            #include <roughnessmap_fragment>
            float striation = sin(vWorldPosition.x * 200.0) * 0.5 + 0.5;
            roughnessFactor = mix(0.6, 0.9, striation);
            `
        )

        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <color_fragment>',
          `
          #include <color_fragment>

          // Procedural Bamboo Texture
          float h = (vLocalPosition.y + 2.5) / 5.0;

          // 1. Vertical Gradient (Darker base, fresh green top)
          vec3 darkGreen = vec3(0.18, 0.25, 0.12); // #2e401f
          vec3 lightGreen = vec3(0.55, 0.65, 0.35); // #8ca659
          vec3 yellowGreen = vec3(0.7, 0.75, 0.45); // #b3bf73

          vec3 stalkColor = mix(darkGreen, lightGreen, smoothstep(0.0, 0.6, h));
          stalkColor = mix(stalkColor, yellowGreen, smoothstep(0.6, 1.0, h));

          // 2. Nodes (Rings)
          float nodeFreq = 1.0;
          float nodeThickness = 0.03;
          float nodeDist = abs(fract(vLocalPosition.y * nodeFreq) - 0.5);

          if (nodeDist < nodeThickness) {
             stalkColor *= 0.7;
          } else if (nodeDist < nodeThickness * 2.0) {
             stalkColor *= 1.1;
          }

          // 3. Subtle vertical streaks
          float streaks = sin(vWorldPosition.x * 20.0) * sin(vWorldPosition.z * 20.0) * 0.05;
          stalkColor += streaks;

          // 4. Instance variation
          float randomVar = sin(vWorldPosition.x * 0.1) * cos(vWorldPosition.z * 0.1);
          stalkColor += randomVar * 0.05;

          diffuseColor.rgb = stalkColor;
          `
        )
    }
    return mat
  }, [])

  // Custom material setup for Bamboo Leaves
  const leafMaterial = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
        color: '#7b904b',
        side: THREE.DoubleSide,
        roughness: 0.6,
        flatShading: false,
    })

    mat.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = { value: 0 }
        shader.uniforms.uCameraPosition = { value: new THREE.Vector3() }
        mat.userData.shader = shader

        shader.vertexShader = `
            uniform float uTime;
            varying vec3 vWorldPos;
            ${shader.vertexShader}
        `

        shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            `
            #include <begin_vertex>

            #ifdef USE_INSTANCING
             vWorldPos = (instanceMatrix * vec4(position, 1.0)).xyz;
            #endif

            // --- DROOP & CUP ---
            // Leaf geometry translated 0.3 up, so y is 0.0 to 0.6
            float distFromStem = position.y;
            float droop = distFromStem * distFromStem * 1.0;
            transformed.y -= droop;

            // Deep Cup along width
            float cup = pow(abs(position.x), 1.5) * 5.0;
            transformed.y -= cup;

            #ifdef USE_INSTANCING
                float worldX = instanceMatrix[3][0];
                float worldZ = instanceMatrix[3][2];

                // Wind sway
                float sway = sin(uTime * 1.5 + worldX * 0.1 + worldZ * 0.1) * 0.3;
                float sway2 = cos(uTime * 1.0 + worldX * 0.2) * 0.2;

                transformed.x += sway * position.y;
                transformed.z += sway2 * position.y;

                // Add flutter and twist
                float flutter = sin(uTime * 3.0 + worldX) * 0.05 * position.x;
                float twist = position.x * sin(uTime * 2.0 + worldZ) * 0.2 * position.y;
                transformed.y += flutter + twist;
            #endif
            `
        )

        shader.fragmentShader = `
            varying vec3 vWorldPos;
            uniform vec3 uCameraPosition;
            ${shader.fragmentShader}
        `

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <color_fragment>',
            `
            #include <color_fragment>
            // Slight color variation
            float noise = sin(vWorldPos.x * 0.5) * cos(vWorldPos.z * 0.5);
            diffuseColor.rgb += noise * 0.05;

            // Fake Subsurface Scattering (Backlight)
            vec3 sunDir = normalize(vec3(15.0, 25.0, 10.0));
            vec3 viewDir = normalize(uCameraPosition - vWorldPos);

            // Check if looking towards sun
            float dotViewSun = dot(viewDir, sunDir);

            // If looking towards sun (dot < 0), add glow
            float sunGlow = smoothstep(0.0, 1.0, -dotViewSun);

            // Add warm glow
            diffuseColor.rgb += vec3(0.4, 0.5, 0.2) * sunGlow * 0.4;
            `
        )
    }
    return mat
  }, [])

  const leafGeometry = useMemo(() => {
    // Increased segments for bending
    const geo = new THREE.PlaneGeometry(0.2, 0.6, 4, 8)
    geo.translate(0, 0.3, 0)
    return geo
  }, [])

  // Generate instances
  const { stalkInstances, leafInstances } = useMemo(() => {
    const stalks: THREE.Matrix4[] = []
    const leaves: THREE.Matrix4[] = []

    const tempStalk = new THREE.Object3D()
    const tempLeaf = new THREE.Object3D()

    for (let i = 0; i < count; i++) {
      let x = 0, z = 0
      let valid = false

      while (!valid) {
        x = (Math.random() - 0.5) * 2000
        z = (Math.random() - 0.5) * 2000

        const distToCenter = Math.sqrt(x * x + z * z)
        const distToClearing = Math.sqrt((x - 10) ** 2 + (z - 10) ** 2)
        const distToStream = Math.abs(x + z) / Math.sqrt(2)

        valid = true
        if (distToClearing < 12) valid = false
        if (distToStream < 6) valid = false
        if (distToCenter < 5) valid = false
      }

      const rotationY = Math.random() * Math.PI * 2
      const scale = 0.7 + Math.random() * 0.8

      // Stalk
      tempStalk.position.set(x, 2.5, z)
      tempStalk.rotation.set(0, rotationY, 0)
      tempStalk.scale.set(scale, scale, scale)
      tempStalk.updateMatrix()
      stalks.push(tempStalk.matrix.clone())

      // Leaves - Generate 5-8 leaves per stalk
      const numLeaves = 5 + Math.floor(Math.random() * 4)
      for (let j = 0; j < numLeaves; j++) {
          const localY = (Math.random() * 2.5)
          const angle = Math.random() * Math.PI * 2
          const dist = 0.1 * scale

          tempLeaf.position.set(
              x + Math.sin(angle) * dist,
              2.5 + localY,
              z + Math.cos(angle) * dist
          )

          tempLeaf.rotation.set(
              Math.random() * 0.5,
              angle + Math.PI / 2,
              Math.random() * 0.5
          )

          const leafScale = (0.5 + Math.random() * 0.5) * scale
          tempLeaf.scale.set(leafScale, leafScale, leafScale)

          tempLeaf.updateMatrix()
          leaves.push(tempLeaf.matrix.clone())
      }
    }
    return { stalkInstances: stalks, leafInstances: leaves }
  }, [count])

  useEffect(() => {
    if (!meshRef.current || !leafMeshRef.current) return

    stalkInstances.forEach((matrix, i) => {
      meshRef.current!.setMatrixAt(i, matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true

    leafInstances.forEach((matrix, i) => {
      leafMeshRef.current!.setMatrixAt(i, matrix)
    })
    leafMeshRef.current.instanceMatrix.needsUpdate = true

  }, [stalkInstances, leafInstances])

  useFrame((state) => {
      // Update stalk wind
      if (material.userData.shader) {
          const windSpeed = currentZone === 'DEEP_FOREST' ? 1.5 : 1.0
          material.userData.shader.uniforms.uTime.value = state.clock.getElapsedTime() * windSpeed
      }
      // Update leaf wind
      if (leafMaterial.userData.shader) {
          const windSpeed = currentZone === 'DEEP_FOREST' ? 1.5 : 1.0
          leafMaterial.userData.shader.uniforms.uTime.value = state.clock.getElapsedTime() * windSpeed
          leafMaterial.userData.shader.uniforms.uCameraPosition.value.copy(camera.position)
      }
  })

  return (
    <group>
        <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, stalkInstances.length]}
        castShadow
        receiveShadow
        >
        <cylinderGeometry args={[0.08, 0.15, 5, 32]} />
        <primitive object={material} attach="material" />
        </instancedMesh>

        <instancedMesh
        ref={leafMeshRef}
        args={[undefined, undefined, leafInstances.length]}
        castShadow
        receiveShadow
        geometry={leafGeometry}
        >
        <primitive object={leafMaterial} attach="material" />
        </instancedMesh>
    </group>
  )
}
