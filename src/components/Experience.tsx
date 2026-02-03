import { useEffect, useRef } from 'react'
import { OrbitControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { Environment } from './Environment'
import { BambooForest } from './BambooForest'
import { Fireflies } from './Fireflies'
import { Birds } from './Birds'
import { Stream } from './Stream'
import { StoneLantern } from './StoneLantern'
import { Deer } from './Deer'
import { Crane } from './Crane'
import { Butterflies } from './Butterflies'
import { Zone } from '../types'

interface ExperienceProps {
  currentZone: Zone
}

export function Experience({ currentZone }: ExperienceProps) {
  const { camera } = useThree()
  const controlsRef = useRef<any>(null)

  useEffect(() => {
    const targetConfig = {
      GROVE: { position: { x: 0, y: 5, z: 25 }, target: { x: 0, y: 2, z: 0 } },
      CLEARING: { position: { x: 25, y: 3, z: 25 }, target: { x: 10, y: 1, z: 10 } },
      STREAM: { position: { x: -20, y: 4, z: 20 }, target: { x: -10, y: 0.5, z: 0 } },
      DEEP_FOREST: { position: { x: 5, y: 2, z: 5 }, target: { x: 0, y: 3, z: -10 } },
    }

    const config = targetConfig[currentZone]

    gsap.to(camera.position, {
      x: config.position.x,
      y: config.position.y,
      z: config.position.z,
      duration: 3,
      ease: 'power2.inOut',
    })

    if (controlsRef.current) {
      gsap.to(controlsRef.current.target, {
        x: config.target.x,
        y: config.target.y,
        z: config.target.z,
        duration: 3,
        ease: 'power2.inOut',
      })
    }
  }, [currentZone, camera])

  return (
    <>
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        autoRotate
        autoRotateSpeed={0.2}
        enableZoom={true}
        maxDistance={50}
        minDistance={2}
        maxPolarAngle={Math.PI / 2 - 0.05}
      />

      <Environment currentZone={currentZone} />
      <BambooForest currentZone={currentZone} />
      <Fireflies count={currentZone === 'DEEP_FOREST' ? 250 : 150} />
      <Birds count={15} />
      <Stream />
      <StoneLantern position={[10, 0, 10]} rotation={[0, Math.PI / 4, 0]} />
      <Deer position={[-5, 0, -5]} rotation={[0, Math.PI / 3, 0]} />
      <Crane position={[-12, 0, 5]} rotation={[0, -Math.PI / 4, 0]} />
      <Butterflies count={8} />
    </>
  )
}
