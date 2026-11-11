import { Environment as EnvironmentDrei, SoftShadows } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect, useRef, useMemo } from 'react'
import * as THREE from 'three'
import gsap from 'gsap'
import { Zone } from '../types'
import { GroundCover } from './GroundCover'
import { bakeGroundTextures } from '../utils/groundTextures'
import { useQuality, type QualityTier } from './QualityContext'
import { DIAG } from '../diag'
import { partitionGroundGeometry } from '../utils/groundChunks'

function GroundBatches({ geometry, material }: { geometry: THREE.BufferGeometry; material: THREE.Material }) {
  const chunks = useMemo(() => partitionGroundGeometry(geometry), [geometry])
  useEffect(() => () => chunks.forEach(chunk => chunk.dispose()), [chunks])
  return <group>{chunks.map((chunk, i) => <mesh key={i} geometry={chunk} material={material} receiveShadow ref={mesh => { if (mesh) mesh.layers.enable(1) }} />)}</group>
}

// Ground-cover density per quality tier. A flat 100k instanced blades on every
// device was the heaviest single draw in the scene and the prime suspect behind
// mobile crashes (provisional diagnosis).
const COVER_COUNT_BY_TIER: Record<QualityTier, number> = {
  ULTRA_LOW: 8000,
  HIGH: 60000,
  MEDIUM: 30000,
  LOW: 12000,
}

// Same field-shrink as bamboo: keep surviving blades inside the fog window.
const COVER_SPREAD_BY_TIER: Record<QualityTier, number> = {
  ULTRA_LOW: 350,
  LOW: 600,
  MEDIUM: 2000,
  HIGH: 2000,
}

// Shadow budget per tier. A fixed 4096 shadow map with PCSS soft shadows and
// every instanced mesh casting was enough to kill weak GPUs on first render.
const SHADOW_MAP_BY_TIER: Record<QualityTier, number> = {
  ULTRA_LOW: 512,
  HIGH: 4096,
  MEDIUM: 2048,
  LOW: 1024,
}

interface EnvironmentProps {
  currentZone: Zone
}

export function Environment({ currentZone }: EnvironmentProps) {
  const { scene } = useThree()
  const { tier } = useQuality()
  const ambientLightRef = useRef<THREE.AmbientLight>(null)
  const directionalLightRef = useRef<THREE.DirectionalLight>(null)

  // Custom Ground Material with Procedural Texturing
  const groundMaterial = useMemo(() => {
    // The fbm noise is static - bake it once into textures instead of
    // evaluating ~20 simplex samples per fragment every frame (the change
    // that took the UHD 620 test bed from ~1 fps to interactive).
    const { map, bumpMap } = bakeGroundTextures(512)
    return new THREE.MeshStandardMaterial({
        map,
        bumpMap,
        bumpScale: 0.12,
        roughness: 0.8,   // Slightly smoother for damp look
        metalness: 0.1,
    })
  }, [])

  const groundGeometry = useMemo(() => new THREE.PlaneGeometry(2000, 2000, 256, 256), [])

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
      {!DIAG.noShadows && (tier === 'MEDIUM' || tier === 'HIGH') && (
        <SoftShadows size={tier === 'HIGH' ? 25 : 20} focus={0.8} samples={tier === 'HIGH' ? 16 : 8} />
      )}
      <ambientLight ref={ambientLightRef} intensity={0.4} color="#ffffff" />

      <directionalLight
        ref={directionalLightRef}
        castShadow={!DIAG.noShadows}
        position={[15, 25, 10]}
        intensity={1.2}
        shadow-mapSize={[SHADOW_MAP_BY_TIER[tier], SHADOW_MAP_BY_TIER[tier]]}
        shadow-bias={-0.0001}
        shadow-normalBias={0.04}
        color="#fff0d0"
      >
        <orthographicCamera attach="shadow-camera" args={[-65, 65, 65, -65]} />
      </directionalLight>

      {!DIAG.noEnv && <EnvironmentDrei preset="forest" background={false} />}

      {/* Ground - Custom Shader Material */}
      {!DIAG.noGroundSpatial && !DIAG.flatGround ? <group rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}><GroundBatches geometry={groundGeometry} material={groundMaterial} /></group> : <mesh
        ref={(mesh) => { if (mesh) mesh.layers.enable(1); }}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        position={[0, -0.01, 0]}
      >
        <planeGeometry args={DIAG.flatGround ? [2000, 2000, 1, 1] : [2000, 2000, 256, 256]} />
        <primitive object={groundMaterial} attach="material" />
      </mesh>}

      {/* Ground Cover - Grass */}
      <GroundCover count={DIAG.noCover ? 0 : COVER_COUNT_BY_TIER[tier]} spread={COVER_SPREAD_BY_TIER[tier]} castShadow={!DIAG.noShadows && tier === 'HIGH'} />
    </>
  )
}
