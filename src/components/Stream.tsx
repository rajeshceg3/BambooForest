import { useRef, useMemo } from 'react'
import { MeshTransmissionMaterial } from '@react-three/drei'
import * as THREE from 'three'

// --- Simplex Noise Implementation (Inline to avoid dependency) ---
// Based on standard implementation
class SimplexNoise {
  private p: Uint8Array;
  private perm: Uint8Array;
  private permMod12: Uint8Array;
  private grad3 = new Float32Array([1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0,
    1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1,
    0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1]);

  constructor(random: () => number = Math.random) {
      this.p = new Uint8Array(256);
      for (let i = 0; i < 256; i++) {
          this.p[i] = i;
      }
      for (let i = 0; i < 255; i++) {
          const r = i + ~~(random() * (256 - i));
          const aux = this.p[i];
          this.p[i] = this.p[r];
          this.p[r] = aux;
      }
      this.perm = new Uint8Array(512);
      this.permMod12 = new Uint8Array(512);
      for (let i = 0; i < 512; i++) {
          this.perm[i] = this.p[i & 255];
          this.permMod12[i] = this.perm[i] % 12;
      }
  }

  noise3D(xin: number, yin: number, zin: number): number {
      const permMod12 = this.permMod12;
      const perm = this.perm;
      const grad3 = this.grad3;
      let n0, n1, n2, n3;
      const F3 = 1.0 / 3.0;
      const s = (xin + yin + zin) * F3;
      const i = Math.floor(xin + s);
      const j = Math.floor(yin + s);
      const k = Math.floor(zin + s);
      const G3 = 1.0 / 6.0;
      const t = (i + j + k) * G3;
      const X0 = i - t;
      const Y0 = j - t;
      const Z0 = k - t;
      const x0 = xin - X0;
      const y0 = yin - Y0;
      const z0 = zin - Z0;
      let i1, j1, k1;
      let i2, j2, k2;
      if (x0 >= y0) {
          if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
          else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
          else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
      } else {
          if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
          else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
          else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
      }
      const x1 = x0 - i1 + G3;
      const y1 = y0 - j1 + G3;
      const z1 = z0 - k1 + G3;
      const x2 = x0 - i2 + 2.0 * G3;
      const y2 = y0 - j2 + 2.0 * G3;
      const z2 = z0 - k2 + 2.0 * G3;
      const x3 = x0 - 1.0 + 3.0 * G3;
      const y3 = y0 - 1.0 + 3.0 * G3;
      const z3 = z0 - 1.0 + 3.0 * G3;
      const ii = i & 255;
      const jj = j & 255;
      const kk = k & 255;

      let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
      if (t0 < 0) n0 = 0.0;
      else {
          const gi0 = permMod12[ii + perm[jj + perm[kk]]] * 3;
          t0 *= t0;
          n0 = t0 * t0 * (grad3[gi0] * x0 + grad3[gi0 + 1] * y0 + grad3[gi0 + 2] * z0);
      }
      let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
      if (t1 < 0) n1 = 0.0;
      else {
          const gi1 = permMod12[ii + i1 + perm[jj + j1 + perm[kk + k1]]] * 3;
          t1 *= t1;
          n1 = t1 * t1 * (grad3[gi1] * x1 + grad3[gi1 + 1] * y1 + grad3[gi1 + 2] * z1);
      }
      let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
      if (t2 < 0) n2 = 0.0;
      else {
          const gi2 = permMod12[ii + i2 + perm[jj + j2 + perm[kk + k2]]] * 3;
          t2 *= t2;
          n2 = t2 * t2 * (grad3[gi2] * x2 + grad3[gi2 + 1] * y2 + grad3[gi2 + 2] * z2);
      }
      let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
      if (t3 < 0) n3 = 0.0;
      else {
          const gi3 = permMod12[ii + 1 + perm[jj + 1 + perm[kk + 1]]] * 3;
          t3 *= t3;
          n3 = t3 * t3 * (grad3[gi3] * x3 + grad3[gi3 + 1] * y3 + grad3[gi3 + 2] * z3);
      }
      return 32.0 * (n0 + n1 + n2 + n3);
  }
}

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
        shader.vertexShader = `
            varying vec3 vWorldPos;
            ${shader.vertexShader}
        `

        shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            `
            #include <begin_vertex>
            vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
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
            // Moss is rougher (0.9), wet rock is smoother (0.4)
            float mossFactorR = smoothstep(0.4, 0.6, mossNoiseR);
            // Also adjust for height (wet near water level)
            float wetness = smoothstep(0.5, 0.0, vWorldPos.y);

            float baseRoughness = mix(0.6, 0.3, wetness);
            roughnessFactor = mix(baseRoughness, 0.9, mossFactorR);
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

            // Add some mossy patches
            float mossNoise = sin(vWorldPos.x * 2.0) * cos(vWorldPos.z * 2.0);

            // Soft blend for moss
            float mossFactor = smoothstep(0.3, 0.7, mossNoise);
            // Only on top surfaces/higher up
            mossFactor *= smoothstep(0.0, 0.2, vWorldPos.y);

            vec3 mossColor = vec3(0.2, 0.35, 0.15);
            rockColor = mix(rockColor, mossColor, mossFactor);

            // Add speckles
            float speckle = fract(sin(dot(vWorldPos.xyz, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
            if (speckle > 0.9) rockColor *= 0.8;
            if (speckle < 0.1) rockColor *= 1.2;

            diffuseColor.rgb = rockColor;
            `
        )
    }
    return mat
  }, [])

  // Generate stable rocks with procedural geometry
  const rocks = useMemo(() => {
      const rand = mulberry32(12345);
      const simplex = new SimplexNoise(rand);

      const rockData: {
          position: [number, number, number],
          rotation: [number, number, number],
          scale: [number, number, number],
          geometry: THREE.BufferGeometry
      }[] = [];

      for(let i=0; i<25; i++) {
          const scaleX = 0.3 + rand() * 0.4
          const scaleZ = 0.3 + rand() * 0.4
          const scaleY = 0.2 + rand() * 0.2

          // Create base geometry (high resolution sphere)
          const geometry = new THREE.IcosahedronGeometry(1, 10); // Subdivision 10
          const posAttribute = geometry.attributes.position;

          const vertex = new THREE.Vector3();
          const scratch = new THREE.Vector3();

          // Apply displacement
          for (let v = 0; v < posAttribute.count; v++) {
              vertex.fromBufferAttribute(posAttribute, v);

              // Scale coordinates for noise frequency
              // Use vertex position relative to center (0,0,0)
              const nx = vertex.x * 1.5;
              const ny = vertex.y * 1.5;
              const nz = vertex.z * 1.5;

              // FBM-like noise (base shape + detail)
              let noise = simplex.noise3D(nx, ny, nz);
              noise += 0.5 * simplex.noise3D(nx * 2 + 10, ny * 2 + 10, nz * 2 + 10);

              // Displace vertex along its normal
              // For a sphere, normal is same as position normalized.
              // We assume initial radius is 1, so vertex is already normal.
              scratch.copy(vertex).normalize();

              const displacement = noise * 0.3; // Strength
              vertex.addScaledVector(scratch, displacement);

              // Flatten bottom slightly for stability look
              if (vertex.y < -0.4) {
                  // Smooth flattening
                  const d = -0.4 - vertex.y;
                  vertex.y += d * 0.5;
                  // Expand XZ to fake "squish"
                  vertex.x *= 1.0 + d * 0.2;
                  vertex.z *= 1.0 + d * 0.2;
              }

              posAttribute.setXYZ(v, vertex.x, vertex.y, vertex.z);
          }

          geometry.computeVertexNormals();

          rockData.push({
              position: [
                  (rand() - 0.5) * 12,
                  scaleY * 0.3, // Embed in ground
                  (rand() - 0.5) * 80
              ],
              scale: [scaleX, scaleY, scaleZ],
              rotation: [
                  (rand() - 0.5) * 0.5,
                  rand() * Math.PI * 2,
                  (rand() - 0.5) * 0.5
              ],
              geometry: geometry
          })
      }
      return rockData;
  }, [])

  return (
    <group position={[-15, 0.05, 0]} rotation={[0, Math.PI / 4, 0]}>
      {/* Water Surface */}
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[10, 100, 20, 100]} />
        {/* Advanced Transmission Material for realistic water */}
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

      {/* River Stones */}
      {rocks.map((rock, i) => (
          <mesh
            key={i}
            position={rock.position}
            scale={rock.scale}
            rotation={rock.rotation}
            receiveShadow
            castShadow
            geometry={rock.geometry}
            material={rockMaterial}
          />
      ))}
    </group>
  )
}
