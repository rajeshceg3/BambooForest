import * as THREE from 'three'

// Retile the existing indexed ground. Preserve every original triangle, normal
// and UV exactly; do not reduce tessellation or replace the surface with a quad.
export function partitionGroundGeometry(source: THREE.BufferGeometry, cellSize = 125) {
  const index = source.index
  if (!index) throw new Error('Expected indexed ground geometry')
  const positions = source.getAttribute('position')
  const buckets = new Map<string, number[]>()
  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i), b = index.getX(i + 1), c = index.getX(i + 2)
    const x = (positions.getX(a) + positions.getX(b) + positions.getX(c)) / 3
    const y = (positions.getY(a) + positions.getY(b) + positions.getY(c)) / 3
    const key = `${Math.floor(x / cellSize)},${Math.floor(y / cellSize)}`
    const triangles = buckets.get(key) ?? []
    triangles.push(a, b, c)
    buckets.set(key, triangles)
  }
  return [...buckets.values()].map(triangles => {
    const unique = [...new Set(triangles)]
    const remap = new Map(unique.map((original, i) => [original, i]))
    const geometry = new THREE.BufferGeometry()
    for (const [name, attribute] of Object.entries(source.attributes)) {
      if (!(attribute instanceof THREE.BufferAttribute)) throw new Error('Expected plain ground attributes')
      const values = new Float32Array(unique.length * attribute.itemSize)
      for (let i = 0; i < unique.length; i++) for (let j = 0; j < attribute.itemSize; j++) {
        values[i * attribute.itemSize + j] = attribute.array[unique[i] * attribute.itemSize + j]
      }
      geometry.setAttribute(name, new THREE.BufferAttribute(values, attribute.itemSize, attribute.normalized))
    }
    geometry.setIndex(triangles.map(original => remap.get(original)!))
    geometry.computeBoundingSphere()
    return geometry
  })
}
