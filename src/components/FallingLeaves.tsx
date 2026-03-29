import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface FallingLeavesProps {
  count?: number
}

export function FallingLeaves({ count = 100 }: FallingLeavesProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)

  const [matrices, colors, phases] = useMemo(() => {
    const mat = new Float32Array(count * 16)
    const col = new Float32Array(count * 3)
    const ph = new Float32Array(count * 3) // x: speed, y: sway offset, z: rotation speed

    const dummy = new THREE.Matrix4()
    const color = new THREE.Color()

    for (let i = 0; i < count; i++) {
      // Start high up, scattered randomly
      const x = (Math.random() - 0.5) * 80
      const y = Math.random() * 40 + 10 // Height 10 to 50
      const z = (Math.random() - 0.5) * 80

      dummy.makeTranslation(x, y, z)

      // Random rotation
      dummy.multiply(new THREE.Matrix4().makeRotationFromEuler(
        new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
      ))

      // Scale down to leaf size
      const scale = 0.15 + Math.random() * 0.1
      dummy.scale(new THREE.Vector3(scale, scale, scale))

      dummy.toArray(mat, i * 16)

      // Leaf colors (bamboo/dead leaves: yellows, browns, light greens)
      const hues = [0.15, 0.2, 0.12, 0.25]
      color.setHSL(hues[Math.floor(Math.random() * hues.length)], 0.6 + Math.random() * 0.3, 0.4 + Math.random() * 0.3)
      color.toArray(col, i * 3)

      // Phase physics
      ph[i * 3] = 0.5 + Math.random() * 1.5      // Fall speed
      ph[i * 3 + 1] = Math.random() * Math.PI * 2 // Sway offset
      ph[i * 3 + 2] = (Math.random() - 0.5) * 2.0 // Rotation speed
    }
    return [mat, col, ph]
  }, [count])

  const dummy = useMemo(() => new THREE.Matrix4(), [])
  const position = useMemo(() => new THREE.Vector3(), [])
  const rotation = useMemo(() => new THREE.Quaternion(), [])
  const scale = useMemo(() => new THREE.Vector3(), [])
  const euler = useMemo(() => new THREE.Euler(), [])

  useFrame((state, delta) => {
    if (!meshRef.current) return

    const time = state.clock.getElapsedTime()

    for (let i = 0; i < count; i++) {
      dummy.fromArray(matrices, i * 16)
      dummy.decompose(position, rotation, scale)

      const speed = phases[i * 3]
      const swayOffset = phases[i * 3 + 1]
      const rotSpeed = phases[i * 3 + 2]

      // Fall down
      position.y -= speed * delta

      // Reset at top if it hits the ground
      if (position.y < 0) {
        position.y = 40 + Math.random() * 10
        position.x = (Math.random() - 0.5) * 80
        position.z = (Math.random() - 0.5) * 80
      }

      // Sway side to side (wind effect)
      position.x += Math.sin(time + swayOffset) * delta * 0.5
      position.z += Math.cos(time * 0.8 + swayOffset) * delta * 0.5

      // Slowly tumble
      euler.setFromQuaternion(rotation)
      euler.x += rotSpeed * delta
      euler.y += (rotSpeed * 0.5) * delta
      rotation.setFromEuler(euler)

      dummy.compose(position, rotation, scale)
      dummy.toArray(meshRef.current.instanceMatrix.array, i * 16)
    }

    meshRef.current.instanceMatrix.needsUpdate = true
  })

  // Simple plane with double side and basic leaf texture/shape
  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
      <planeGeometry args={[0.5, 1.2]} />
      <meshStandardMaterial
        roughness={0.8}
        side={THREE.DoubleSide}
        transparent
        alphaTest={0.5}
        depthWrite={true}
      />
      <instancedBufferAttribute attach="instanceColor" args={[colors, 3]} />
    </instancedMesh>
  )
}
