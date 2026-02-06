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

  // Mouse Drag state
  const mouseState = useRef({
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

    // Mouse handlers
    const onMouseDown = (e: MouseEvent) => {
      // Only trigger on left click
      if (e.button !== 0) return

      mouseState.current.active = true
      mouseState.current.startX = e.clientX
      mouseState.current.startY = e.clientY
      mouseState.current.currX = e.clientX
      mouseState.current.currY = e.clientY
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!mouseState.current.active) return
      mouseState.current.currX = e.clientX
      mouseState.current.currY = e.clientY
    }

    const onMouseUp = () => {
      mouseState.current.active = false
    }

    const onMouseLeave = () => {
        mouseState.current.active = false
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('touchstart', onTouchStart, { passive: false })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd)

    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('mouseleave', onMouseLeave)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)

      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('mouseleave', onMouseLeave)
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

        if (Math.abs(ny) > 0.1) inputZ += ny
        if (Math.abs(nx) > 0.1) inputX += nx
    }

    // Mouse Drag (Virtual Joystick logic)
    if (mouseState.current.active) {
        const dx = mouseState.current.currX - mouseState.current.startX
        const dy = mouseState.current.currY - mouseState.current.startY

        // Normalize sensitivity (pixels to full speed)
        // Similar to touch, but maybe slightly different tuning if needed
        const maxDist = 200
        const nx = Math.max(-1, Math.min(1, dx / maxDist))
        const ny = Math.max(-1, Math.min(1, dy / maxDist))

        if (Math.abs(ny) > 0.05) inputZ += ny
        if (Math.abs(nx) > 0.05) inputX += nx
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
        // Clamp inputZ to [-1, 1] for keyboard, but touch/mouse is already clamped
        const throttle = Math.max(-1, Math.min(1, inputZ))

        velocity.current.x = direction.current.x * -throttle * speed
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
