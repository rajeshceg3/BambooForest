import { useFrame, useThree } from '@react-three/fiber'
import { useRef, useEffect } from 'react'
import * as THREE from 'three'

interface NavigationProps {
  enabled?: boolean
  walkSpeed?: number
  runSpeed?: number
  jumpForce?: number
  lookSensitivity?: number
}

export function Navigation({
  enabled = true,
  walkSpeed = 10.0,
  runSpeed = 18.0,
  jumpForce = 12.0,
  lookSensitivity = 2.0
}: NavigationProps) {
  const { camera, gl } = useThree()

  // --- State ---
  const moveState = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
    jump: false,
  })

  // Physics state
  const velocity = useRef(new THREE.Vector3())
  const onGround = useRef(true) // Start on ground assumption
  const playerHeight = 2.0
  const gravity = 30.0

  // Camera Rotation State (separate from actual camera to allow damping)
  const rotation = useRef({
    phi: 0, // Vertical (Pitch)
    theta: 0, // Horizontal (Yaw)
  })

  // Input Smoothing
  const targetRotation = useRef({
    phi: 0,
    theta: 0,
  })

  // Touch State
  // Left side screen (0-30%) for move joystick
  // Right side screen (30-100%) for look drag
  const touchState = useRef<{
    leftId: number | null
    rightId: number | null
    leftStart: { x: number; y: number }
    leftCurr: { x: number; y: number }
    rightStart: { x: number; y: number }
    rightCurr: { x: number; y: number }
  }>({
    leftId: null,
    rightId: null,
    leftStart: { x: 0, y: 0 },
    leftCurr: { x: 0, y: 0 },
    rightStart: { x: 0, y: 0 },
    rightCurr: { x: 0, y: 0 },
  })

  // Mouse State for fallback drag
  const mouseState = useRef({
      dragging: false,
      lastX: 0,
      lastY: 0
  })

  // --- Input Handlers ---

  useEffect(() => {
    // Only lock pointer if enabled
    const onClick = () => {
      if (!enabled) return
      // Request pointer lock on click if not already locked
      if (document.pointerLockElement !== gl.domElement) {
        gl.domElement.requestPointerLock()
      }
    }

    // Mouse Move (Look)
    const onMouseMove = (e: MouseEvent) => {
      if (!enabled) return

      if (document.pointerLockElement === gl.domElement) {
        // Locked mode
        const movementX = e.movementX || 0
        const movementY = e.movementY || 0

        targetRotation.current.theta -= movementX * 0.002 * lookSensitivity
        targetRotation.current.phi -= movementY * 0.002 * lookSensitivity

        // Clamp Pitch
        targetRotation.current.phi = Math.max(
          -Math.PI / 2 + 0.1,
          Math.min(Math.PI / 2 - 0.1, targetRotation.current.phi)
        )
      } else if (mouseState.current.dragging) {
          // Drag fallback (if not locked but dragging)
          const movementX = e.clientX - mouseState.current.lastX
          const movementY = e.clientY - mouseState.current.lastY

          mouseState.current.lastX = e.clientX
          mouseState.current.lastY = e.clientY

          targetRotation.current.theta -= movementX * 0.002 * lookSensitivity
          targetRotation.current.phi -= movementY * 0.002 * lookSensitivity

          targetRotation.current.phi = Math.max(
            -Math.PI / 2 + 0.1,
            Math.min(Math.PI / 2 - 0.1, targetRotation.current.phi)
          )
      }
    }

    const onMouseDown = (e: MouseEvent) => {
        if (!enabled) return
        mouseState.current.dragging = true
        mouseState.current.lastX = e.clientX
        mouseState.current.lastY = e.clientY
    }

    const onMouseUp = () => {
        mouseState.current.dragging = false
    }

    // Keyboard
    const onKeyDown = (e: KeyboardEvent) => {
      if (!enabled) return
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
        case 'ShiftLeft':
        case 'ShiftRight':
          moveState.current.sprint = true
          break
        case 'Space':
          if (onGround.current) {
             velocity.current.y = jumpForce
             onGround.current = false
          }
          break
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (!enabled) return
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
        case 'ShiftLeft':
        case 'ShiftRight':
          moveState.current.sprint = false
          break
      }
    }

    // Touch
    const onTouchStart = (e: TouchEvent) => {
      if (!enabled) return
      // Don't prevent default everywhere to allow UI interaction,
      // but maybe needed for canvas.
      // e.preventDefault() // Let React/Browser handle default unless on canvas?
      // Actually usually preventDefault on canvas touch to stop scroll.

      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i]
        const x = t.clientX
        const y = t.clientY
        const width = window.innerWidth

        // Logic: Left 30% = Move Joystick, Right 70% = Look
        if (x < width * 0.3) {
           if (touchState.current.leftId === null) {
              touchState.current.leftId = t.identifier
              touchState.current.leftStart = { x, y }
              touchState.current.leftCurr = { x, y }
           }
        } else {
           if (touchState.current.rightId === null) {
              touchState.current.rightId = t.identifier
              touchState.current.rightStart = { x, y }
              touchState.current.rightCurr = { x, y }
           }
        }
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!enabled) return
      // Prevent scrolling
      if (e.cancelable) e.preventDefault()

      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i]

        if (t.identifier === touchState.current.leftId) {
             touchState.current.leftCurr = { x: t.clientX, y: t.clientY }
        }
        if (t.identifier === touchState.current.rightId) {
             // Calculate delta for look immediately
             const dx = t.clientX - touchState.current.rightCurr.x
             const dy = t.clientY - touchState.current.rightCurr.y

             touchState.current.rightCurr = { x: t.clientX, y: t.clientY }

             // Apply to look target
             targetRotation.current.theta -= dx * 0.005 * lookSensitivity
             targetRotation.current.phi -= dy * 0.005 * lookSensitivity

             // Clamp Pitch
             targetRotation.current.phi = Math.max(
               -Math.PI / 2 + 0.1,
               Math.min(Math.PI / 2 - 0.1, targetRotation.current.phi)
             )
        }
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (!enabled) return
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i]
        if (t.identifier === touchState.current.leftId) {
            touchState.current.leftId = null
            // Reset joystick visual/logic?
        }
        if (t.identifier === touchState.current.rightId) {
            touchState.current.rightId = null
        }
      }
    }

    // Attach Listeners
    // For pointer lock, we attach to gl.domElement usually, but click is better on window or a UI overlay.
    // Here we attach generic listeners to window to catch everything.
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    // For mouse/touch, attach to canvas to avoid UI interference?
    // Actually attaching to window ensures we don't lose drag if mouse goes off screen (though pointer lock fixes that).
    gl.domElement.addEventListener('click', onClick)
    gl.domElement.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)

    // Touch - attach to canvas to prevent scroll
    gl.domElement.addEventListener('touchstart', onTouchStart, { passive: false })
    gl.domElement.addEventListener('touchmove', onTouchMove, { passive: false })
    gl.domElement.addEventListener('touchend', onTouchEnd)
    gl.domElement.addEventListener('touchcancel', onTouchEnd)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      gl.domElement.removeEventListener('click', onClick)
      gl.domElement.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)

      gl.domElement.removeEventListener('touchstart', onTouchStart)
      gl.domElement.removeEventListener('touchmove', onTouchMove)
      gl.domElement.removeEventListener('touchend', onTouchEnd)
      gl.domElement.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [enabled, gl.domElement, lookSensitivity, jumpForce])

  // --- Physics Loop ---

  useFrame((_state, delta) => {
    if (!enabled) return

    // 1. Rotation Smoothing
    // Damp towards target
    // Smooth factor (higher = faster)
    const damp = 15.0
    rotation.current.theta += (targetRotation.current.theta - rotation.current.theta) * damp * delta
    rotation.current.phi += (targetRotation.current.phi - rotation.current.phi) * damp * delta

    // Apply rotation to camera
    // Reset quaternion
    const q = new THREE.Quaternion()
    // Order YXZ (Yaw first, then Pitch)
    q.setFromEuler(new THREE.Euler(rotation.current.phi, rotation.current.theta, 0, 'YXZ'))
    camera.quaternion.copy(q)


    // 2. Movement Calculation
    const speed = moveState.current.sprint ? runSpeed : walkSpeed

    // Get direction from inputs
    const forward = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, rotation.current.theta, 0, 'YXZ'))
    const right = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(0, rotation.current.theta, 0, 'YXZ'))

    const inputVector = new THREE.Vector3()

    // Keyboard Input
    if (moveState.current.forward) inputVector.add(forward)
    if (moveState.current.backward) inputVector.sub(forward)
    if (moveState.current.left) inputVector.sub(right)
    if (moveState.current.right) inputVector.add(right)

    // Touch Joystick Input
    if (touchState.current.leftId !== null) {
        const dx = touchState.current.leftCurr.x - touchState.current.leftStart.x
        const dy = touchState.current.leftCurr.y - touchState.current.leftStart.y
        const maxDist = 50.0 // Joystick radius

        // Normalize -1 to 1
        const nx = Math.max(-1, Math.min(1, dx / maxDist))
        const ny = Math.max(-1, Math.min(1, dy / maxDist))

        // Forward is -z (up on screen is negative y delta, which maps to forward)
        // Right is +x

        // Add proportional movement
        const touchForward = forward.clone().multiplyScalar(-ny) // Up(-y) -> Forward
        const touchRight = right.clone().multiplyScalar(nx)

        inputVector.add(touchForward)
        inputVector.add(touchRight)
    }

    // Normalize if length > 1 (so diagonal isn't faster)
    if (inputVector.length() > 1) inputVector.normalize()

    // Acceleration / Deceleration
    // If input, accelerate towards target velocity. If no input, decelerate (friction).
    const friction = 10.0 // Deceleration factor

    const targetVelX = inputVector.x * speed
    const targetVelZ = inputVector.z * speed

    if (inputVector.lengthSq() > 0.001) {
       // Accelerate
       velocity.current.x = THREE.MathUtils.lerp(velocity.current.x, targetVelX, delta * 8)
       velocity.current.z = THREE.MathUtils.lerp(velocity.current.z, targetVelZ, delta * 8)
    } else {
       // Decelerate
       velocity.current.x = THREE.MathUtils.lerp(velocity.current.x, 0, delta * friction)
       velocity.current.z = THREE.MathUtils.lerp(velocity.current.z, 0, delta * friction)
    }

    // Gravity
    if (!onGround.current) {
        velocity.current.y -= gravity * delta
    }

    // 3. Apply Velocity
    camera.position.x += velocity.current.x * delta
    camera.position.z += velocity.current.z * delta
    camera.position.y += velocity.current.y * delta

    // 4. Ground Collision
    if (camera.position.y < playerHeight) {
        camera.position.y = playerHeight
        velocity.current.y = 0
        onGround.current = true
    } else if (camera.position.y > playerHeight + 0.1) {
        // Simple "in air" check
        onGround.current = false
    }
  })

  // Initialize rotation from current camera rotation on mount
  useEffect(() => {
     if (camera) {
         const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ')
         rotation.current.phi = euler.x
         rotation.current.theta = euler.y
         targetRotation.current.phi = euler.x
         targetRotation.current.theta = euler.y
     }
  }, [camera])

  return null
}
