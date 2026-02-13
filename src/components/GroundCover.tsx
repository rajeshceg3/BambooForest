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
      shader.vertexShader = `
        uniform float uTime;
        uniform vec3 uCameraPosition;
        varying vec2 vUv;
        varying float vHeight;
        varying vec3 vPosition;
        ${shader.vertexShader}
      `

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        vUv = uv;
        vHeight = position.y;

        #ifdef USE_INSTANCING
            float worldX = instanceMatrix[3][0];
            float worldZ = instanceMatrix[3][2];

            // Wind sway
            float windFreq = 2.0;
            float windAmp = 0.15;
            float noise = sin(worldX * 0.1 + uTime) * cos(worldZ * 0.1 + uTime * 0.5);

            float swayX = sin(uTime * windFreq + worldX * 0.5) * windAmp + noise * 0.05;
            float swayZ = cos(uTime * windFreq * 0.8 + worldZ * 0.5) * windAmp + noise * 0.05;

            float flutter = sin(uTime * 10.0 + worldX * 5.0) * 0.02 * smoothstep(0.0, 0.5, vHeight);
            swayX += flutter;

            float stiffness = smoothstep(0.0, 0.5, vHeight);
            float bendStiffness = pow(stiffness, 2.0);

            transformed.x += swayX * bendStiffness;
            transformed.z += swayZ * bendStiffness;

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
        ${shader.fragmentShader}
      `

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        vPosition = (instanceMatrix * vec4(position, 1.0)).xyz;
        `
      )

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>

        vec3 darkGreen = vec3(0.15, 0.25, 0.05);
        vec3 midGreen = vec3(0.3, 0.45, 0.15);
        vec3 tipGreen = vec3(0.5, 0.6, 0.25);

        float h = smoothstep(0.0, 0.6, vHeight);

        vec3 grassColor = mix(darkGreen, midGreen, h);
        grassColor = mix(grassColor, tipGreen, smoothstep(0.5, 1.0, h));

        float noise = sin(vPosition.x * 0.1) * cos(vPosition.z * 0.1);
        grassColor = mix(grassColor, grassColor * 1.2, noise * 0.2 + 0.2);

        vec3 sunDir = normalize(vec3(15.0, 25.0, 10.0));
        vec3 viewDir = normalize(uCameraPosition - vPosition);

        float dotViewSun = dot(viewDir, sunDir);
        float sunGlow = smoothstep(0.0, 1.0, -dotViewSun);

        grassColor += vec3(0.4, 0.5, 0.2) * sunGlow * 0.5 * h;

        diffuseColor.rgb = grassColor;
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
