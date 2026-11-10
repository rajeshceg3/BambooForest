import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useTour } from './TourContext'
import { chooseDeerView, type StalkObstacle } from '../utils/deerView'
import { Zone } from '../types'

interface TourControllerProps { onZoneChange: (zone: Zone) => void }

export function TourController({ onZoneChange }: TourControllerProps) {
  const { camera, gl, scene } = useThree()
  const { isActive, currentStep, currentStepIndex, setTransitioning } = useTour()
  const reducedMotion = useRef(window.matchMedia('(prefers-reduced-motion: reduce)'))
  const target = useRef(new THREE.Vector3())
  const displayedTarget = useRef(new THREE.Vector3())
  const animalView = useRef({x: Infinity, z: Infinity, count: -1, dx: -4.6, dz: -3, targetX: -4.6, targetZ: -3})
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

  useFrame((state, delta) => {
    const motion = transition.current
    if (isActive && motion) {
      // The animal roams before the visitor reaches this step. Frame its real
      // position rather than the spawn point, which can put the lens in its face.
      if (currentStepIndex === 3) {
        const deer = scene.getObjectByName('roe-deer')
        if (deer) {
          const trunks = scene.getObjectByName('bamboo-stalks') as THREE.InstancedMesh | undefined
          const view = animalView.current
          if (trunks && (view.count !== trunks.count || Math.hypot(deer.position.x-view.x, deer.position.z-view.z) > .45)) {
            const nearby: StalkObstacle[] = []
            const a = trunks.instanceMatrix.array
            for (let i = 0; i < trunks.count; i++) {
              const j = i * 16, x = a[j+12], z = a[j+14]
              if (Math.hypot(x-deer.position.x,z-deer.position.z) < 7) {
                nearby.push({x,z,radius:.15*Math.hypot(a[j],a[j+1],a[j+2])+.12})
              }
            }
            const choice = chooseDeerView(deer.position.x,deer.position.z,deer.rotation.y,nearby)
            if (view.count < 0) {view.dx = choice.x; view.dz = choice.z}
            Object.assign(view,{x:deer.position.x,z:deer.position.z,count:trunks.count,targetX:choice.x,targetZ:choice.z})
            gl.domElement.dataset.deerViewClearance = choice.clearance.toFixed(3)
          }
          const currentAngle = Math.atan2(view.dx, view.dz)
          const desiredAngle = Math.atan2(view.targetX, view.targetZ)
          const turn = Math.atan2(Math.sin(desiredAngle-currentAngle),Math.cos(desiredAngle-currentAngle))
          const angle = currentAngle + turn * (1-Math.exp(-2*Math.min(delta,.05)))
          view.dx = Math.sin(angle)*5.5
          view.dz = Math.cos(angle)*5.5
          motion.to.set(deer.position.x + view.dx, deer.position.y + 2, deer.position.z + view.dz)
          motion.toTarget.set(deer.position.x, deer.position.y - .45, deer.position.z)
        }
      }
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
