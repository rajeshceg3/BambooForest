import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export function Butterflies({ count = 5 }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)

  const [instances, offsets] = useMemo(() => {
    const inst = []
    const off = []
    const tempObject = new THREE.Object3D()

    for (let i = 0; i < count; i++) {
      const x = 10 + (Math.random() - 0.5) * 10
      const y = 1 + Math.random() * 2
      const z = 10 + (Math.random() - 0.5) * 10

      tempObject.position.set(x, y, z)
      tempObject.updateMatrix()
      inst.push(tempObject.matrix.clone())
      off.push(Math.random() * Math.PI * 2)
    }
    return [inst, off]
  }, [count])

  const material = useMemo(() => {
    const mat = new THREE.MeshBasicMaterial({
      color: '#ffccaa',
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
        float flap = sin(uTime * 15.0) * 0.1;
        if (abs(position.x) > 0.01) {
            transformed.y += flap * abs(position.x) * 10.0;
        }
        `
      )
      mat.userData.shader = shader
    }
    return mat
  }, [])

  const dummy = useMemo(() => new THREE.Object3D(), [])
  const tempPos = useMemo(() => new THREE.Vector3(), [])

  useFrame((state) => {
    if (!meshRef.current) return
    if (material.userData.shader) {
      material.userData.shader.uniforms.uTime.value = state.clock.getElapsedTime()
    }

    instances.forEach((m, i) => {
      tempPos.setFromMatrixPosition(m)

      const time = state.clock.getElapsedTime() + offsets[i]
      tempPos.x += Math.sin(time * 0.5) * 0.01
      tempPos.y += Math.sin(time * 1.2) * 0.01
      tempPos.z += Math.cos(time * 0.8) * 0.01

      dummy.position.copy(tempPos)
      dummy.rotation.y = time
      dummy.scale.set(0.1, 0.1, 0.1)
      dummy.updateMatrix()
      meshRef.current!.setMatrixAt(i, dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} material={material}>
      <planeGeometry args={[0.2, 0.2]} />
    </instancedMesh>
  )
}
