import { useRef, useMemo } from 'react'
import { MeshTransmissionMaterial } from '@react-three/drei'
import * as THREE from 'three'

// Simple seedable random (LCG)
function mulberry32(a: number) {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
}

export function Stream() {
  const meshRef = useRef<THREE.Mesh>(null)

  const rockMaterial = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
        color: '#5a5a5a',
        roughness: 0.6,
        flatShading: false,
    })

    mat.onBeforeCompile = (shader) => {
        const noiseFunc = `
            vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
            vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
            float snoise(vec3 v) {
                const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
                const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

                vec3 i  = floor(v + dot(v, C.yyy) );
                vec3 x0 = v - i + dot(i, C.xxx) ;

                vec3 g = step(x0.yzx, x0.xyz);
                vec3 l = 1.0 - g;
                vec3 i1 = min( g.xyz, l.zxy );
                vec3 i2 = max( g.xyz, l.zxy );

                vec3 x1 = x0 - i1 + C.xxx;
                vec3 x2 = x0 - i2 + C.yyy;
                vec3 x3 = x0 - D.yyy;

                i = mod289(i);
                vec4 p = permute( permute( permute(
                            i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                        + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
                        + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

                float n_ = 0.142857142857;
                vec3  ns = n_ * D.wyz - D.xzx;

                vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

                vec4 x_ = floor(j * ns.z);
                vec4 y_ = floor(j - 7.0 * x_ );

                vec4 x = x_ *ns.x + ns.yyyy;
                vec4 y = y_ *ns.x + ns.yyyy;
                vec4 h = 1.0 - abs(x) - abs(y);

                vec4 b0 = vec4( x.xy, y.xy );
                vec4 b1 = vec4( x.zw, y.zw );

                vec4 s0 = floor(b0)*2.0 + 1.0;
                vec4 s1 = floor(b1)*2.0 + 1.0;
                vec4 sh = -step(h, vec4(0.0));

                vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
                vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

                vec3 p0 = vec3(a0.xy,h.x);
                vec3 p1 = vec3(a0.zw,h.y);
                vec3 p2 = vec3(a1.xy,h.z);
                vec3 p3 = vec3(a1.zw,h.w);

                vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
                p0 *= norm.x;
                p1 *= norm.y;
                p2 *= norm.z;
                p3 *= norm.w;

                vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
                m = m * m;
                return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                            dot(p2,x2), dot(p3,x3) ) );
            }
        `;

        shader.vertexShader = `
            varying vec3 vWorldPos;
            ${noiseFunc}
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
                float nVal = snoise(vec3(nx + seed * 10.0, ny + seed * 10.0, nz + seed * 10.0));
                nVal += 0.5 * snoise(vec3(nx * 2.0 + 10.0 + seed, ny * 2.0 + 10.0 + seed, nz * 2.0 + 10.0 + seed));

                vec3 norm = normalize(position);
                transformed += norm * (nVal * 0.3);

                // Flatten bottom slightly for stability look
                if (transformed.y < -0.4) {
                    float d = -0.4 - transformed.y;
                    transformed.y += d * 0.5;
                    transformed.x *= 1.0 + d * 0.2;
                    transformed.z *= 1.0 + d * 0.2;
                }

                vWorldPos = (instanceMatrix * vec4(transformed, 1.0)).xyz;
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
            float wetness = smoothstep(0.4, -0.1, vWorldPos.y);

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
            float wetnessColor = smoothstep(0.4, -0.1, vWorldPos.y);
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
            float groundOcc = smoothstep(0.2, 0.0, vWorldPos.y);
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
      const instances = [];
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
          instances.push(dummy.matrix.clone());
      }
      return instances;
  }, []);

  const instancedMeshRef = useRef<THREE.InstancedMesh | null>(null);

  // Set instances
  useMemo(() => {
      if (instancedMeshRef.current) {
          rockInstances.forEach((matrix, i) => {
              instancedMeshRef.current!.setMatrixAt(i, matrix);
          });
          instancedMeshRef.current.instanceMatrix.needsUpdate = true;
      }
  }, [rockInstances]);

  return (
    <group position={[-15, 0.05, 0]} rotation={[0, Math.PI / 4, 0]}>
      {/* Water Surface */}
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 2000, 32, 512]} />
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
      </mesh>

      {/* River Stones Instanced */}
      <instancedMesh
          ref={(mesh) => {
              if (mesh) {
                  mesh.layers.enable(1); // Enable focus
                  instancedMeshRef.current = mesh;
                  rockInstances.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
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
