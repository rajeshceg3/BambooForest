import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Boids constants
const VISUAL_RANGE = 15.0
const PROTECTED_RANGE = 2.0
const MATCHING_FACTOR = 0.05
const CENTERING_FACTOR = 0.0005
const AVOID_FACTOR = 0.05
const TURN_FACTOR = 0.2
const MAX_SPEED = 0.3
const MIN_SPEED = 0.15
const BOUNDS = 80

export function Birds({ count = 30 }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)

  // Data arrays
  const positions = useMemo(() => new Float32Array(count * 3), [count])
  const velocities = useMemo(() => new Float32Array(count * 3), [count])

  // Initialize
  useMemo(() => {
      for(let i=0; i<count; i++) {
          positions[i*3] = (Math.random() - 0.5) * 100
          positions[i*3+1] = 10 + Math.random() * 20
          positions[i*3+2] = (Math.random() - 0.5) * 100

          velocities[i*3] = (Math.random() - 0.5) * MAX_SPEED
          velocities[i*3+1] = (Math.random() - 0.5) * MAX_SPEED * 0.1
          velocities[i*3+2] = (Math.random() - 0.5) * MAX_SPEED
      }
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
        // Flap wings based on time and index
        float flapSpeed = 20.0;
        float flapAmp = 0.2;

        // Random phase per instance (using position as seed)
        float phase = instanceMatrix[3][0] * 0.1 + instanceMatrix[3][2] * 0.1;

        float flap = sin(uTime * flapSpeed + phase) * flapAmp;

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

  useFrame((state) => {
    if (!meshRef.current) return
    if (material.userData.shader) {
      material.userData.shader.uniforms.uTime.value = state.clock.getElapsedTime()
    }

    // Boids Update Loop
    for (let i = 0; i < count; i++) {
        let x = positions[i*3]
        let y = positions[i*3+1]
        let z = positions[i*3+2]

        let oldVx = velocities[i*3]
        let oldVy = velocities[i*3+1]
        let oldVz = velocities[i*3+2]

        let vx = oldVx
        let vy = oldVy
        let vz = oldVz

        let closeDx = 0, closeDy = 0, closeDz = 0
        let xAvg = 0, yAvg = 0, zAvg = 0
        let vxAvg = 0, vyAvg = 0, vzAvg = 0
        let neighbors = 0

        for (let j = 0; j < count; j++) {
            if (i === j) continue

            const dx = positions[j*3] - x
            const dy = positions[j*3+1] - y
            const dz = positions[j*3+2] - z
            const distSq = dx*dx + dy*dy + dz*dz

            if (distSq < VISUAL_RANGE * VISUAL_RANGE) {
                // Separation
                if (distSq < PROTECTED_RANGE * PROTECTED_RANGE) {
                    closeDx += x - positions[j*3]
                    closeDy += y - positions[j*3+1]
                    closeDz += z - positions[j*3+2]
                }

                // Alignment & Cohesion accumulators
                xAvg += positions[j*3]
                yAvg += positions[j*3+1]
                zAvg += positions[j*3+2]

                vxAvg += velocities[j*3]
                vyAvg += velocities[j*3+1]
                vzAvg += velocities[j*3+2]

                neighbors++
            }
        }

        // Separation
        vx += closeDx * AVOID_FACTOR
        vy += closeDy * AVOID_FACTOR
        vz += closeDz * AVOID_FACTOR

        if (neighbors > 0) {
            // Alignment
            vxAvg /= neighbors
            vyAvg /= neighbors
            vzAvg /= neighbors

            vx += (vxAvg - vx) * MATCHING_FACTOR
            vy += (vyAvg - vy) * MATCHING_FACTOR
            vz += (vzAvg - vz) * MATCHING_FACTOR

            // Cohesion
            xAvg /= neighbors
            yAvg /= neighbors
            zAvg /= neighbors

            vx += (xAvg - x) * CENTERING_FACTOR
            vy += (yAvg - y) * CENTERING_FACTOR
            vz += (zAvg - z) * CENTERING_FACTOR
        }

        // Bounds (Turn back if too far)
        if (x < -BOUNDS) vx += TURN_FACTOR
        if (x > BOUNDS) vx -= TURN_FACTOR
        if (z < -BOUNDS) vz += TURN_FACTOR
        if (z > BOUNDS) vz -= TURN_FACTOR

        // Height Control (Stay between 10 and 40)
        if (y < 10) vy += TURN_FACTOR
        if (y > 40) vy -= TURN_FACTOR

        // Speed Limit
        const speedSq = vx*vx + vy*vy + vz*vz
        const speed = Math.sqrt(speedSq)

        if (speed > MAX_SPEED) {
            vx = (vx / speed) * MAX_SPEED
            vy = (vy / speed) * MAX_SPEED
            vz = (vz / speed) * MAX_SPEED
        } else if (speed < MIN_SPEED) {
             vx = (vx / speed) * MIN_SPEED
             vy = (vy / speed) * MIN_SPEED
             vz = (vz / speed) * MIN_SPEED
        }

        velocities[i*3] = vx
        velocities[i*3+1] = vy
        velocities[i*3+2] = vz

        positions[i*3] += vx
        positions[i*3+1] += vy
        positions[i*3+2] += vz

        // Update Instance
        dummy.position.set(positions[i*3], positions[i*3+1], positions[i*3+2])

        // Face Velocity
        // dummy.lookAt(positions[i*3] + vx, positions[i*3+1] + vy, positions[i*3+2] + vz)
        // Manual rotation for better control
        // Pitch (X) and Yaw (Y)
        // Yaw
        const yaw = Math.atan2(vx, vz)
        // Pitch (negative because +Y is up, and pitching down means rotating +X? No, -X)
        const pitch = Math.atan2(vy, Math.sqrt(vx*vx + vz*vz))

        dummy.rotation.set(0, 0, 0)
        dummy.rotateY(yaw)
        dummy.rotateX(-pitch) // Tilt up/down

        // Bank (Roll) based on turn rate
        const oldYaw = Math.atan2(oldVx, oldVz)
        let dYaw = yaw - oldYaw

        // Handle wrap around
        while (dYaw > Math.PI) dYaw -= Math.PI * 2
        while (dYaw < -Math.PI) dYaw += Math.PI * 2

        // Smooth banking? It might jitter if turn is instant.
        // But let's try direct banking into turn.
        // Bank left (positive Z rotation) if turning left (positive yaw change)?
        // Wait, standard flight: Bank left -> roll left -> Z rotation?
        // ThreeJS: +Z is out of screen (if Y up).
        // Forward is +Z in model space? No, usually -Z.
        // Let's stick to trial: dYaw positive (left turn) -> Bank Left (roll left).
        // Roll left is usually negative Z rotation?
        // Let's try:
        const bankAngle = dYaw * 20.0
        dummy.rotateZ(bankAngle)

        dummy.updateMatrix()
        meshRef.current.setMatrixAt(i, dummy.matrix)
    }
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
