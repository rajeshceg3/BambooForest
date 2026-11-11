import * as THREE from 'three'

// Two offset lanceolate blades share a branchlet attachment. Each has six
// longitudinal edge segments. Static shape and normals bake together.
export function createBambooLeafGeometry() {
  const positions: number[] = [], uvs: number[] = [], indices: number[] = []
  for (let blade = 0; blade < 2; blade++) {
    const plane = new THREE.PlaneGeometry(0.14, 0.7, 1, 6)
    const p = plane.attributes.position
    const angle = blade === 0 ? -0.22 : 0.58
    const scale = blade === 0 ? 1 : 0.78
    for (let i = 0; i < p.count; i++) {
      const t = THREE.MathUtils.clamp((p.getY(i) + 0.35) / 0.7, 0, 1)
      const x = p.getX(i) * Math.pow(Math.max(0, Math.sin(Math.PI * t)), 0.8)
      const y = t * 0.7
      const z = -0.12 * t * t + Math.pow(Math.abs(x), 1.5) * 1.5
      positions.push((x * Math.cos(angle) - y * Math.sin(angle)) * scale,
        (x * Math.sin(angle) + y * Math.cos(angle)) * scale,
        z * scale + Math.sin(t * Math.PI) * blade * 0.04)
      uvs.push(plane.attributes.uv.getX(i), plane.attributes.uv.getY(i))
    }
    for (const i of plane.index!.array) indices.push(i + blade * p.count)
    plane.dispose()
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}
