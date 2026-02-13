import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import { useTour } from './TourContext'
import { Zone } from '../types'

interface TourControllerProps {
  onZoneChange: (zone: Zone) => void
}

export function TourController({ onZoneChange }: TourControllerProps) {
  const { camera } = useThree()
  const { isActive, currentStep, currentStepIndex, setTransitioning } = useTour()

  // We use a ref to track where the camera should be looking
  const lookAtTarget = useRef(new THREE.Vector3())
  const isFirstRun = useRef(true)

  // Sync isFirstRun
  useEffect(() => {
    if (!isActive) {
        isFirstRun.current = true
    }
  }, [isActive])

  useEffect(() => {
    if (!isActive) return

    setTransitioning(true)
    onZoneChange(currentStep.zone)

    // If starting the tour, snap the target to current view so we animate FROM there
    if (isFirstRun.current) {
        const direction = new THREE.Vector3(0, 0, -1)
        direction.applyQuaternion(camera.quaternion)
        // Set target 10 units away in front of camera
        lookAtTarget.current.copy(camera.position).add(direction.multiplyScalar(10))
        isFirstRun.current = false
    }

    const duration = currentStep.duration || 3.5

    // 1. Animate Camera Position
    gsap.to(camera.position, {
      x: currentStep.position[0],
      y: currentStep.position[1],
      z: currentStep.position[2],
      duration: duration,
      ease: "power2.inOut",
      onComplete: () => {
        setTransitioning(false)
      }
    })

    // 2. Animate LookAt Target
    gsap.to(lookAtTarget.current, {
      x: currentStep.target[0],
      y: currentStep.target[1],
      z: currentStep.target[2],
      duration: duration,
      ease: "power2.inOut"
    })

  }, [currentStepIndex, isActive, camera, currentStep, onZoneChange, setTransitioning])

  useFrame((state) => {
    if (!isActive) return

    // Apply Drift (Breathing effect)
    const time = state.clock.getElapsedTime()

    const driftX = Math.sin(time * 0.5) * 0.2
    const driftY = Math.cos(time * 0.3) * 0.2

    // Clone target to avoid modifying the GSAP target ref permanently
    const currentTarget = lookAtTarget.current.clone()
    currentTarget.x += driftX
    currentTarget.y += driftY

    camera.lookAt(currentTarget)
  })

  return null
}
