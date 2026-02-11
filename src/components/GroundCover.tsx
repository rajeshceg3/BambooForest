import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

export function GroundCover({ count = 15000 }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const { camera } = useThree()

  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: '#4a5d23', // Base color
      roughness: 0.8,
      side: THREE.DoubleSide,
      flatShading: false,
    })

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 }
      shader.uniforms.uCameraPosition = { value: new THREE.Vector3() }
      mat.userData.shader = shader

      shader.vertexShader = `
        uniform float uTime;
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
        vHeight = position.y; // 0.0 to 0.6

        #ifdef USE_INSTANCING
            float worldX = instanceMatrix[3][0];
            float worldZ = instanceMatrix[3][2];

            // Wind sway
            // More complex wind
            float windFreq = 2.0;
            float windAmp = 0.15;
            float noise = sin(worldX * 0.1 + uTime) * cos(worldZ * 0.1 + uTime * 0.5);

            float swayX = sin(uTime * windFreq + worldX * 0.5) * windAmp + noise * 0.05;
            float swayZ = cos(uTime * windFreq * 0.8 + worldZ * 0.5) * windAmp + noise * 0.05;

            // Add flutter (high frequency)
            float flutter = sin(uTime * 10.0 + worldX * 5.0) * 0.02 * smoothstep(0.0, 0.5, vHeight);
            swayX += flutter;

            // Apply wind exponentially with height
            float stiffness = smoothstep(0.0, 0.5, vHeight); // 0 at bottom, 1 at top
            stiffness = pow(stiffness, 2.0);

            transformed.x += swayX * stiffness;
            transformed.z += swayZ * stiffness;
        #endif
        `
      )

      // Color variation in fragment shader
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

        // Vertical gradient
        vec3 darkGreen = vec3(0.15, 0.25, 0.05); // Dark base
        vec3 midGreen = vec3(0.3, 0.45, 0.15);   // Mid
        vec3 tipGreen = vec3(0.5, 0.6, 0.25);    // Light tip

        // Height normalized (0 to 0.6 -> 0 to 1)
        float h = smoothstep(0.0, 0.6, vHeight);

        vec3 grassColor = mix(darkGreen, midGreen, h);
        grassColor = mix(grassColor, tipGreen, smoothstep(0.5, 1.0, h));

        // Random variation
        float noise = sin(vPosition.x * 0.1) * cos(vPosition.z * 0.1);
        grassColor = mix(grassColor, grassColor * 1.2, noise * 0.2 + 0.2);

        // Fake Subsurface Scattering (Backlight)
        vec3 sunDir = normalize(vec3(15.0, 25.0, 10.0));
        vec3 viewDir = normalize(uCameraPosition - vPosition);

        float dotViewSun = dot(viewDir, sunDir);
        float sunGlow = smoothstep(0.0, 1.0, -dotViewSun);

        // Add warm glow
        grassColor += vec3(0.4, 0.5, 0.2) * sunGlow * 0.5 * h; // Glow more at tip

        diffuseColor.rgb = grassColor;
        `
      )
    }
    return mat
  }, [])

  const geometry = useMemo(() => {
      // Blade shape
      const width = 0.08;
      const height = 0.6;
      // 2 width segments (3 columns of verts) to create V-shape spine
      const geo = new THREE.PlaneGeometry(width, height, 2, 4)
      geo.translate(0, height / 2, 0) // Pivot at bottom

      const pos = geo.attributes.position
      for (let i = 0; i < pos.count; i++) {
          const y = pos.getY(i)
          const x = pos.getX(i)

          // Normalized height 0 to 1
          const u = Math.max(0, y / height)

          // Taper width
          // Quadratic taper looks more natural
          const taper = 1.0 - Math.pow(u, 1.5);
          pos.setX(i, x * taper)

          // Bend forward (Z) - Curve = u^2
          const curve = u * u * 0.2;

          // Create V-shape cross section (Spine)
          // If x is near 0, push it back (negative Z relative to blade face, but blade faces Z)
          // Actually, let's push the sides forward (positive Z) and keep spine at 0?
          // Or push spine back.
          // Let's push spine back (negative Z) to create a groove.
          const isSpine = Math.abs(x) < 0.001;
          const spineOffset = isSpine ? -0.02 * (1.0 - u) : 0.0; // Taper the spine depth too

          pos.setZ(i, pos.getZ(i) - curve + spineOffset)
      }
      geo.computeVertexNormals()
      return geo
  }, [])

  const instances = useMemo(() => {
    const temp = []
    const tempObject = new THREE.Object3D()

    for (let i = 0; i < count; i++) {
        let x = 0, z = 0
        let valid = false

        // Try to place grass
        while (!valid) {
            x = (Math.random() - 0.5) * 2000
            z = (Math.random() - 0.5) * 2000

            // Logic matching BambooForest
            const distToStream = Math.abs(x + z) / Math.sqrt(2)
            const distToCenter = Math.sqrt(x * x + z * z)

            valid = true
            // Don't put grass IN the stream, but near it is ok
            if (distToStream < 2) valid = false
            // Keep grass out of the absolute center where the camera might start
            if (distToCenter < 2) valid = false
        }

        const scale = 0.6 + Math.random() * 0.6
        tempObject.position.set(x, 0, z)

        // Random rotation Y
        tempObject.rotation.y = Math.random() * Math.PI * 2

        // Random tilt (sway static)
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
      args={[undefined, undefined, count]}
      castShadow
      receiveShadow
      geometry={geometry}
    >
      <primitive object={material} attach="material" />
    </instancedMesh>
  )
}
