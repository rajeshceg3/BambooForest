import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { SimplexNoise } from 'three-stdlib'

export function GroundCover({ count = 100000 }) { // Increased count significantly
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const { camera } = useThree()

  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: '#4a5d23',
      roughness: 0.8,
      side: THREE.DoubleSide,
      flatShading: false,
    })

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 }
      shader.uniforms.uCameraPosition = { value: new THREE.Vector3() }
      mat.userData.shader = shader

      // Add uniform to vertex shader
      // Inject noise function
      const noiseFunc = `
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
      `

      shader.vertexShader = `
        uniform float uTime;
        uniform vec3 uCameraPosition;
        varying vec2 vUv;
        varying float vHeight;
        varying vec3 vPosition;
        ${noiseFunc}
        ${shader.vertexShader}
      `

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        vUv = uv;
        vHeight = position.y;

        #ifdef USE_INSTANCING
             vPosition = (instanceMatrix * vec4(position, 1.0)).xyz;
        #else
             vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        #endif

        #ifdef USE_INSTANCING
            float worldX = instanceMatrix[3][0];
            float worldZ = instanceMatrix[3][2];

            // Complex Wind Logic
            float windTime = uTime * 0.4;
            // Macro wind (gusts)
            float gustNoise = snoise(vec2(worldX * 0.02 + windTime, worldZ * 0.02 + windTime * 0.3));
            float gustStrength = smoothstep(-0.2, 0.6, gustNoise); // 0..1

            // Micro wind (flutter)
            float flutter = sin(uTime * 8.0 + worldX * 2.0 + worldZ * 1.5) * 0.05;

            // Directional sway
            float swayAmp = 0.1 + gustStrength * 0.4; // Base sway + gust
            float swayX = sin(uTime + worldX * 0.1) * swayAmp + flutter;
            float swayZ = cos(uTime * 0.8 + worldZ * 0.1) * swayAmp + flutter;

            // Apply stiffness
            float stiffness = smoothstep(0.0, 0.8, vHeight);
            float bendStiffness = pow(stiffness, 2.0);

            // Bias wind direction (e.g., blows towards +X +Z)
            float windBias = 0.1 * gustStrength;

            transformed.x += (swayX + windBias) * bendStiffness;
            transformed.z += (swayZ + windBias) * bendStiffness;

            // Droop when strong wind
            transformed.y -= abs(swayX + swayZ) * 0.2 * bendStiffness;

            // Player Interaction
            vec3 iWorldPos = vec3(worldX, 0.0, worldZ);
            vec3 dirToPlayer = iWorldPos - uCameraPosition;
            dirToPlayer.y = 0.0;

            float distToPlayer = length(dirToPlayer);
            float interactRadius = 2.5;

            if (distToPlayer < interactRadius) {
                float pushStrength = 1.0 - (distToPlayer / interactRadius);
                pushStrength = pow(pushStrength, 2.0); // Smooth falloff

                vec3 pushDir = normalize(dirToPlayer);

                // Bend away
                float pushAmt = 1.2 * pushStrength;

                // Only bend upper part
                transformed.x += pushDir.x * pushAmt * bendStiffness;
                transformed.z += pushDir.z * pushAmt * bendStiffness;

                // Also flatten slightly?
                // transformed.y -= pushAmt * 0.3 * bendStiffness;
            }
        #endif
        `
      )

      shader.fragmentShader = `
        varying vec2 vUv;
        varying float vHeight;
        varying vec3 vPosition;
        uniform vec3 uCameraPosition;
        ${noiseFunc}
        ${shader.fragmentShader}
      `

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>

        vec3 darkGreen = vec3(0.15, 0.25, 0.05);
        vec3 midGreen = vec3(0.3, 0.45, 0.15);
        vec3 tipGreen = vec3(0.5, 0.6, 0.25);
        vec3 deadGreen = vec3(0.4, 0.4, 0.2);

        float h = smoothstep(0.0, 0.6, vHeight);

        // Gradient
        vec3 grassColor = mix(darkGreen, midGreen, h);
        grassColor = mix(grassColor, tipGreen, smoothstep(0.5, 1.0, h));

        // Noise Variation (Color)
        float colorNoise = snoise(vPosition.xz * 0.1); // Low freq patchiness
        grassColor = mix(grassColor, deadGreen, smoothstep(0.6, 0.9, colorNoise));

        // Highlights
        grassColor = mix(grassColor, grassColor * 1.3, smoothstep(0.3, 1.0, snoise(vPosition.xz * 1.0)));

        // Backlight / Translucency
        vec3 sunDir = normalize(vec3(15.0, 25.0, 10.0));
        vec3 viewDir = normalize(uCameraPosition - vPosition);

        float dotViewSun = dot(viewDir, -sunDir);
        float sunGlow = smoothstep(0.0, 1.0, dotViewSun);

        // Additive glow only at tips and when looking at sun
        // Use a mix instead of pure add to preserve shadow info partially?
        // Actually, translucency ADDS light.
        vec3 translucencyColor = vec3(0.6, 0.7, 0.2) * sunGlow * 0.6 * h;

        diffuseColor.rgb = grassColor + translucencyColor;
        `
      )
    }
    return mat
  }, [])

  const geometry = useMemo(() => {
      const width = 0.1; // Slightly wider
      const height = 0.8; // Slightly taller
      const geo = new THREE.PlaneGeometry(width, height, 2, 4)
      geo.translate(0, height / 2, 0)

      const pos = geo.attributes.position
      for (let i = 0; i < pos.count; i++) {
          const y = pos.getY(i)
          const x = pos.getX(i)

          const u = Math.max(0, y / height)
          const taper = 1.0 - Math.pow(u, 1.5);
          pos.setX(i, x * taper)

          // Curve
          const curve = u * u * 0.3;

          // Spine indent
          const isSpine = Math.abs(x) < 0.001;
          const spineOffset = isSpine ? -0.05 * (1.0 - u) : 0.0;

          // Apply curve to Z
          pos.setZ(i, pos.getZ(i) - curve + spineOffset)
      }

      geo.computeVertexNormals()
      return geo
  }, [])

  const instances = useMemo(() => {
    const temp = []
    const tempObject = new THREE.Object3D()
    const simplex = new SimplexNoise()

    for (let i = 0; i < count; i++) {
        let x = 0, z = 0
        let valid = false

        // Try to place grass
        for(let attempt = 0; attempt < 5; attempt++) {
            x = (Math.random() - 0.5) * 2000
            z = (Math.random() - 0.5) * 2000

            // Noise Clustering
            // Match bamboo noise scale
            const noiseVal = simplex.noise(x * 0.015, z * 0.015);
            const n = noiseVal * 0.5 + 0.5;

            // Bamboo is > 0.45.
            // We want grass EVERYWHERE, but denser in clearings (< 0.45)
            // and sparser in groves (> 0.45).

            let probability = 1.0;
            if (n > 0.45) {
                // In bamboo grove -> Sparse grass
                probability = 0.3;
            } else {
                // In clearing -> Dense grass
                probability = 0.9;
            }

            // Random check against probability
            if (Math.random() > probability) continue;

            const distToStream = Math.abs(x + z) / Math.sqrt(2)
            const distToCenter = Math.sqrt(x * x + z * z)

            if (distToStream < 2) continue // Too close to water
            if (distToCenter < 2) continue

            valid = true;
            break;
        }

        if (!valid) continue; // Skip this instance slot if couldn't place

        const scale = 0.6 + Math.random() * 0.8 // Varied scale
        tempObject.position.set(x, 0, z)

        tempObject.rotation.y = Math.random() * Math.PI * 2
        tempObject.rotation.x = (Math.random() - 0.5) * 0.3
        tempObject.rotation.z = (Math.random() - 0.5) * 0.3

        tempObject.scale.set(scale, scale, scale)
        tempObject.updateMatrix()
        temp.push(tempObject.matrix.clone())
    }
    return temp
  }, [count])

  useEffect(() => {
    if (!meshRef.current) return
    // Note: instances.length might be less than count due to skipping
    // But we initialized InstancedMesh with `count`.
    // We should update the count or just set unused matrices to 0 scale.
    // However, usually we just set the count to the actual number of instances.

    // Resize logic:
    // instancedMesh.count is writable.
    meshRef.current.count = instances.length;

    instances.forEach((matrix, i) => meshRef.current!.setMatrixAt(i, matrix))
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [instances])

  useFrame((state) => {
    if (material.userData.shader) {
        material.userData.shader.uniforms.uTime.value = state.clock.getElapsedTime()
        material.userData.shader.uniforms.uCameraPosition.value.copy(camera.position)
    }
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, count]} // Initial buffer size
      castShadow
      receiveShadow
      geometry={geometry}
    >
      <primitive object={material} attach="material" />
    </instancedMesh>
  )
}
