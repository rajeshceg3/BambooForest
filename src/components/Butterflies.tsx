import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SimplexNoise } from 'three-stdlib'

export function Butterflies({ count = 15 }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const simplex = useMemo(() => new SimplexNoise(), [])

  const [instances, offsets] = useMemo(() => {
    const inst = []
    const off = []
    const tempObject = new THREE.Object3D()

    for (let i = 0; i < count; i++) {
      // Start randomly around
      const x = (Math.random() - 0.5) * 30
      const y = 1 + Math.random() * 4
      const z = (Math.random() - 0.5) * 30

      tempObject.position.set(x, y, z)
      tempObject.updateMatrix()
      inst.push(tempObject.matrix.clone())
      off.push(Math.random() * 100) // Random time offset
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
        // Very fast flutter
        float flap = sin(uTime * 25.0 + position.x * 10.0) * 0.4;
        if (abs(position.x) > 0.01) {
            transformed.y += flap * abs(position.x);
        }
        `
      )
      mat.userData.shader = shader
    }
    return mat
  }, [])

  const dummy = useMemo(() => new THREE.Object3D(), [])

  // Store original home positions
  const homes = useMemo(() => instances.map(m => {
      const p = new THREE.Vector3()
      p.setFromMatrixPosition(m)
      return p
  }), [instances])

  useFrame((state) => {
    if (!meshRef.current) return
    if (material.userData.shader) {
      material.userData.shader.uniforms.uTime.value = state.clock.getElapsedTime()
    }

    const t = state.clock.getElapsedTime()

    homes.forEach((home, i) => {
      const off = offsets[i]
      const time = t + off

      // Erratic movement around home
      // Use noise for smooth but random path
      const nX = simplex.noise(time * 0.5, i * 0.1)
      const nY = simplex.noise(time * 0.5 + 100, i * 0.1)
      const nZ = simplex.noise(time * 0.5 + 200, i * 0.1)

      const wanderRadius = 3.0

      const x = home.x + nX * wanderRadius
      const y = home.y + nY * 1.5 // Less vertical range
      const z = home.z + nZ * wanderRadius

      dummy.position.set(x, y, z)

      // Face direction of movement (derivative of noise)
      // d(noise)/dt approx noise(t+dt) - noise(t)
      const dt = 0.1
      const nX_next = simplex.noise((time + dt) * 0.5, i * 0.1)
      const nZ_next = simplex.noise((time + dt) * 0.5 + 200, i * 0.1)

      const dx = (nX_next - nX)
      const dz = (nZ_next - nZ)

      dummy.rotation.y = Math.atan2(dx, dz)

      dummy.scale.set(0.1, 0.1, 0.1)
      dummy.updateMatrix()
      meshRef.current!.setMatrixAt(i, dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(0.3, 0.3, 2, 1)
    geo.rotateX(-Math.PI / 2) // Lay flat
    return geo
  }, [])

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} material={material} geometry={geometry}>
    </instancedMesh>
  )
}
