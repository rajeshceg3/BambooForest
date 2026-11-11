import * as THREE from 'three'

// Frequencies remain resolvable by the existing 3.9m water longitudinal mesh.
export function streamSection(along: number) {
  return {
    center: Math.sin(along * 0.045) + Math.sin(along * 0.13) * 0.3 + Math.sin(along * 0.29) * 0.2,
    halfWidth: 7.25 + Math.sin(along * 0.085 + 0.7) * 0.65 + Math.sin(along * 0.27) * 0.3,
  }
}

// Damp soil rises slightly at the waterline, then fades into existing ground.
// There is no opaque outer ribbon or displaced ground outside the corridor.
export function createStreamBanks() {
  const positions: number[] = [], colors: number[] = [], indices: number[] = []
  const palette = ['#3e4031', '#4c5139', '#3f5540'].map(c => new THREE.Color(c))
  const rows = 513, lanes = 3
  for (const side of [-1, 1]) {
    const base = positions.length / 3
    for (let row = 0; row < rows; row++) {
      const along = -1000 + row * 2000 / (rows - 1)
      const { center, halfWidth } = streamSection(along)
      const shoulder = 1.4 + Math.sin(along * 0.19 + side) * 0.45
      for (let lane = 0; lane < lanes; lane++) {
        const offset = lane === 0 ? -.35 - .2 * Math.sin(along * .21) : lane === 1 ? shoulder * 0.35 : shoulder
        const y = lane === 0 ? 0.018 : lane === 1 ? 0.08 + Math.sin(along * .23) * .025 : -0.06
        positions.push(center + side * (halfWidth + offset), y, -along)
        const color = palette[lane]
        const fleck = 0.87 + 0.13 * Math.sin(along * 0.53 + lane)
        colors.push(color.r * fleck, color.g * fleck, color.b * fleck, lane === 2 ? 0 : lane === 1 ? 0.9 : 1)
      }
      if (row > 0) for (let lane = 0; lane < lanes - 1; lane++) {
        const a = base + (row - 1) * lanes + lane, b = a + lanes
        if (side === -1) indices.push(a, b, a + 1, a + 1, b, b + 1)
        else indices.push(a, a + 1, b, a + 1, b + 1, b)
      }
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

// Two differently sized stones gather at each irregular pocket, rather than
// equally spaced beads. The original 300 stream stones remain untouched.
export function createShoreStones() {
  const transforms = new Float32Array(800 * 16)
  const stone = new THREE.Object3D()
  for (let i = 0; i < 800; i++) {
    const pocket = Math.floor(i / 2), member = i % 2
    const side = pocket % 2 ? -1 : 1
    const along = -990 + Math.floor(pocket / 2) * 10 + Math.sin(pocket * 17.17) * 4 + (member - .5) * 1.2
    const { center, halfWidth } = streamSection(along)
    const size = member === 0 ? .7 + (0.5 + 0.5 * Math.sin(i * 31.13)) * .35 : .18 + (0.5 + 0.5 * Math.sin(i * 31.13)) * .4
    const shore = -.35 + member * .5 + Math.sin(i * 9.23) * .25
    stone.position.set(center + side * (halfWidth + shore), size * 0.2, -along)
    stone.rotation.set(Math.sin(i) * 0.2, i * 2.39996, Math.cos(i) * 0.2)
    stone.scale.set(size * 1.25, size * .62, size)
    stone.updateMatrix()
    stone.matrix.toArray(transforms, i * 16)
  }
  return transforms
}
