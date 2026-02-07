import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export function GroundCover({ count = 15000 }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)

  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: '#4a5d23', // Mossy green
      roughness: 0.8,
      side: THREE.DoubleSide,
      flatShading: false,
    })

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 }
      mat.userData.shader = shader

      shader.vertexShader = `
        uniform float uTime;
        ${shader.vertexShader}
      `

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>

        #ifdef USE_INSTANCING
            float worldX = instanceMatrix[3][0];
            float worldZ = instanceMatrix[3][2];

            // Simple wind
            float wind = sin(uTime * 2.0 + worldX * 0.5 + worldZ * 0.5) * 0.1;
            float wind2 = cos(uTime * 1.5 + worldX * 0.3) * 0.1;

            // Apply wind to top of grass (y > 0)
            float h = position.y; // 0 to 0.5
            if (h > 0.0) {
                transformed.x += wind * h * 4.0;
                transformed.z += wind2 * h * 4.0;
            }
        #endif
        `
      )

      // Color variation in fragment shader
      shader.fragmentShader = `
        varying vec3 vPosition;
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

        float noise = sin(vPosition.x * 0.1) * cos(vPosition.z * 0.1);
        vec3 color1 = vec3(0.29, 0.36, 0.14); // #4a5d23
        vec3 color2 = vec3(0.22, 0.28, 0.11); // #38471c

        diffuseColor.rgb = mix(color1, color2, noise * 0.5 + 0.5);
        `
      )
    }
    return mat
  }, [])

  const geometry = useMemo(() => {
      const geo = new THREE.ConeGeometry(0.05, 0.5, 3)
      geo.translate(0, 0.25, 0)
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

        const scale = 0.5 + Math.random() * 0.5
        tempObject.position.set(x, 0, z)
        tempObject.rotation.y = Math.random() * Math.PI * 2
        // Random slight tilt
        tempObject.rotation.x = (Math.random() - 0.5) * 0.2
        tempObject.rotation.z = (Math.random() - 0.5) * 0.2

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
