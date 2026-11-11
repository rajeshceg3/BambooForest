import { useRef, useMemo, useLayoutEffect, useEffect, useState } from 'react'
import { MeshTransmissionMaterial } from '@react-three/drei'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useQuality } from './QualityContext'
import { createStreamBanks, createShoreStones, streamSection } from '../utils/streamBanks'

import { rockNoiseGLSL } from '../utils/rockNoise'
import { bakeRockNoise, indexRockBake } from '../utils/rockNoiseBake'

// Simple seedable random (LCG)
function mulberry32(a: number) {
    return function() {
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
}

export function Stream() {
  const meshRef = useRef<THREE.Mesh>(null)
  const { tier } = useQuality()
  const { gl } = useThree()
  const [contextVersion, setContextVersion] = useState(0)
  useEffect(() => {
    const restored = () => setContextVersion(version => version + 1)
    gl.domElement.addEventListener('webglcontextrestored', restored)
    return () => gl.domElement.removeEventListener('webglcontextrestored', restored)
  }, [gl])
  // MeshTransmissionMaterial renders the whole scene into an FBO every frame
  // (resolution 512, 6 samples, temporal distortion) - the dominant fill-rate
  // cost on weak GPUs, enough to hold a UHD 620 under 1 fps even at ULTRA_LOW.
  // LOW and below get a plain transparent standard material instead: same
  // colour and geometry, no transmission pass.
  const cheapWater = tier === 'LOW' || tier === 'ULTRA_LOW'

  // Small tiled height map gives low-tier water a readable surface without
  // another scene render. Texture work happens once, not per fragment.
  const rippleColor = useMemo(() => {
    const size = 256
    const data = new Uint8Array(size * size * 4)
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const u = x / size * Math.PI * 2, v = y / size * Math.PI * 2
      const ripple = Math.pow(0.5 + 0.5 * Math.sin(6 * v + Math.sin(2 * u)), 6)
      const detail = Math.sin(13 * v + 3 * u) * 3
      const i = (y * size + x) * 4
      data[i] = 76 + ripple * 22 + detail
      data[i + 1] = 111 + ripple * 24 + detail
      data[i + 2] = 107 + ripple * 22 + detail
      data[i + 3] = 255
    }
    const texture = new THREE.DataTexture(data, size, size)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.magFilter = texture.minFilter = THREE.LinearFilter
    texture.repeat.set(3, 300)
    texture.needsUpdate = true
    return texture
  }, [])
  const rippleMap = useMemo(() => {
    const size = 128
    const data = new Uint8Array(size * size * 4)
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const u = x / size * Math.PI * 2, v = y / size * Math.PI * 2
      const h = 128 + 40 * Math.sin(4 * v + 0.8 * Math.sin(2 * u))
        + 16 * Math.sin(9 * v + 3 * u)
      const i = (y * size + x) * 4
      data[i] = data[i + 1] = data[i + 2] = h
      data[i + 3] = 255
    }
    const texture = new THREE.DataTexture(data, size, size)
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.magFilter = texture.minFilter = THREE.LinearFilter
    texture.repeat.set(4, 400)
    texture.needsUpdate = true
    return texture
  }, [])
  const reduceMotion = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)'), [])
  useFrame((_, delta) => {
    if (!reduceMotion.matches) {
      rippleColor.offset.y = rippleMap.offset.y
      rippleMap.offset.y = (rippleMap.offset.y + Math.min(delta, 0.05) * 0.025) % 1
    }
  })

  const rockMaterial = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
        color: '#5a5a5a',
        roughness: 0.6,
        flatShading: false,
    })

    mat.customProgramCacheKey = () => mat.userData.bakedNoise ? 'rock-baked-v1' : 'rock-live-v1'
    mat.onBeforeCompile = (shader) => {


        const baked = mat.userData.bakedNoise as THREE.Texture | undefined
        if (baked) {
          shader.uniforms.uRockNoise = { value: baked }
          shader.uniforms.uRockNoiseSize = { value: mat.userData.bakedSize }
        }
        shader.vertexShader = `
            ${baked ? 'attribute float aRockVertex; attribute float aRockOffset; uniform sampler2D uRockNoise; uniform vec2 uRockNoiseSize;' : ''}
            varying vec3 vWorldPos;
            ${rockNoiseGLSL}
            ${shader.vertexShader}
        `

        shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            `
            #include <begin_vertex>

            #ifdef USE_INSTANCING
                // Use instance matrix for variation seed
                float seed = instanceMatrix[3][0] * 0.1 + instanceMatrix[3][2] * 0.1;

                // Displacement logic
                float nx = position.x * 1.5;
                float ny = position.y * 1.5;
                float nz = position.z * 1.5;

                // Unique noise per instance by adding seed offset
                ${baked ? `float noiseIndex = aRockVertex + aRockOffset;
                vec2 noiseUV = (vec2(mod(noiseIndex, uRockNoiseSize.x), floor(noiseIndex / uRockNoiseSize.x)) + 0.5) / uRockNoiseSize;
                float nVal = texture2D(uRockNoise, noiseUV).r;` : `float nVal = snoise(vec3(nx + seed * 10.0, ny + seed * 10.0, nz + seed * 10.0));
                nVal += 0.5 * snoise(vec3(nx * 2.0 + 10.0 + seed, ny * 2.0 + 10.0 + seed, nz * 2.0 + 10.0 + seed));`}

                vec3 norm = normalize(position);
                transformed += norm * (nVal * 0.3);

                // Flatten bottom slightly for stability look
                if (transformed.y < -0.4) {
                    float d = -0.4 - transformed.y;
                    transformed.y += d * 0.5;
                    transformed.x *= 1.0 + d * 0.2;
                    transformed.z *= 1.0 + d * 0.2;
                }

                vWorldPos = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
            #else
                vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
            #endif
            `
        )

        shader.fragmentShader = `
            varying vec3 vWorldPos;
            ${shader.fragmentShader}
        `

        // Inject roughness variation
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <roughnessmap_fragment>',
            `
            #include <roughnessmap_fragment>
            float mossNoiseR = sin(vWorldPos.x * 2.0) * cos(vWorldPos.z * 2.0);
            // Moss is rougher (0.9), wet rock is smoother (0.2)
            float mossFactorR = smoothstep(0.4, 0.6, mossNoiseR);
            // Also adjust for height (wet near water level 0.0)
            float wetness = (1.0 - smoothstep(-0.1, 0.4, vWorldPos.y));

            float baseRoughness = mix(0.7, 0.2, wetness); // Wet rocks are very glossy
            roughnessFactor = mix(baseRoughness, 1.0, mossFactorR);
            `
        )

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <color_fragment>',
            `
            #include <color_fragment>

            // Procedural rock texture
            float n = sin(vWorldPos.x * 10.0) * cos(vWorldPos.z * 10.0);

            vec3 rockColor = diffuseColor.rgb;

            // Varied rock color
            rockColor += vec3(n * 0.05);

            // Wetness Darkening
            float wetnessColor = (1.0 - smoothstep(-0.1, 0.4, vWorldPos.y));
            // Wet rocks are darker and more saturated
            rockColor = mix(rockColor, rockColor * 0.5, wetnessColor * 0.8);

            // Add some mossy patches
            float mossNoise = sin(vWorldPos.x * 2.0) * cos(vWorldPos.z * 2.0);

            // Soft blend for moss
            float mossFactor = smoothstep(0.3, 0.7, mossNoise);
            // Only on top surfaces/higher up, not under water
            mossFactor *= smoothstep(0.0, 0.3, vWorldPos.y);

            vec3 mossColor = vec3(0.2, 0.35, 0.15);
            rockColor = mix(rockColor, mossColor, mossFactor);

            // Add speckles
            float speckle = fract(sin(dot(vWorldPos.xyz, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
            if (speckle > 0.9) rockColor *= 0.8;
            if (speckle < 0.1) rockColor *= 1.2;

            // Ground Occlusion (Bottom of rock darkened)
            // Assuming rock sits around y=0 to y=0.5
            // But vWorldPos.y is world height. Stream is at y=0.05
            // Rocks are positioned at rock.position which has y scale.

            // We want to darken the very bottom of the geometry, regardless of world position if possible.
            // But vWorldPos works if we assume the rock sits on the ground.
            // Darken below y=0.1
            float groundOcc = (1.0 - smoothstep(0.0, 0.2, vWorldPos.y));
            rockColor *= mix(1.0, 0.3, groundOcc); // Darken bottom significantly

            diffuseColor.rgb = rockColor;
            `
        )
    }
    return mat
  }, [])

  // Base geometry for instances
  const baseGeometry = useMemo(() => {
      return new THREE.IcosahedronGeometry(1, 3);
  }, []);

  // Generate instances
  const rockInstances = useMemo(() => {
      const rand = mulberry32(12345);
      const array = new Float32Array(300 * 16);
      const dummy = new THREE.Object3D();

      for(let i=0; i<300; i++) {
          const scaleX = 0.3 + rand() * 0.5;
          const scaleZ = 0.3 + rand() * 0.5;
          const scaleY = 0.2 + rand() * 0.3;

          dummy.position.set(
              (rand() - 0.5) * 18,
              scaleY * 0.2,
              (rand() - 0.5) * 2000
          );

          dummy.scale.set(scaleX, scaleY, scaleZ);

          dummy.rotation.set(
              (rand() - 0.5) * 0.5,
              rand() * Math.PI * 2,
              (rand() - 0.5) * 0.5
          );

          dummy.updateMatrix();
          dummy.matrix.toArray(array, i * 16);
      }
      return array;
  }, []);

  const waterGeometry = useMemo(() => {
    // The existing 12-unit scatter exclusion still contains every bank point.
    // Shape both banks inside that corridor; never widen into the grove.
    const geometry = new THREE.PlaneGeometry(20, 2000, 4, 512)
    const p = geometry.attributes.position
    for (let i = 0; i < p.count; i++) {
      const along = p.getY(i)
      const { center, halfWidth } = streamSection(along)
      p.setX(i, center + p.getX(i) / 10 * halfWidth)
    }
    geometry.computeVertexNormals()
    return geometry
  }, [])

  const bankGeometry = useMemo(createStreamBanks, [])
  const shoreStones = useMemo(createShoreStones, [])
  const instancedMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const shoreGeometry = useMemo(() => new THREE.IcosahedronGeometry(1, 1), [])
  useLayoutEffect(() => {
    if (new URLSearchParams(location.search).get('rockbake') !== '1') return
    const sets = [{ geometry: baseGeometry, transforms: rockInstances }, { geometry: shoreGeometry, transforms: shoreStones }]
    const started = performance.now()
    const baked = bakeRockNoise(gl, sets)
    gl.domElement.dataset.rockBake = baked ? 'gpu-float32' : 'original-fallback'
    gl.domElement.dataset.rockBakeMs = (performance.now() - started).toFixed(1)
    if (!baked) return
    indexRockBake(sets)
    rockMaterial.userData.bakedNoise = baked.texture
    rockMaterial.userData.bakedSize = new THREE.Vector2(baked.width, baked.height)
    rockMaterial.needsUpdate = true
    return () => { baked.target.dispose(); delete rockMaterial.userData.bakedNoise; rockMaterial.needsUpdate = true }
  }, [gl, baseGeometry, shoreGeometry, rockInstances, shoreStones, rockMaterial, contextVersion])

  return (
    <group position={[-15, 0.05, 0]} rotation={[0, Math.PI / 4, 0]}>
      {/* Water Surface */}
      <mesh ref={meshRef} geometry={waterGeometry} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        {cheapWater ? (
          // Cheap water: no transmission pass, but keep it alive - deeper tint,
          // higher opacity, low roughness + a little metalness so the forest
          // env-map reflection breaks up the flat pale sheet.
          <meshStandardMaterial
            color="#b6d3cb"
            map={rippleColor}
            bumpMap={rippleMap}
            bumpScale={0.12}
            transparent
            opacity={0.82}
            roughness={0.28}
            metalness={0.2}
          />
        ) : (
          <MeshTransmissionMaterial
              resolution={512}
              samples={6}
              thickness={0.5}
              roughness={0.1}
              ior={1.33}
              chromaticAberration={0.03}
              anisotropy={0.5}
              distortion={0.5}
              distortionScale={0.5}
              temporalDistortion={0.2}
              color="#8fbcd4"
          />
        )}
      </mesh>

      <mesh geometry={bankGeometry} receiveShadow>
        <meshStandardMaterial vertexColors transparent depthWrite={false} roughness={0.92} side={THREE.DoubleSide} />
      </mesh>

      <instancedMesh
        ref={mesh => {
          if (!mesh) return
          mesh.instanceMatrix.array.set(shoreStones)
          mesh.instanceMatrix.needsUpdate = true
          mesh.computeBoundingSphere()
        }}
        args={[undefined, rockMaterial, 800]}
        receiveShadow
      >
        <primitive object={shoreGeometry} attach="geometry" />
      </instancedMesh>

      {/* River Stones Instanced */}
      <instancedMesh
          ref={(mesh) => {
              if (mesh) {
                  mesh.layers.enable(1); // Enable focus
                  instancedMeshRef.current = mesh;
                  mesh.instanceMatrix.array.set(rockInstances);
                  mesh.instanceMatrix.needsUpdate = true;
              }
          }}
          args={[baseGeometry, rockMaterial, 300]}
          receiveShadow
          castShadow
      />
    </group>
  )
}
