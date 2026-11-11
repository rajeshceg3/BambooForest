import * as THREE from 'three'

// Reference-led lanceolate outline with a shallow central fold. Static shape
// and normals are baked together, never tapered a second time by the shader.
export function createBambooLeafGeometry() {
  // Same leaf instances. 24 triangles instead of4 per blade, not cost-neutral.
  const geometry = new THREE.PlaneGeometry(0.16, 0.7, 2, 6)
  const p = geometry.attributes.position
  for (let i = 0; i < p.count; i++) {
    const t = THREE.MathUtils.clamp((p.getY(i) + 0.35) / 0.7, 0, 1)
    const x = p.getX(i) * Math.pow(Math.max(0, Math.sin(Math.PI * t)), 0.8)
    const midrib = Math.max(0, 1 - Math.abs(x) / 0.04) * 0.012
    const cup = Math.pow(Math.abs(x), 1.5) * 1.5 * (1 - t * 0.5)
    p.setXYZ(i, x, t * 0.7, -0.12 * t * t + cup - midrib)
  }
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}
