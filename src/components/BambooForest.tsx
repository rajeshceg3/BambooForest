import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export function BambooForest({ count = 300 }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)

  // Custom material setup
  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
        color: '#7b904b', // Slightly more natural muted green
        roughness: 0.8,
        flatShading: false,
    })

    // Inject shader for wind
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
    }
    return mat
  }, [])

  // Generate instances
  const instances = useMemo(() => {
    const temp: THREE.Matrix4[] = []
    const tempObject = new THREE.Object3D()

    for (let i = 0; i < count; i++) {
      // Create a path/clearing in the middle
      let x = 0, z = 0
      let valid = false
      while (!valid) {
          x = (Math.random() - 0.5) * 120
          z = (Math.random() - 0.5) * 120
          const dist = Math.sqrt(x*x + z*z)
          // Clearing in middle (radius 8)
          if (dist > 8) valid = true
      }

      const rotationY = Math.random() * Math.PI * 2
      const scale = 0.8 + Math.random() * 0.6

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
          material.userData.shader.uniforms.uTime.value = state.clock.getElapsedTime()
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
      <cylinderGeometry args={[0.08, 0.15, 5, 8]} />
      <primitive object={material} attach="material" />
    </instancedMesh>
  )
}
