import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export function Birds({ count = 10 }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)

  const [instances, velocities] = useMemo(() => {
    const inst = []
    const vel = []
    const tempObject = new THREE.Object3D()

    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 60
      const y = 5 + Math.random() * 10
      const z = (Math.random() - 0.5) * 60

      tempObject.position.set(x, y, z)
      tempObject.rotation.y = Math.random() * Math.PI * 2
      tempObject.updateMatrix()
      inst.push(tempObject.matrix.clone())
      vel.push(new THREE.Vector3((Math.random() - 0.5) * 0.1, 0, (Math.random() - 0.5) * 0.1))
    }
    return [inst, vel]
  }, [count])

  const material = useMemo(() => {
    const mat = new THREE.MeshBasicMaterial({
      color: '#333333',
      side: THREE.DoubleSide,
    })

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 }
      shader.vertexShader = `
        uniform float uTime;
        ${shader.vertexShader}
      `
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        // Simple wing flap
        float flap = sin(uTime * 10.0 + position.x * 2.0) * 0.2;
        if (abs(position.x) > 0.1) {
            transformed.y += flap * abs(position.x);
        }
        `
      )
      mat.userData.shader = shader
    }
    return mat
  }, [])

  const dummy = useMemo(() => new THREE.Object3D(), [])
  const currentPositions = useMemo(() => instances.map(m => {
    const pos = new THREE.Vector3()
    pos.setFromMatrixPosition(m)
    return pos
  }), [instances])

  useFrame((state) => {
    if (!meshRef.current) return
    if (material.userData.shader) {
      material.userData.shader.uniforms.uTime.value = state.clock.getElapsedTime()
    }

    currentPositions.forEach((pos, i) => {
      const v = velocities[i]
      pos.add(v)

      // Keep within bounds
      if (Math.abs(pos.x) > 50) v.x *= -1
      if (Math.abs(pos.z) > 50) v.z *= -1

      // Gentle altitude change
      pos.y += Math.sin(state.clock.getElapsedTime() * 0.5 + i) * 0.01

      dummy.position.copy(pos)
      dummy.rotation.y = Math.atan2(v.x, v.z) + Math.PI / 2
      dummy.updateMatrix()
      meshRef.current!.setMatrixAt(i, dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} material={material}>
      <planeGeometry args={[0.4, 0.1]} />
    </instancedMesh>
  )
}
