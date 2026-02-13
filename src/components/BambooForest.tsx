import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { SimplexNoise } from 'three-stdlib'
import { Zone } from '../types'

interface BambooForestProps {
  currentZone?: Zone
  count?: number
}

export function BambooForest({ currentZone = 'GROVE', count = 15000 }: BambooForestProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const branchMeshRef = useRef<THREE.InstancedMesh>(null)
  const leafMeshRef = useRef<THREE.InstancedMesh>(null)
  const { camera } = useThree()

  // Shared Interaction Shader Logic
  const interactionLogic = `
          // Player Interaction
          vec3 iWorldPos = vec3(instanceMatrix[3][0], 0.0, instanceMatrix[3][2]);
          // Use a unified height factor based on actual world height if possible,
          // but for branches/leaves, instanceMatrix[3][1] is their height.
          // For stalks, instanceMatrix[3][1] is usually 2.5 (center).

          vec3 camPosFlat = vec3(uCameraPosition.x, 0.0, uCameraPosition.z);
          vec3 dirToPlayer = iWorldPos - camPosFlat;

          float distToPlayer = length(dirToPlayer);
          float interactRadius = 3.0; // Slightly larger for bamboo

          if (distToPlayer < interactRadius) {
              float pushStrength = 1.0 - (distToPlayer / interactRadius);
              pushStrength = pow(pushStrength, 2.0);

              vec3 pushDir = normalize(dirToPlayer);
              float pushAmt = 1.5 * pushStrength;

              // Calculate height for stiffness
              // We need world Y of the vertex
              float wY = (instanceMatrix * vec4(position, 1.0)).y;
              float bendFactor = smoothstep(0.0, 5.0, wY);
              bendFactor = pow(bendFactor, 1.5);

              transformed.x += pushDir.x * pushAmt * bendFactor;
              transformed.z += pushDir.z * pushAmt * bendFactor;
          }
  `;

  // Custom material setup for Bamboo Stalks
  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
        color: '#7b904b',
        roughness: 0.8,
        flatShading: false,
    })

    mat.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = { value: 0 }
        shader.uniforms.uCameraPosition = { value: new THREE.Vector3() }
        mat.userData.shader = shader

        shader.vertexShader = `
          uniform float uTime;
          uniform vec3 uCameraPosition;
          varying vec3 vLocalPosition;
          varying vec3 vWorldPosition;
          ${shader.vertexShader}
        `

        shader.vertexShader = shader.vertexShader.replace(
            '#include <beginnormal_vertex>',
            `
            #include <beginnormal_vertex>
            float nFreq = 1.0;
            float yP = position.y + 2.5;
            float dToNode = fract(yP * nFreq) - 0.5;
            float dist = abs(dToNode);
            if (dist < 0.05) {
                float tilt = -sign(dToNode) * 0.5;
                objectNormal.y += tilt;
                objectNormal = normalize(objectNormal);
            }
            `
        )

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

          float nodeFreq = 1.0;
          float yPos = position.y + 2.5;
          float distToNode = abs(fract(yPos * nodeFreq) - 0.5);
          float bulge = pow(smoothstep(0.05, 0.0, distToNode), 2.0) * 0.02;

          float currentRadius = length(position.xz);
          if (currentRadius > 0.001) {
              transformed.xz += normalize(position.xz) * bulge;
          }

          float irregularity = sin(yPos * 10.0 + vWorldPosition.x) * 0.003;
          transformed.xz += irregularity;

          float heightFactor = smoothstep(-2.5, 2.5, position.y);
          float swayStrength = 0.5 * heightFactor * heightFactor;

          #ifdef USE_INSTANCING
            float worldX = instanceMatrix[3][0];
            float worldZ = instanceMatrix[3][2];
            float windX = sin(uTime * 0.5 + worldX * 0.3) * swayStrength + sin(uTime * 1.2 + worldZ * 0.7) * swayStrength * 0.2;
            float windZ = cos(uTime * 0.4 + worldZ * 0.3) * swayStrength + cos(uTime * 1.5 + worldX * 0.8) * swayStrength * 0.2;
            transformed.x += windX;
            transformed.z += windZ;

            ${interactionLogic}
          #endif
          `
        )

        shader.fragmentShader = `
          varying vec3 vLocalPosition;
          varying vec3 vWorldPosition;
          ${shader.fragmentShader}
        `

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
          float h = (vLocalPosition.y + 2.5) / 5.0;
          vec3 darkGreen = vec3(0.18, 0.25, 0.12);
          vec3 lightGreen = vec3(0.55, 0.65, 0.35);
          vec3 yellowGreen = vec3(0.7, 0.75, 0.45);
          vec3 stalkColor = mix(darkGreen, lightGreen, smoothstep(0.0, 0.6, h));
          stalkColor = mix(stalkColor, yellowGreen, smoothstep(0.6, 1.0, h));

          float nodeFreq = 1.0;
          float nodeThickness = 0.03;
          float nodeDist = abs(fract(vLocalPosition.y * nodeFreq) - 0.5);

          if (nodeDist < nodeThickness) {
             stalkColor *= 0.7;
          } else if (nodeDist < nodeThickness * 2.0) {
             stalkColor *= 1.1;
          }

          float streaks = sin(vWorldPosition.x * 20.0) * sin(vWorldPosition.z * 20.0) * 0.05;
          stalkColor += streaks;
          float randomVar = sin(vWorldPosition.x * 0.1) * cos(vWorldPosition.z * 0.1);
          stalkColor += randomVar * 0.05;

          diffuseColor.rgb = stalkColor;
          `
        )
    }
    return mat
  }, [])

  // Branch Material
  const branchMaterial = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
        color: '#4a5d23', // Darker/brownish green
        roughness: 0.9,
        flatShading: false,
    })

    mat.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = { value: 0 }
        shader.uniforms.uCameraPosition = { value: new THREE.Vector3() }
        mat.userData.shader = shader

        shader.vertexShader = `
          uniform float uTime;
          uniform vec3 uCameraPosition;
          ${shader.vertexShader}
        `

        shader.vertexShader = shader.vertexShader.replace(
          '#include <begin_vertex>',
          `
          #include <begin_vertex>

          // Wind for branches - matches stalk movement roughly
          #ifdef USE_INSTANCING
             float worldX = instanceMatrix[3][0];
             float worldZ = instanceMatrix[3][2];

             // Simple sway
             float swayX = sin(uTime * 0.5 + worldX * 0.3) * 0.1;
             float swayZ = cos(uTime * 0.4 + worldZ * 0.3) * 0.1;

             transformed.x += swayX;
             transformed.z += swayZ;

             ${interactionLogic}
          #endif
          `
        )
    }
    return mat
  }, [])

  // Leaf Material
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
            uniform vec3 uCameraPosition;
            varying vec3 vWorldPos;
            ${shader.vertexShader}
        `

        shader.vertexShader = shader.vertexShader.replace(
            '#include <beginnormal_vertex>',
            `
            #include <beginnormal_vertex>
            float distY = position.y;
            float slope = 2.0 * distY * 1.0;
            objectNormal.y += slope;
            objectNormal = normalize(objectNormal);
            `
        )

        shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            `
            #include <begin_vertex>
            #ifdef USE_INSTANCING
             vWorldPos = (instanceMatrix * vec4(position, 1.0)).xyz;
            #endif

            float distFromStem = position.y;
            float droop = distFromStem * distFromStem * 1.0;
            transformed.z -= droop;
            float cup = pow(abs(position.x), 1.5) * 5.0;
            transformed.z += cup;

            #ifdef USE_INSTANCING
                float worldX = instanceMatrix[3][0];
                float worldZ = instanceMatrix[3][2];
                float sway = sin(uTime * 1.5 + worldX * 0.1 + worldZ * 0.1) * 0.3;
                float sway2 = cos(uTime * 1.0 + worldX * 0.2) * 0.2;
                transformed.x += sway * position.y;
                transformed.z += sway2 * position.y;
                float flutter = sin(uTime * 3.0 + worldX) * 0.05 * position.x;
                float twist = position.x * sin(uTime * 2.0 + worldZ) * 0.2 * position.y;
                transformed.y += flutter + twist;

                ${interactionLogic}
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
            float noise = sin(vWorldPos.x * 0.5) * cos(vWorldPos.z * 0.5);
            diffuseColor.rgb += noise * 0.05;
            vec3 sunDir = normalize(vec3(15.0, 25.0, 10.0));
            vec3 viewDir = normalize(uCameraPosition - vWorldPos);
            float dotViewSun = dot(viewDir, sunDir);
            float sunGlow = smoothstep(0.0, 1.0, -dotViewSun);
            diffuseColor.rgb += vec3(0.4, 0.5, 0.2) * sunGlow * 0.4;
            `
        )
    }
    return mat
  }, [])

  const leafGeometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(0.2, 0.6, 4, 8)
    geo.translate(0, 0.3, 0)
    return geo
  }, [])

  const { stalkInstances, branchInstances, leafInstances } = useMemo(() => {
    const stalks: THREE.Matrix4[] = []
    const branches: THREE.Matrix4[] = []
    const leaves: THREE.Matrix4[] = []

    const tempStalk = new THREE.Object3D()
    const tempBranch = new THREE.Object3D()
    const tempLeaf = new THREE.Object3D()

    const simplex = new SimplexNoise()

    for (let i = 0; i < count; i++) {
      let x = 0, z = 0
      let valid = false

      // Try up to 10 times to find a valid spot
      for (let attempt = 0; attempt < 10; attempt++) {
        x = (Math.random() - 0.5) * 2000
        z = (Math.random() - 0.5) * 2000

        // Noise Clustering
        // Scale noise to create groves
        const noiseVal = simplex.noise(x * 0.015, z * 0.015);
        // Normalize -1..1 to 0..1
        const n = noiseVal * 0.5 + 0.5;

        // Threshold: Only place if noise > 0.4 (groves)
        // Also keep clearings clear
        if (n < 0.45) continue;

        const distToCenter = Math.sqrt(x * x + z * z)
        const distToStream = Math.abs(x + z) / Math.sqrt(2)

        if (distToStream < 6) continue
        if (distToCenter < 5) continue

        valid = true
        break;
      }

      if (!valid) continue;

      const rotationY = Math.random() * Math.PI * 2
      const scale = 0.7 + Math.random() * 0.8

      // Stalk
      tempStalk.position.set(x, 2.5, z)
      tempStalk.rotation.set(0, rotationY, 0)
      tempStalk.scale.set(scale, scale, scale)
      tempStalk.updateMatrix()
      stalks.push(tempStalk.matrix.clone())

      // Branches & Leaves
      // Generate branches at nodes
      const numNodes = 5; // Height 5, nodes every ~1 unit? Shader assumes 1.0 freq
      // Stalk goes from -2.5 to 2.5 locally.
      // Nodes at y = -1.5, -0.5, 0.5, 1.5, 2.5

      for (let h = 0; h < numNodes; h++) {
          // Height from bottom (-2.5) upwards
          const localY = -1.5 + h * 1.0 + (Math.random() * 0.2 - 0.1);
          if (localY > 2.0) continue; // Don't go too high

          // Chance to spawn branch
          if (Math.random() > 0.3) {
              const branchAngle = Math.random() * Math.PI * 2;

              // Branch Logic
              tempBranch.position.set(x, 2.5 + localY * scale, z);
              // Rotate around Y (direction) and X (upward tilt)
              // Tilt up ~45-60 deg
              tempBranch.rotation.set(0, branchAngle, 0);
              tempBranch.rotateX(-Math.PI / 4 - Math.random() * 0.2);

              // Branch length
              const branchLen = 0.8 + Math.random() * 0.5;
              tempBranch.scale.set(scale * 0.5, branchLen, scale * 0.5); // Thinner width

              tempBranch.updateMatrix();
              branches.push(tempBranch.matrix.clone());

              // Leaves at the end of the branch
              // Branch tip local position is (0, branchLen, 0) if cylinder is Y-up?
              // Cylinder default is Y-up centered. If we didn't translate geometry, we need to be careful.
              // Let's assume branch geometry is translated 0.5 up so pivot is bottom.

              // We'll handle branch geometry translation in the mesh prop or use a translated geometry

              // Calculate world tip position for leaves
              // We can just use the tempBranch transformation
              // Local tip is (0, branchLen, 0) (if pivoted at bottom)

              // To spawn leaves, we can just cluster them around the "end" of the branch
              // Since we don't have easy access to transformed points here without math,
              // we can cheat: Just place leaves relative to branch position + vector

              // Vector from branch angle
              // Y-rotation = branchAngle
              // X-rotation = -PI/4 ...

              // Math for tip position:
              // y = sin(tilt) * len
              // r = cos(tilt) * len
              // x = sin(angle) * r
              // z = cos(angle) * r

              const tilt = Math.PI / 4 + 0.1; // Approx
              const dy = Math.sin(tilt) * branchLen * scale; // scale affects length
              const dr = Math.cos(tilt) * branchLen * scale;
              const dx = Math.sin(branchAngle) * dr;
              const dz = Math.cos(branchAngle) * dr;

              const tipX = x + dx;
              const tipY = (2.5 + localY * scale) + dy;
              const tipZ = z + dz;

              // Spawn 3-5 leaves at tip
              const numLeaves = 3 + Math.floor(Math.random() * 3);
              for (let L = 0; L < numLeaves; L++) {
                   const leafAngle = Math.random() * Math.PI * 2;

                   tempLeaf.position.set(
                       tipX + (Math.random() - 0.5) * 0.2,
                       tipY + (Math.random() - 0.5) * 0.2,
                       tipZ + (Math.random() - 0.5) * 0.2
                   );

                   // Rotate leaf to face somewhat outwards or random
                   tempLeaf.rotation.set(
                       Math.random() * 0.5,
                       leafAngle,
                       Math.random() * 0.5
                   );

                   const leafScale = (0.5 + Math.random() * 0.5) * scale;
                   tempLeaf.scale.set(leafScale, leafScale, leafScale);
                   tempLeaf.updateMatrix();
                   leaves.push(tempLeaf.matrix.clone());
              }
          }
      }
    }
    return { stalkInstances: stalks, branchInstances: branches, leafInstances: leaves }
  }, [count])

  useEffect(() => {
    if (meshRef.current) {
        stalkInstances.forEach((m, i) => meshRef.current!.setMatrixAt(i, m))
        meshRef.current.instanceMatrix.needsUpdate = true
    }
    if (branchMeshRef.current) {
        branchInstances.forEach((m, i) => branchMeshRef.current!.setMatrixAt(i, m))
        branchMeshRef.current.instanceMatrix.needsUpdate = true
    }
    if (leafMeshRef.current) {
        leafInstances.forEach((m, i) => leafMeshRef.current!.setMatrixAt(i, m))
        leafMeshRef.current.instanceMatrix.needsUpdate = true
    }
  }, [stalkInstances, branchInstances, leafInstances])

  useFrame((state) => {
      const time = state.clock.getElapsedTime()
      const windSpeed = currentZone === 'DEEP_FOREST' ? 1.5 : 1.0

      if (material.userData.shader) {
          material.userData.shader.uniforms.uTime.value = time * windSpeed
          material.userData.shader.uniforms.uCameraPosition.value.copy(camera.position)
      }
      if (branchMaterial.userData.shader) {
          branchMaterial.userData.shader.uniforms.uTime.value = time * windSpeed
          branchMaterial.userData.shader.uniforms.uCameraPosition.value.copy(camera.position)
      }
      if (leafMaterial.userData.shader) {
          leafMaterial.userData.shader.uniforms.uTime.value = time * windSpeed
          leafMaterial.userData.shader.uniforms.uCameraPosition.value.copy(camera.position)
      }
  })

  // Geometries
  // Branch geometry - translated up so pivot is at bottom
  const branchGeometry = useMemo(() => {
      const geo = new THREE.CylinderGeometry(0.02, 0.04, 1, 6);
      geo.translate(0, 0.5, 0); // Pivot at bottom
      return geo;
  }, []);

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
            ref={branchMeshRef}
            args={[undefined, undefined, branchInstances.length]}
            castShadow
            receiveShadow
            geometry={branchGeometry}
        >
            <primitive object={branchMaterial} attach="material" />
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
