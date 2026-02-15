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
  const meshRef = useRef<THREE.InstancedMesh | null>(null)
  const branchMeshRef = useRef<THREE.InstancedMesh | null>(null)
  const leafMeshRef = useRef<THREE.InstancedMesh | null>(null)
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
            // Sharper normal deviation for nodes
            if (dist < 0.04) {
                float tilt = -sign(dToNode) * 1.5 * (1.0 - dist/0.04);
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

          // Sharper, distinct ring bulge
          float bulge = pow(smoothstep(0.04, 0.0, distToNode), 3.0) * 0.035;

          float currentRadius = length(position.xz);
          if (currentRadius > 0.001) {
              // Apply bulge
              transformed.xz += normalize(position.xz) * bulge;

              // Tapering: Thicker at bottom (y=-2.5), thinner at top (y=2.5)
              // height factor 0..1
              float hFactor = (position.y + 2.5) / 5.0;
              float taper = mix(1.2, 0.8, hFactor);
              transformed.xz *= taper;
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

        // Inject Noise Function
        shader.fragmentShader = `
            vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
            float snoise(vec2 v) {
                const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
                vec2 i  = floor(v + dot(v, C.yy) );
                vec2 x0 = v - i + dot(i, C.xx);
                vec2 i1;
                i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
                vec4 x12 = x0.xyxy + C.xxzz;
                x12.xy -= i1;
                i = mod289(i);
                vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
                vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
                m = m*m ;
                m = m*m ;
                vec3 x = 2.0 * fract(p * C.www) - 1.0;
                vec3 h = abs(x) - 0.5;
                vec3 ox = floor(x + 0.5);
                vec3 a0 = x - ox;
                m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
                vec3 g;
                g.x  = a0.x  * x0.x  + h.x  * x0.y;
                g.yz = a0.yz * x12.xz + h.yz * x12.yw;
                return 130.0 * dot(m, g);
            }
            ${shader.fragmentShader}
        `

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <roughnessmap_fragment>',
            `
            #include <roughnessmap_fragment>
            float noiseVal = snoise(vWorldPosition.xy * 20.0); // High freq noise
            float striation = sin(vWorldPosition.x * 200.0 + noiseVal * 10.0) * 0.5 + 0.5;
            roughnessFactor = mix(0.5, 0.95, striation * 0.8 + noiseVal * 0.1);

            // Add weathering patches
            float weatherNoise = snoise(vWorldPosition.xz * 2.0);
            if (weatherNoise > 0.3) roughnessFactor = 0.9;
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
          vec3 brown = vec3(0.4, 0.35, 0.2);

          vec3 stalkColor = mix(darkGreen, lightGreen, smoothstep(0.0, 0.6, h));
          stalkColor = mix(stalkColor, yellowGreen, smoothstep(0.6, 1.0, h));

          // Nodes
          float nodeFreq = 1.0;
          float nodeThickness = 0.03;
          float nodeDist = abs(fract(vLocalPosition.y * nodeFreq) - 0.5);

          if (nodeDist < nodeThickness) {
             stalkColor *= 0.7; // Darker ring
          } else if (nodeDist < nodeThickness * 2.0) {
             stalkColor *= 1.1; // Highlight
          }

          // Weathering/Age
          float ageNoise = snoise(vWorldPosition.xz * 0.5 + vec2(0, vWorldPosition.y * 0.2));
          stalkColor = mix(stalkColor, brown, smoothstep(0.4, 0.8, ageNoise));

          // Micro-details (spots)
          float microNoise = snoise(vWorldPosition.xy * 80.0);
          float spots = smoothstep(0.4, 0.7, microNoise);
          stalkColor = mix(stalkColor, brown * 0.8, spots * 0.3);

          // Subtle vertical streaks
          float streaks = snoise(vec2(vWorldPosition.x * 50.0, vWorldPosition.y * 2.0));
          stalkColor *= 0.95 + 0.1 * streaks;

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
            varying float vRandId;
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

             // Random twist for organic variation
             float randRot = sin(instanceMatrix[3][0] * 12.0 + instanceMatrix[3][2] * 34.0);
             float c = cos(randRot * 0.5);
             float s = sin(randRot * 0.5);
             // Twist around local Y (stem axis)
             mat2 rot = mat2(c, -s, s, c);
             transformed.xz = rot * transformed.xz;
             // Also update normal for correct lighting
             objectNormal.xz = rot * objectNormal.xz;
             vNormal = normalize(normalMatrix * objectNormal);

             vRandId = fract(sin(dot(instanceMatrix[3].xyz, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
            #endif

            // Leaf Shaping (Lanceolate)
            // Geometry is translated up 0.3. Bounds Y: [0, 0.6]. X: [-0.1, 0.1].
            float len = 0.6;
            float yNorm = position.y / len; // 0 to 1
            // Sine shape for width: 0 at ends, 1 in middle
            // pow to sharpen the tip
            float widthFactor = sin(yNorm * 3.14159);
            widthFactor = pow(widthFactor, 0.8);
            transformed.x *= widthFactor;

            float distFromStem = position.y;
            float droop = distFromStem * distFromStem * 1.0;
            transformed.z -= droop;

            // Cup the leaf
            float cup = pow(abs(position.x), 1.5) * 5.0 * (1.0 - yNorm * 0.5); // Less cup at tip
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
            varying float vRandId;
            uniform vec3 uCameraPosition;
            ${shader.fragmentShader}
        `

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <color_fragment>',
            `
            #include <color_fragment>
            float noise = sin(vWorldPos.x * 0.5) * cos(vWorldPos.z * 0.5);

            // Color Variation
            vec3 freshColor = vec3(0.48, 0.60, 0.28);
            vec3 darkColor = vec3(0.25, 0.35, 0.15);
            vec3 dryColor = vec3(0.70, 0.65, 0.30);

            vec3 baseCol = mix(darkColor, freshColor, 0.5 + 0.5 * noise);

            // Random dry leaves (10% chance)
            if (vRandId > 0.9) {
                baseCol = mix(baseCol, dryColor, 0.7);
            }
            // Yellow tips logic based on UVs isn't easy without varying UVs passed.
            // We can use world pos Y relative to something, but easier to just use noise.

            diffuseColor.rgb = baseCol;

            // Fake Subsurface Scattering (SSS)
            vec3 sunDir = normalize(vec3(15.0, 25.0, 10.0));
            vec3 viewDir = normalize(uCameraPosition - vWorldPos);

            // 1. View looking at Sun through leaf
            float dotViewSun = dot(viewDir, -sunDir); // -sunDir points FROM sun
            float backlight = smoothstep(0.0, 1.0, dotViewSun); // Sharper falloff

            // 2. Normal facing AWAY from sun (backside lit)
            float normalSun = dot(vNormal, sunDir);
            float transmission = smoothstep(0.0, 0.5, -normalSun);

            // Combine
            float sss = backlight * transmission;

            // Transmission color should be saturated green/yellow
            vec3 sssColor = vec3(0.6, 0.75, 0.1) * sss * 1.5;
            diffuseColor.rgb += sssColor;

            // Soften edges using Fresnel?
            float fresnel = 1.0 - abs(dot(viewDir, vNormal));
            diffuseColor.rgb += vec3(0.1, 0.2, 0.05) * fresnel * 0.5;
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
            ref={(node) => {
                if (meshRef) meshRef.current = node;
                if (node) node.layers.enable(1);
            }}
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
