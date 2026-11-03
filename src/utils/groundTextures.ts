import * as THREE from 'three'

// Baked ground textures.
//
// The ground shader used to evaluate fbm (5 octaves of simplex noise) four
// times per fragment - colour mix plus three taps for normal perturbation -
// over a 2000x2000 plane that fills most of the screen. That is ~15M noise
// evaluations per frame and held a UHD 620 near 1 fps at every quality tier.
// The noise field is static, so bake it once at boot into a colour map and a
// height (bump) map and render with a plain standard material.

// --- 2D simplex noise (Gustavson-style), seeded --------------------------
const F2 = 0.5 * (Math.sqrt(3) - 1)
const G2 = (3 - Math.sqrt(3)) / 6

function makeSimplex2D(seed: number) {
  const perm = new Uint8Array(512)
  const p = new Uint8Array(256)
  let s = seed >>> 0
  const rand = () => {
    // xorshift32
    s ^= s << 13; s >>>= 0
    s ^= s >> 17
    s ^= s << 5; s >>>= 0
    return s / 4294967296
  }
  for (let i = 0; i < 256; i++) p[i] = i
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const t = p[i]; p[i] = p[j]; p[j] = t
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255]

  const grad = [
    [1, 1], [-1, 1], [1, -1], [-1, -1],
    [1, 0], [-1, 0], [0, 1], [0, -1],
  ]

  return (xin: number, yin: number): number => {
    let n0 = 0, n1 = 0, n2 = 0
    const sk = (xin + yin) * F2
    const i = Math.floor(xin + sk)
    const j = Math.floor(yin + sk)
    const t = (i + j) * G2
    const x0 = xin - (i - t)
    const y0 = yin - (j - t)
    const i1 = x0 > y0 ? 1 : 0
    const j1 = x0 > y0 ? 0 : 1
    const x1 = x0 - i1 + G2
    const y1 = y0 - j1 + G2
    const x2 = x0 - 1 + 2 * G2
    const y2 = y0 - 1 + 2 * G2
    const ii = i & 255
    const jj = j & 255
    let t0 = 0.5 - x0 * x0 - y0 * y0
    if (t0 > 0) {
      const g = grad[perm[ii + perm[jj]] & 7]
      t0 *= t0
      n0 = t0 * t0 * (g[0] * x0 + g[1] * y0)
    }
    let t1 = 0.5 - x1 * x1 - y1 * y1
    if (t1 > 0) {
      const g = grad[perm[ii + i1 + perm[jj + j1]] & 7]
      t1 *= t1
      n1 = t1 * t1 * (g[0] * x1 + g[1] * y1)
    }
    let t2 = 0.5 - x2 * x2 - y2 * y2
    if (t2 > 0) {
      const g = grad[perm[ii + 1 + perm[jj + 1]] & 7]
      t2 *= t2
      n2 = t2 * t2 * (g[0] * x2 + g[1] * y2)
    }
    return 70 * (n0 + n1 + n2) // ~[-1, 1]
  }
}

function makeFbm(noise: (x: number, y: number) => number) {
  return (x: number, y: number): number => {
    let v = 0
    let a = 0.5
    // Match the original shader's rotation/skew between octaves.
    const cos = Math.cos(0.5), sin = Math.sin(0.5)
    for (let o = 0; o < 5; o++) {
      v += a * noise(x, y)
      const nx = (cos * x + sin * y) * 2 + 100
      const ny = (-sin * x + cos * y) * 2 + 100
      x = nx; y = ny
      a *= 0.5
    }
    return v
  }
}

export interface BakedGround {
  map: THREE.CanvasTexture
  bumpMap: THREE.CanvasTexture
}

const WORLD_SIZE = 2000

export function bakeGroundTextures(size = 512): BakedGround {
  const colorCanvas = document.createElement('canvas')
  const bumpCanvas = document.createElement('canvas')
  colorCanvas.width = colorCanvas.height = size
  bumpCanvas.width = bumpCanvas.height = size
  const colorCtx = colorCanvas.getContext('2d')!
  const bumpCtx = bumpCanvas.getContext('2d')!
  const colorImg = colorCtx.createImageData(size, size)
  const bumpImg = bumpCtx.createImageData(size, size)

  const fbm = makeFbm(makeSimplex2D(1337))

  // Same palette and mixes as the replaced shader.
  const moss = [0.12, 0.20, 0.08]
  const dirt = [0.20, 0.16, 0.12]
  const dry = [0.28, 0.24, 0.16]
  const smoothstep = (e0: number, e1: number, x: number) => {
    const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const wx = (x / size) * WORLD_SIZE - WORLD_SIZE / 2
      const wz = (y / size) * WORLD_SIZE - WORLD_SIZE / 2
      const noise = fbm(wx * 0.1, wz * 0.1)
      const noiseDetail = fbm(wx * 0.5, wz * 0.5)
      const height = fbm(wx * 1.5, wz * 1.5)

      const mixFactor = smoothstep(-0.2, 0.6, noise)
      const dryFactor = smoothstep(0.4, 0.8, noiseDetail)

      const idx = (y * size + x) * 4
      for (let c = 0; c < 3; c++) {
        let base = moss[c] + (dirt[c] - moss[c]) * mixFactor
        base = base + (dry[c] - base) * (dryFactor * 0.5)
        colorImg.data[idx + c] = Math.round(Math.min(1, Math.max(0, base)) * 255)
      }
      colorImg.data[idx + 3] = 255

      const h = Math.round((height * 0.5 + 0.5) * 255)
      bumpImg.data[idx] = h
      bumpImg.data[idx + 1] = h
      bumpImg.data[idx + 2] = h
      bumpImg.data[idx + 3] = 255
    }
  }

  colorCtx.putImageData(colorImg, 0, 0)
  bumpCtx.putImageData(bumpImg, 0, 0)

  const map = new THREE.CanvasTexture(colorCanvas)
  map.colorSpace = THREE.SRGBColorSpace
  const bumpMap = new THREE.CanvasTexture(bumpCanvas)
  return { map, bumpMap }
}
