import * as THREE from 'three'

// Keep every worker transform byte-for-byte. Spatial batches give Three real
// bounds to reject offscreen work instead of submitting the entire forest.
export function partitionBambooTransforms(array: Float32Array, cellSize = 24) {
  const buckets = new Map<string, number[]>()
  for (let offset = 0; offset < array.length; offset += 16) {
    const key = `${Math.floor(array[offset + 12] / cellSize)},${Math.floor(array[offset + 14] / cellSize)}`
    const bucket = buckets.get(key) ?? []
    for (let j = 0; j < 16; j++) bucket.push(array[offset + j])
    buckets.set(key, bucket)
  }
  return [...buckets.values()].map(values => new Float32Array(values))
}

export function createBambooChunks(source: THREE.InstancedMesh, cellSize = 24) {
  const chunks = partitionBambooTransforms(source.instanceMatrix.array.subarray(0, source.count * 16) as Float32Array, cellSize)
  return chunks.map(array => {
    const mesh = new THREE.InstancedMesh(source.geometry, source.material, array.length / 16)
    mesh.instanceMatrix.array.set(array)
    mesh.instanceMatrix.needsUpdate = true
    mesh.castShadow = source.castShadow
    mesh.receiveShadow = source.receiveShadow
    mesh.layers.mask = source.layers.mask
    if (source.name === 'bamboo-stalks') mesh.layers.enable(1)
    mesh.computeBoundingSphere()
    // Wind and near-player bend happen in the shader. Include their maximum
    // displacement so frustum rejection never clips an animated edge.
    if (mesh.boundingSphere) mesh.boundingSphere.radius += 3
    return mesh
  })
}
