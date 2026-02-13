import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SimplexNoise } from 'three-stdlib'

export function Birds({ count = 20 }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const simplex = useMemo(() => new SimplexNoise(), [])

  const [instances, velocities] = useMemo(() => {
    const inst = []
    const vel = []
    const tempObject = new THREE.Object3D()

    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 60
      const y = 10 + Math.random() * 10
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
        // Flap wings
        float flapSpeed = 15.0;
        float flapAmp = 0.15;
        float flap = sin(uTime * flapSpeed + position.x * 5.0) * flapAmp;

        // Bend wings up/down based on X distance from center
        float dist = abs(position.x);
        if (dist > 0.05) {
            transformed.y += flap * (dist * 5.0);
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

    const t = state.clock.getElapsedTime()

    currentPositions.forEach((pos, i) => {
      const v = velocities[i]

      // Noise steering
      // Use i to offset noise space
      const noiseX = simplex.noise(t * 0.1 + i * 10.0, i * 0.1)
      const noiseZ = simplex.noise(t * 0.1 + i * 10.0 + 100.0, i * 0.1)

      v.x += noiseX * 0.003
      v.z += noiseZ * 0.003

      // Height control
      // Tend towards y=15
      const targetY = 15.0 + Math.sin(t * 0.2 + i) * 5.0
      v.y += (targetY - pos.y) * 0.001

      // Speed limit
      const speed = 0.15
      v.normalize().multiplyScalar(speed)

      pos.add(v)

      // Soft Bounds
      const bound = 80
      if (pos.x > bound) v.x -= 0.01
      if (pos.x < -bound) v.x += 0.01
      if (pos.z > bound) v.z -= 0.01
      if (pos.z < -bound) v.z += 0.01

      dummy.position.copy(pos)
      // Orient to velocity
      dummy.rotation.y = Math.atan2(-v.z, v.x) // atan2(y, x) -> z is y here.
      // ThreeJS rotation Y 0 is facing +Z usually?
      // Plane is XY.
      // If we want plane to fly "forward" along X axis?
      // Let's assume plane length is X axis.
      // Then rotation should be atan2(v.z, v.x)?
      dummy.rotation.y = Math.atan2(-v.z, v.x)

      // Bank based on turn
      const turn = v.x * noiseZ - v.z * noiseX // Cross product-ish
      dummy.rotation.z = turn * 20.0

      dummy.updateMatrix()
      meshRef.current!.setMatrixAt(i, dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  const geometry = useMemo(() => {
     const geo = new THREE.PlaneGeometry(0.5, 0.15, 8, 1)
     geo.rotateX(-Math.PI / 2) // Lay flat. Width (wings) is X. Length (body) is Z.
     return geo
  }, [])

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} material={material} geometry={geometry}>
    </instancedMesh>
  )
}
