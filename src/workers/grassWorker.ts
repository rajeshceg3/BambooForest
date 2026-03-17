import * as THREE from 'three'
import { SimplexNoise } from 'three-stdlib'

self.onmessage = (e: MessageEvent) => {
  const { count } = e.data

  const array = new Float32Array(count * 16)
  const tempObject = new THREE.Object3D()
  const simplex = new SimplexNoise()
  let validCount = 0

  for (let i = 0; i < count; i++) {
      let x = 0, z = 0
      let valid = false

      // Try to place grass
      for(let attempt = 0; attempt < 5; attempt++) {
          x = (Math.random() - 0.5) * 2000
          z = (Math.random() - 0.5) * 2000

          const noiseVal = simplex.noise(x * 0.015, z * 0.015);
          const n = noiseVal * 0.5 + 0.5;

          let probability = 1.0;
          if (n > 0.45) {
              probability = 0.3;
          } else {
              probability = 0.9;
          }

          if (Math.random() > probability) continue;

          const distToStream = Math.abs(x + z) / Math.sqrt(2)
          const distToCenter = Math.sqrt(x * x + z * z)

          if (distToStream < 2) continue
          if (distToCenter < 2) continue

          valid = true;
          break;
      }

      if (!valid) continue;

      const scale = 0.6 + Math.random() * 0.8
      tempObject.position.set(x, 0, z)

      tempObject.rotation.y = Math.random() * Math.PI * 2
      tempObject.rotation.x = (Math.random() - 0.5) * 0.3
      tempObject.rotation.z = (Math.random() - 0.5) * 0.3

      tempObject.scale.set(scale, scale, scale)
      tempObject.updateMatrix()
      tempObject.matrix.toArray(array, validCount * 16)
      validCount++
  }

  const validArray = new Float32Array(array.buffer, 0, validCount * 16)

  postMessage(
    { instanceMatrixArray: validArray, actualCount: validCount },
    { transfer: [validArray.buffer] }
  )
}
