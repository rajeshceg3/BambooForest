import * as THREE from 'three'
// Static fibers, nodes and weathering are baked once. The low-tier material
// keeps the same trunks and movement without per-pixel simplex evaluations.
export function bakeBambooSurface() {
  const width = 128, height = 512
  const data = new Uint8Array(width * height * 4)
  let seed = 421
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }
  const fibers = Array.from({ length: width }, () => random())
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const node = y % 64
    const ring = node < 3 ? 0.55 : node < 5 ? 1.12 : 1
    const noise = (random() - 0.5) * 13
    const fiber = 0.86 + fibers[x] * 0.24
    const base = y < 30 ? 0.5 + y / 60 : 1
    const i = (y * width + x) * 4
    for (let c = 0; c < 3; c++) data[i + c] = Math.max(0, Math.min(255, ([78, 108, 52][c] * ring * fiber + noise) * base))
    data[i + 3] = 255
  }
  const texture = new THREE.DataTexture(data, width, height)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.needsUpdate = true
  return texture
}
