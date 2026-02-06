import { useFrame, useThree } from '@react-three/fiber'
import { useRef, useEffect } from 'react'
import * as THREE from 'three'

export function Navigation() {
  const { camera } = useThree()
  const moveState = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
  })

  // Touch state
  const touchState = useRef({
    active: false,
    startX: 0,
    startY: 0,
    currX: 0,
    currY: 0
  })

  const velocity = useRef(new THREE.Vector3())
  const direction = useRef(new THREE.Vector3())

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          moveState.current.forward = true
          break
        case 'ArrowDown':
        case 'KeyS':
          moveState.current.backward = true
          break
        case 'ArrowLeft':
        case 'KeyA':
          moveState.current.left = true
          break
        case 'ArrowRight':
        case 'KeyD':
          moveState.current.right = true
          break
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          moveState.current.forward = false
          break
        case 'ArrowDown':
        case 'KeyS':
          moveState.current.backward = false
          break
        case 'ArrowLeft':
        case 'KeyA':
          moveState.current.left = false
          break
        case 'ArrowRight':
        case 'KeyD':
          moveState.current.right = false
          break
      }
    }

    // Touch handlers
    const onTouchStart = (e: TouchEvent) => {
        touchState.current.active = true
        touchState.current.startX = e.touches[0].clientX
        touchState.current.startY = e.touches[0].clientY
        touchState.current.currX = e.touches[0].clientX
        touchState.current.currY = e.touches[0].clientY
    }

    const onTouchMove = (e: TouchEvent) => {
        if (!touchState.current.active) return
        touchState.current.currX = e.touches[0].clientX
        touchState.current.currY = e.touches[0].clientY

        // Prevent scrolling while exploring
        e.preventDefault()
    }

    const onTouchEnd = () => {
        touchState.current.active = false
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('touchstart', onTouchStart, { passive: false })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  useFrame((_state, delta) => {
    const speed = 10.0 // Units per second
    const turnSpeed = 1.5

    // Calculate input vector
    let inputX = 0
    let inputZ = 0

    // Keyboard
    if (moveState.current.forward) inputZ -= 1
    if (moveState.current.backward) inputZ += 1
    if (moveState.current.left) inputX -= 1
    if (moveState.current.right) inputX += 1

    // Touch (Virtual Joystick logic)
    if (touchState.current.active) {
        const dx = touchState.current.currX - touchState.current.startX
        const dy = touchState.current.currY - touchState.current.startY

        // Normalize sensitivity (pixels to full speed)
        const maxDist = 150
        const nx = Math.max(-1, Math.min(1, dx / maxDist))
        const ny = Math.max(-1, Math.min(1, dy / maxDist))

        // dy < 0 means drag UP (forward) -> ny < 0 -> inputZ decreases (fwd)
        // dx < 0 means drag LEFT (turn left) -> nx < 0 -> inputX decreases (left)

        if (Math.abs(ny) > 0.1) inputZ += ny
        if (Math.abs(nx) > 0.1) inputX += nx
    }

    // Physics/Movement Logic

    // Current camera rotation
    const euler = new THREE.Euler(0, 0, 0, 'YXZ')
    euler.setFromQuaternion(camera.quaternion)

    // Update Y rotation (Yaw)
    // Left input (negative) should increase Y (turn left)
    euler.y -= inputX * turnSpeed * delta

    camera.quaternion.setFromEuler(euler)

    // Move Forward/Back relative to camera direction
    direction.current.set(0, 0, -1).applyQuaternion(camera.quaternion)
    direction.current.y = 0 // Keep movement on ground plane
    direction.current.normalize()

    if (Math.abs(inputZ) > 0.01) {
        // Clamp inputZ to [-1, 1] for keyboard, but touch is already clamped
        const throttle = Math.max(-1, Math.min(1, inputZ))

        velocity.current.x = direction.current.x * -throttle * speed
        // Note: inputZ < 0 is forward. direction is forward.
        // If inputZ is -1. -(-1) = 1. speed * 1 * direction = forward. Correct.

        velocity.current.z = direction.current.z * -throttle * speed
    } else {
        velocity.current.x = 0
        velocity.current.z = 0
    }

    // Apply Velocity
    camera.position.x += velocity.current.x * delta
    camera.position.z += velocity.current.z * delta

    // Smooth height transition to "Exploration Height"
    const targetHeight = 2.0
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetHeight, delta * 2)

  })

  return null
}
