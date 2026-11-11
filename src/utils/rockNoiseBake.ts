import * as THREE from 'three'
import { rockNoiseGLSL } from './rockNoise'

interface RockSet { geometry: THREE.BufferGeometry; transforms: Float32Array }

// Lookup addresses only. All original positions, normals and topology remain.
export function indexRockBake(sets: RockSet[]) {
  let offset = 0
  for (const { geometry, transforms } of sets) {
    const count = geometry.getAttribute('position').count
    geometry.setAttribute('aRockVertex', new THREE.BufferAttribute(Float32Array.from({ length: count }, (_, i) => i), 1))
    geometry.setAttribute('aRockOffset', new THREE.InstancedBufferAttribute(Float32Array.from({ length: transforms.length / 16 }, (_, i) => offset + i * count), 1))
    offset += count * transforms.length / 16
  }
}

// Evaluate the identical static GLSL expression once, on the same GPU. Do not
// approximate simplex noise on the CPU or quantize the result into an image.
export function bakeRockNoise(renderer: THREE.WebGLRenderer, sets: RockSet[]) {
  if (!renderer.capabilities.isWebGL2 || !renderer.getContext().getExtension('EXT_color_buffer_float')) return null
  const count = sets.reduce((n, s) => n + s.geometry.getAttribute('position').count * s.transforms.length / 16, 0)
  const width = Math.min(1024, renderer.capabilities.maxTextureSize)
  const height = Math.ceil(count / width)
  if (height > renderer.capabilities.maxTextureSize) return null
  const data = new Float32Array(width * height * 4)
  let cursor = 0
  for (const { geometry, transforms } of sets) {
    const positions = geometry.getAttribute('position')
    for (let i = 0; i < transforms.length; i += 16) for (let j = 0; j < positions.count; j++) {
      // Store inputs, not pre-rounded arithmetic: GLSL performs the same
      // multiply/add sequence as the original vertex shader.
      data[cursor++] = positions.getX(j)
      data[cursor++] = positions.getY(j)
      data[cursor++] = positions.getZ(j)
      data[cursor++] = i / 16
    }
  }
  const input = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.FloatType)
  input.needsUpdate = true
  // Translation inputs retain the original individual Float32 values so seed
  // arithmetic is performed by GLSL too, with the same precision/order.
  const translations: number[] = []
  for (const set of sets) for (let i = 0; i < set.transforms.length; i += 16) translations.push(set.transforms[i + 12], set.transforms[i + 14], 0, 0)
  const seeds = new THREE.DataTexture(new Float32Array(translations), translations.length / 4, 1, THREE.RGBAFormat, THREE.FloatType)
  seeds.needsUpdate = true
  // Each set's instance ids above are local; address the translation texture
  // globally, without changing the expression that constructs the seed.
  let sampleOffset = 0, instanceOffset = 0
  for (const set of sets) {
    const vertices = set.geometry.getAttribute('position').count
    for (let i = 0; i < set.transforms.length / 16; i++) for (let j = 0; j < vertices; j++) data[(sampleOffset++) * 4 + 3] = instanceOffset + i
    instanceOffset += set.transforms.length / 16
  }
  const target = new THREE.WebGLRenderTarget(width, height, { type: THREE.FloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false, stencilBuffer: false })
  const material = new THREE.ShaderMaterial({
    uniforms: { inputs: { value: input }, translations: { value: seeds }, size: { value: new THREE.Vector2(width, height) }, instances: { value: instanceOffset } },
    vertexShader: 'void main(){gl_Position=vec4(position.xy,0.0,1.0);}',
    fragmentShader: `uniform sampler2D inputs; uniform sampler2D translations; uniform vec2 size; uniform float instances; ${rockNoiseGLSL}
      void main(){
        vec4 p=texture2D(inputs,gl_FragCoord.xy/size);
        vec2 translation=texture2D(translations,vec2((p.w+0.5)/instances,0.5)).xy;
        float seed=translation.x*0.1+translation.y*0.1;
        float nx=p.x*1.5; float ny=p.y*1.5; float nz=p.z*1.5;
        float nVal=snoise(vec3(nx+seed*10.0,ny+seed*10.0,nz+seed*10.0));
        nVal+=0.5*snoise(vec3(nx*2.0+10.0+seed,ny*2.0+10.0+seed,nz*2.0+10.0+seed));
        gl_FragColor=vec4(nVal,0.0,0.0,1.0);
      }`, depthTest: false, depthWrite: false, blending: THREE.NoBlending, toneMapped: false,
  })
  const geometry = new THREE.PlaneGeometry(2, 2)
  const scene = new THREE.Scene()
  scene.add(new THREE.Mesh(geometry, material))
  const previous = renderer.getRenderTarget()
  try { renderer.setRenderTarget(target); renderer.render(scene, new THREE.Camera()) }
  finally { renderer.setRenderTarget(previous); input.dispose(); seeds.dispose(); material.dispose(); geometry.dispose() }
  return { target, texture: target.texture, width, height }
}
