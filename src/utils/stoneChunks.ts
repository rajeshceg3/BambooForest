import * as THREE from 'three'
import { partitionBambooTransforms } from './bambooChunks'

// Stream matrices stay in stream-local space, including shader variation seeds.
// The parent group still owns the exact original translation and rotation.
export function createStoneChunks(array: Float32Array, geometry: THREE.BufferGeometry, material: THREE.Material, focus = false) {
  return partitionBambooTransforms(array, 32).map(transforms => {
    const mesh = new THREE.InstancedMesh(geometry, material, transforms.length / 16)
    mesh.instanceMatrix.array.set(transforms)
    mesh.instanceMatrix.needsUpdate = true
    mesh.receiveShadow = true
    mesh.castShadow = focus
    if (focus) mesh.layers.enable(1)
    mesh.computeBoundingSphere()
    // Rock displacement is in the vertex shader, outside Three's CPU bounds.
    // Four local units conservatively exceed displacement after instance scale.
    if (mesh.boundingSphere) mesh.boundingSphere.radius += 4
    return mesh
  })
}
