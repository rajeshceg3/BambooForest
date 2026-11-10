import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useTour } from './TourContext'
import { Zone } from '../types'

interface TourControllerProps { onZoneChange: (zone: Zone) => void }

export function TourController({ onZoneChange }: TourControllerProps) {
  const { camera, gl } = useThree()
  const { isActive, currentStep, currentStepIndex, setTransitioning } = useTour()
  const reducedMotion = useRef(window.matchMedia('(prefers-reduced-motion: reduce)'))
  const target = useRef(new THREE.Vector3())
  const displayedTarget = useRef(new THREE.Vector3())
  const transition = useRef<{
    started: number; duration: number; from: THREE.Vector3; to: THREE.Vector3;
    fromTarget: THREE.Vector3; toTarget: THREE.Vector3; complete: boolean
  } | null>(null)

  useEffect(() => {
    if (!isActive) { transition.current = null; return }
    const fromTarget = transition.current
      ? target.current.clone()
      : camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(10).add(camera.position)
    transition.current = {
      started: performance.now(), duration: reducedMotion.current.matches ? 1 : (currentStep.duration || 3.5) * 1000,
      from: camera.position.clone(), to: new THREE.Vector3(...currentStep.position),
      fromTarget, toTarget: new THREE.Vector3(...currentStep.target), complete: false,
    }
    setTransitioning(true)
    onZoneChange(currentStep.zone)
  }, [isActive, currentStepIndex, currentStep, camera, onZoneChange, setTransitioning])

  useFrame((state) => {
    const motion = transition.current
    if (isActive && motion) {
      const p = Math.min(1, (performance.now() - motion.started) / motion.duration)
      const eased = p * p * (3 - 2 * p)
      camera.position.lerpVectors(motion.from, motion.to, eased)
      target.current.lerpVectors(motion.fromTarget, motion.toTarget, eased)
      if (p === 1 && !motion.complete) { motion.complete = true; setTransitioning(false) }
      displayedTarget.current.copy(target.current)
      if (!reducedMotion.current.matches) {
        displayedTarget.current.x += Math.sin(state.clock.elapsedTime * 0.5) * 0.2
        displayedTarget.current.y += Math.cos(state.clock.elapsedTime * 0.3) * 0.2
      }
      camera.lookAt(displayedTarget.current)
    }
    gl.domElement.dataset.cameraPosition = camera.position.toArray().map(v => v.toFixed(2)).join(',')
    gl.domElement.dataset.tourActive = String(isActive)
    gl.domElement.dataset.tourStep = String(currentStepIndex)
    gl.domElement.dataset.cameraLens = String((camera as THREE.PerspectiveCamera).fov)
    gl.domElement.dataset.cameraRotation = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ').toArray().slice(0, 3).join(',')
  })
  return null
}
