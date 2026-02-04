import { Environment as EnvironmentDrei } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect, useRef, useMemo } from 'react'
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

  // Custom Ground Material with Procedural Texturing
  const groundMaterial = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
        color: '#3a4d2f',
        roughness: 1,
        metalness: 0,
    })

    mat.onBeforeCompile = (shader) => {
        shader.vertexShader = `
          varying vec3 vWorldPosition;
          ${shader.vertexShader}
        `
        shader.vertexShader = shader.vertexShader.replace(
          '#include <begin_vertex>',
          `
          #include <begin_vertex>
          vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          `
        )

        shader.fragmentShader = `
          varying vec3 vWorldPosition;

          // Simplex 2D noise
          vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
          float snoise(vec2 v){
            const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                     -0.577350269189626, 0.024390243902439);
            vec2 i  = floor(v + dot(v, C.yy) );
            vec2 x0 = v -   i + dot(i, C.xx);
            vec2 i1;
            i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec4 x12 = x0.xyxy + C.xxzz;
            x12.xy -= i1;
            i = mod(i, 289.0);
            vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
            + i.x + vec3(0.0, i1.x, 1.0 ));
            vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
            m = m*m ;
            m = m*m ;
            vec3 x = 2.0 * fract(p * C.www) - 1.0;
            vec3 h = abs(x) - 0.5;
            vec3 ox = floor(x + 0.5);
            vec3 a0 = x - ox;
            m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
            vec3 g;
            g.x  = a0.x  * x0.x  + h.x  * x0.y;
            g.yz = a0.yz * x12.xz + h.yz * x12.yw;
            return 130.0 * dot(m, g);
          }

          ${shader.fragmentShader}
        `

        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <color_fragment>',
          `
          #include <color_fragment>

          float noise = snoise(vWorldPosition.xz * 0.1);
          float noise2 = snoise(vWorldPosition.xz * 0.5 + vec2(100.0));

          vec3 mossColor = vec3(0.22, 0.3, 0.18); // #3a4d2f
          vec3 dirtColor = vec3(0.29, 0.23, 0.16); // #4b3c2a

          float mixFactor = smoothstep(-0.5, 0.5, noise + noise2 * 0.5);

          diffuseColor.rgb = mix(mossColor, dirtColor, mixFactor);

          // Add subtle texture noise
          diffuseColor.rgb *= 0.9 + 0.2 * noise2;
          `
        )

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <normal_fragment_maps>',
            `
            #include <normal_fragment_maps>

            // Perturb normal based on noise
            float nHeight = snoise(vWorldPosition.xz * 2.0);
            float nHeightX = snoise(vWorldPosition.xz * 2.0 + vec2(0.05, 0.0));
            float nHeightZ = snoise(vWorldPosition.xz * 2.0 + vec2(0.0, 0.05));

            vec3 bumpNormal = normalize(vec3(nHeight - nHeightX, 1.0, nHeight - nHeightZ));
            normal = normalize(normal + (bumpNormal - vec3(0.0, 1.0, 0.0)) * 0.3);
            `
        )
    }
    return mat
  }, [])

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

      <EnvironmentDrei preset="forest" background={false} />

      {/* Ground - Custom Shader Material */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.01, 0]}>
        <planeGeometry args={[300, 300, 32, 32]} />
        <primitive object={groundMaterial} attach="material" />
      </mesh>
    </>
  )
}
