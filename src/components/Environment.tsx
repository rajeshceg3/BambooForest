import { useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import gsap from 'gsap'
import { Zone } from '../types'

interface EnvironmentProps {
  currentZone: Zone
}

export function Environment({ currentZone }: EnvironmentProps) {
  const { scene } = useThree()
  const ambientLightRef = useRef<THREE.AmbientLight>(null)
  const directionalLightRef = useRef<THREE.DirectionalLight>(null)

  useEffect(() => {
    if (!scene.fog) {
        scene.fog = new THREE.FogExp2('#dcdcdc', 0.02)
        scene.background = new THREE.Color('#dcdcdc')
    }
  }, [scene])

  useEffect(() => {
    const configs = {
      GROVE: {
        fogColor: '#dcdcdc',
        fogDensity: 0.02,
        ambientIntensity: 0.4,
        dirIntensity: 1.2,
        dirColor: '#fff0d0',
      },
      CLEARING: {
        fogColor: '#e0e0d0',
        fogDensity: 0.015,
        ambientIntensity: 0.6,
        dirIntensity: 1.5,
        dirColor: '#ffffef',
      },
      STREAM: {
        fogColor: '#c0d0d0',
        fogDensity: 0.025,
        ambientIntensity: 0.5,
        dirIntensity: 1.0,
        dirColor: '#e0f0ff',
      },
      DEEP_FOREST: {
        fogColor: '#a0a8a0',
        fogDensity: 0.04,
        ambientIntensity: 0.2,
        dirIntensity: 0.6,
        dirColor: '#d0ffd0',
      },
    }

    const config = configs[currentZone]
    const fogColor = new THREE.Color(config.fogColor)

    if (scene.fog && scene.background) {
        // Fade fog and background
        gsap.to(scene.fog, {
          density: config.fogDensity,
          duration: 2,
        })
        gsap.to(scene.background, {
          r: fogColor.r,
          g: fogColor.g,
          b: fogColor.b,
          duration: 2,
        })
        gsap.to((scene.fog as THREE.FogExp2).color, {
          r: fogColor.r,
          g: fogColor.g,
          b: fogColor.b,
          duration: 2,
        })
    }

    if (ambientLightRef.current) {
      gsap.to(ambientLightRef.current, {
        intensity: config.ambientIntensity,
        duration: 2,
      })
    }

    if (directionalLightRef.current) {
      const dirColor = new THREE.Color(config.dirColor)
      gsap.to(directionalLightRef.current, {
        intensity: config.dirIntensity,
        duration: 2,
      })
      gsap.to(directionalLightRef.current.color, {
        r: dirColor.r,
        g: dirColor.g,
        b: dirColor.b,
        duration: 2,
      })
    }
  }, [currentZone, scene])

  return (
    <>
      <ambientLight ref={ambientLightRef} intensity={0.4} color="#ffffff" />

      <directionalLight
        ref={directionalLightRef}
        castShadow
        position={[15, 25, 10]}
        intensity={1.2}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0001}
        color="#fff0d0"
      >
        <orthographicCamera attach="shadow-camera" args={[-65, 65, 65, -65]} />
      </directionalLight>

      {/* Ground - Mossy Green */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.01, 0]}>
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial color="#3a4d2f" roughness={1} metalness={0} />
      </mesh>
    </>
  )
}
