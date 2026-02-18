import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { SimplexNoise } from 'three-stdlib'
import { Zone } from '../types'

interface BambooForestProps {
  currentZone?: Zone
  count?: number
}

// Global Wind Logic for Stalks, Branches, and Leaves
const windShaderLogic = `
vec3 getWindOffset(vec3 pos, float time, vec3 camPos) {
    float h = pos.y;
    // Normalized height factor (assuming max height ~ 8.0 for tall stalks)
    float hFactor = smoothstep(0.0, 8.0, h);
    float swayStrength = 0.5 * hFactor * hFactor;

    // Wind pattern
    float windX = sin(time * 0.5 + pos.x * 0.3) * swayStrength + sin(time * 1.2 + pos.z * 0.7) * swayStrength * 0.2;
    float windZ = cos(time * 0.4 + pos.z * 0.3) * swayStrength + cos(time * 1.5 + pos.x * 0.8) * swayStrength * 0.2;

    // Interaction
    vec3 dirToPlayer = pos - camPos;
    dirToPlayer.y = 0.0;
    float distToPlayer = length(dirToPlayer);
    float interactRadius = 3.0;

    if (distToPlayer < interactRadius) {
        float pushStrength = 1.0 - (distToPlayer / interactRadius);
        pushStrength = pow(pushStrength, 2.0);
        vec3 pushDir = normalize(dirToPlayer);
        // Add extra bending for interaction
        float pushAmt = 1.5 * pushStrength * pow(hFactor, 1.5);

        windX += pushDir.x * pushAmt;
        windZ += pushDir.z * pushAmt;
    }

    return vec3(windX, 0.0, windZ);
}
`;

export function BambooForest({ currentZone = 'GROVE', count = 15000 }: BambooForestProps) {
  const meshRef = useRef<THREE.InstancedMesh | null>(null)
  const branchMeshRef = useRef<THREE.InstancedMesh | null>(null)
  const leafMeshRef = useRef<THREE.InstancedMesh | null>(null)
  const { camera } = useThree()

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
          ${windShaderLogic}
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
            if (dist < 0.06) {
                float tilt = -sign(dToNode) * 2.0 * smoothstep(0.06, 0.0, dist);
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
          float distToNode = fract(yPos * nodeFreq) - 0.5;
          float absDist = abs(distToNode);

          // Sharper, distinct ring bulge with depression
          // Bulge right at the ring
          float bulge = smoothstep(0.04, 0.02, absDist) * 0.03 + smoothstep(0.015, 0.0, absDist) * 0.02;

          // Slight depression above/below ring
          float depression = smoothstep(0.04, 0.1, absDist) * smoothstep(0.15, 0.1, absDist) * -0.01;

          float currentRadius = length(position.xz);
          if (currentRadius > 0.001) {
              // Apply bulge
              transformed.xz += normalize(position.xz) * (bulge + depression);

              // Tapering: Thicker at bottom (y=-2.5), thinner at top (y=2.5)
              float hFactor = (position.y + 2.5) / 5.0;
              float taper = mix(1.2, 0.8, hFactor);
              transformed.xz *= taper;
          }

          float irregularity = sin(yPos * 10.0 + vWorldPosition.x) * 0.003;
          transformed.xz += irregularity;
          `
        )

        // Inject Global Wind in Project Vertex
        shader.vertexShader = shader.vertexShader.replace(
            '#include <project_vertex>',
            `
            vec4 mvPosition = vec4( transformed, 1.0 );
            #ifdef USE_INSTANCING
                mvPosition = instanceMatrix * mvPosition;
            #endif
            // Transform to World Space (assuming modelMatrix is identity or close)
            mvPosition = modelMatrix * mvPosition;

            // Apply Global Wind
            vec3 windOffset = getWindOffset(mvPosition.xyz, uTime, uCameraPosition);
            mvPosition.xyz += windOffset;

            // Transform to View Space
            mvPosition = viewMatrix * mvPosition;
            gl_Position = projectionMatrix * mvPosition;
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

            // Fibrous striation
            float fiber = snoise(vec2(vWorldPosition.x * 200.0, vWorldPosition.y * 5.0));
            float striation = fiber * 0.5 + 0.5;

            roughnessFactor = mix(0.5, 0.95, striation * 0.6 + noiseVal * 0.2);

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

          // Subtle vertical streaks (fibers)
          float fiber = snoise(vec2(vWorldPosition.x * 200.0, vWorldPosition.y * 5.0));
          stalkColor *= 0.9 + 0.2 * smoothstep(0.2, 0.8, fiber);

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
          ${windShaderLogic}
          ${shader.vertexShader}
        `

        shader.vertexShader = shader.vertexShader.replace(
            '#include <project_vertex>',
            `
            vec4 mvPosition = vec4( transformed, 1.0 );
            #ifdef USE_INSTANCING
                mvPosition = instanceMatrix * mvPosition;
            #endif
            mvPosition = modelMatrix * mvPosition;

            vec3 windOffset = getWindOffset(mvPosition.xyz, uTime, uCameraPosition);
            mvPosition.xyz += windOffset;

            mvPosition = viewMatrix * mvPosition;
            gl_Position = projectionMatrix * mvPosition;
            `
        )

        // NOTE: No changes to begin_vertex needed as we removed the old sway logic
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
            ${windShaderLogic}
            ${shader.vertexShader}
        `

        shader.vertexShader = shader.vertexShader.replace(
            '#include <beginnormal_vertex>',
            `
            #include <beginnormal_vertex>
            float distY = position.y;
            float slope = 2.0 * distY * 1.0;
            objectNormal.y += slope;

            // Midrib normal adjustment
            if (abs(position.x) < 0.02) {
                // V-shape normal
                float signX = sign(position.x);
                objectNormal.x += signX * 0.5;
            }

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
             mat2 rot = mat2(c, -s, s, c);
             transformed.xz = rot * transformed.xz;
             objectNormal.xz = rot * objectNormal.xz;
             vNormal = normalize(normalMatrix * objectNormal);

             vRandId = fract(sin(dot(instanceMatrix[3].xyz, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
            #endif

            // Leaf Shaping (Lanceolate)
            float len = 0.6;
            float yNorm = position.y / len; // 0 to 1
            float widthFactor = sin(yNorm * 3.14159);
            widthFactor = pow(widthFactor, 0.8);
            transformed.x *= widthFactor;

            float distFromStem = position.y;
            float droop = distFromStem * distFromStem * 1.0;
            transformed.z -= droop;

            // Cup the leaf
            float cup = pow(abs(position.x), 1.5) * 5.0 * (1.0 - yNorm * 0.5);
            transformed.z += cup;

            // Midrib Crease
            // Local X is width. Assuming leaf width ~0.2 (from geometry args)
            // Crease logic: depress center Z
            float midribWidth = 0.04;
            float absX = abs(position.x);
            if (absX < midribWidth) {
                float depression = (1.0 - absX/midribWidth) * 0.02; // 0.02 deep
                transformed.z -= depression;
            }

            #ifdef USE_INSTANCING
                float worldX = instanceMatrix[3][0];
                float worldZ = instanceMatrix[3][2];
                // Kept local flutter/twist (high frequency)
                float flutter = sin(uTime * 3.0 + worldX) * 0.05 * position.x;
                float twist = position.x * sin(uTime * 2.0 + worldZ) * 0.2 * position.y;
                transformed.y += flutter + twist;
            #endif
            `
        )

        // Inject Global Wind in Project Vertex
        shader.vertexShader = shader.vertexShader.replace(
            '#include <project_vertex>',
            `
            vec4 mvPosition = vec4( transformed, 1.0 );
            #ifdef USE_INSTANCING
                mvPosition = instanceMatrix * mvPosition;
            #endif
            mvPosition = modelMatrix * mvPosition;

            vec3 windOffset = getWindOffset(mvPosition.xyz, uTime, uCameraPosition);
            mvPosition.xyz += windOffset;

            mvPosition = viewMatrix * mvPosition;
            gl_Position = projectionMatrix * mvPosition;
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

            vec3 freshColor = vec3(0.48, 0.60, 0.28);
            vec3 darkColor = vec3(0.25, 0.35, 0.15);
            vec3 dryColor = vec3(0.70, 0.65, 0.30);

            vec3 baseCol = mix(darkColor, freshColor, 0.5 + 0.5 * noise);

            if (vRandId > 0.9) {
                baseCol = mix(baseCol, dryColor, 0.7);
            }

            diffuseColor.rgb = baseCol;

            // Fake SSS
            vec3 sunDir = normalize(vec3(15.0, 25.0, 10.0));
            vec3 viewDir = normalize(uCameraPosition - vWorldPos);

            float dotViewSun = dot(viewDir, -sunDir);
            float backlight = smoothstep(0.0, 1.0, dotViewSun);

            float normalSun = dot(vNormal, sunDir);
            float transmission = smoothstep(0.0, 0.5, -normalSun);

            float sss = backlight * transmission;

            // Desaturated yellow-green for SSS
            vec3 sssColor = vec3(0.5, 0.6, 0.2) * sss * 1.5;
            diffuseColor.rgb += sssColor;

            float fresnel = 1.0 - abs(dot(viewDir, vNormal));
            diffuseColor.rgb += vec3(0.1, 0.2, 0.05) * fresnel * 0.5;
            `
        )
    }
    return mat
  }, [])

  const leafGeometry = useMemo(() => {
    // Increased segments for midrib
    const geo = new THREE.PlaneGeometry(0.2, 0.6, 6, 8)
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

      for (let attempt = 0; attempt < 10; attempt++) {
        x = (Math.random() - 0.5) * 2000
        z = (Math.random() - 0.5) * 2000

        const noiseVal = simplex.noise(x * 0.015, z * 0.015);
        const n = noiseVal * 0.5 + 0.5;

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

      tempStalk.position.set(x, 2.5, z)
      tempStalk.rotation.set(0, rotationY, 0)
      tempStalk.scale.set(scale, scale, scale)
      tempStalk.updateMatrix()
      stalks.push(tempStalk.matrix.clone())

      const numNodes = 5;
      for (let h = 0; h < numNodes; h++) {
          const localY = -1.5 + h * 1.0 + (Math.random() * 0.2 - 0.1);
          if (localY > 2.0) continue;

          if (Math.random() > 0.3) {
              const branchAngle = Math.random() * Math.PI * 2;

              tempBranch.position.set(x, 2.5 + localY * scale, z);
              tempBranch.rotation.set(0, branchAngle, 0);
              tempBranch.rotateX(-Math.PI / 4 - Math.random() * 0.2);

              const branchLen = 0.8 + Math.random() * 0.5;
              tempBranch.scale.set(scale * 0.5, branchLen, scale * 0.5);

              tempBranch.updateMatrix();
              branches.push(tempBranch.matrix.clone());

              const tilt = Math.PI / 4 + 0.1;
              const dy = Math.sin(tilt) * branchLen * scale;
              const dr = Math.cos(tilt) * branchLen * scale;
              const dx = Math.sin(branchAngle) * dr;
              const dz = Math.cos(branchAngle) * dr;

              const tipX = x + dx;
              const tipY = (2.5 + localY * scale) + dy;
              const tipZ = z + dz;

              const numLeaves = 3 + Math.floor(Math.random() * 3);
              for (let L = 0; L < numLeaves; L++) {
                   const leafAngle = Math.random() * Math.PI * 2;

                   tempLeaf.position.set(
                       tipX + (Math.random() - 0.5) * 0.2,
                       tipY + (Math.random() - 0.5) * 0.2,
                       tipZ + (Math.random() - 0.5) * 0.2
                   );

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

  const branchGeometry = useMemo(() => {
      const geo = new THREE.CylinderGeometry(0.02, 0.04, 1, 6);
      geo.translate(0, 0.5, 0);
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
