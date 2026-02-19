import { Environment as EnvironmentDrei, SoftShadows } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect, useRef, useMemo } from 'react'
import * as THREE from 'three'
import gsap from 'gsap'
import { Zone } from '../types'
import { GroundCover } from './GroundCover'

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
        color: '#2e3a24', // Darker base
        roughness: 0.8,   // Slightly smoother for damp look
        metalness: 0.1,
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

          // FBM for more detail
          float fbm(vec2 x) {
              float v = 0.0;
              float a = 0.5;
              vec2 shift = vec2(100.0);
              mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));
              for (int i = 0; i < 5; ++i) {
                  v += a * snoise(x);
                  x = rot * x * 2.0 + shift;
                  a *= 0.5;
              }
              return v;
          }

          ${shader.fragmentShader}
        `

        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <color_fragment>',
          `
          #include <color_fragment>

          float noise = fbm(vWorldPosition.xz * 0.1);
          float noiseDetail = fbm(vWorldPosition.xz * 0.5);

          vec3 mossColor = vec3(0.12, 0.20, 0.08); // Darker moss
          vec3 dirtColor = vec3(0.20, 0.16, 0.12); // Darker dirt
          vec3 dryColor = vec3(0.28, 0.24, 0.16); // Darker dry patches

          float mixFactor = smoothstep(-0.2, 0.6, noise);
          float dryFactor = smoothstep(0.4, 0.8, noiseDetail);

          vec3 baseColor = mix(mossColor, dirtColor, mixFactor);
          baseColor = mix(baseColor, dryColor, dryFactor * 0.5);

          diffuseColor.rgb = baseColor;
          `
        )

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <normal_fragment_maps>',
            `
            #include <normal_fragment_maps>

            // Perturb normal based on noise
            float nHeight = fbm(vWorldPosition.xz * 1.5);
            float nHeightX = fbm(vWorldPosition.xz * 1.5 + vec2(0.01, 0.0));
            float nHeightZ = fbm(vWorldPosition.xz * 1.5 + vec2(0.0, 0.01));

            // Calculate gradient
            vec3 bumpNormal = normalize(vec3(nHeight - nHeightX, 0.1, nHeight - nHeightZ));
            normal = normalize(normal + bumpNormal * 0.8);
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
      <SoftShadows size={25} focus={0.8} samples={16} />
      <ambientLight ref={ambientLightRef} intensity={0.4} color="#ffffff" />

      <directionalLight
        ref={directionalLightRef}
        castShadow
        position={[15, 25, 10]}
        intensity={1.2}
        shadow-mapSize={[4096, 4096]}
        shadow-bias={-0.0001}
        shadow-normalBias={0.04}
        color="#fff0d0"
      >
        <orthographicCamera attach="shadow-camera" args={[-65, 65, 65, -65]} />
      </directionalLight>

      <EnvironmentDrei preset="forest" background={false} />

      {/* Ground - Custom Shader Material */}
      <mesh
        ref={(mesh) => { if (mesh) mesh.layers.enable(1); }}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        position={[0, -0.01, 0]}
      >
        <planeGeometry args={[2000, 2000, 256, 256]} />
        <primitive object={groundMaterial} attach="material" />
      </mesh>

      {/* Ground Cover - Grass */}
      <GroundCover />
    </>
  )
}
