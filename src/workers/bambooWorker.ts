import * as THREE from 'three'
import { SimplexNoise } from 'three-stdlib'

self.onmessage = (e: MessageEvent) => {
  const { count } = e.data

  const stalkArray = new Float32Array(count * 16)
  const branchArray = new Float32Array(count * 5 * 16)
  const leafArray = new Float32Array(count * 5 * 3 * 16)

  let stalkCount = 0
  let branchCount = 0
  let leafCount = 0

  const tempStalk = new THREE.Object3D()
  const tempBranch = new THREE.Object3D()
  const tempLeaf = new THREE.Object3D()

  const simplex = new SimplexNoise()

  for (let i = 0; i < count; i++) {
    let x = 0, z = 0
    let valid = false

    for (let attempt = 0; attempt < 10; attempt++) {
      x = (Math.random() - 0.5) * 2000
      z = (Math.random() - 0.5) * 2000

      const noiseVal = simplex.noise(x * 0.015, z * 0.015);
      const n = noiseVal * 0.5 + 0.5;

      if (n < 0.45) continue;

      const distToCenter = Math.sqrt(x * x + z * z)
      const distToStream = Math.abs(x + z) / Math.sqrt(2)

      if (distToStream < 6) continue
      if (distToCenter < 5) continue

      valid = true
      break;
    }

    if (!valid) continue;

    const rotationY = Math.random() * Math.PI * 2
    const scale = 0.7 + Math.random() * 0.8

    tempStalk.position.set(x, 2.5, z)
    tempStalk.rotation.set(0, rotationY, 0)
    tempStalk.scale.set(scale, scale, scale)
    tempStalk.updateMatrix()
    tempStalk.matrix.toArray(stalkArray, stalkCount * 16)
    stalkCount++

    const numNodes = 5;
    for (let h = 0; h < numNodes; h++) {
        const localY = -1.5 + h * 1.0 + (Math.random() * 0.2 - 0.1);
        if (localY > 2.0) continue;

        if (Math.random() > 0.3) {
            const branchAngle = Math.random() * Math.PI * 2;

            tempBranch.position.set(x, 2.5 + localY * scale, z);
            tempBranch.rotation.set(0, branchAngle, 0);
            tempBranch.rotateX(-Math.PI / 4 - Math.random() * 0.2);

            const branchLen = 0.8 + Math.random() * 0.5;
            tempBranch.scale.set(scale * 0.5, branchLen, scale * 0.5);

            tempBranch.updateMatrix();

            if (branchCount * 16 < branchArray.length) {
                tempBranch.matrix.toArray(branchArray, branchCount * 16)
                branchCount++
            }

            const tilt = Math.PI / 4 + 0.1;
            const dy = Math.sin(tilt) * branchLen * scale;
            const dr = Math.cos(tilt) * branchLen * scale;
            const dx = Math.sin(branchAngle) * dr;
            const dz = Math.cos(branchAngle) * dr;

            const tipX = x + dx;
            const tipY = (2.5 + localY * scale) + dy;
            const tipZ = z + dz;

            const numLeaves = 3 + Math.floor(Math.random() * 3);
            for (let L = 0; L < numLeaves; L++) {
                 const leafAngle = Math.random() * Math.PI * 2;

                 tempLeaf.position.set(
                     tipX + (Math.random() - 0.5) * 0.2,
                     tipY + (Math.random() - 0.5) * 0.2,
                     tipZ + (Math.random() - 0.5) * 0.2
                 );

                 tempLeaf.rotation.set(
                     Math.random() * 0.5,
                     leafAngle,
                     Math.random() * 0.5
                 );

                 const leafScale = (0.5 + Math.random() * 0.5) * scale;
                 tempLeaf.scale.set(leafScale, leafScale, leafScale);
                 tempLeaf.updateMatrix();

                 if (leafCount * 16 < leafArray.length) {
                     tempLeaf.matrix.toArray(leafArray, leafCount * 16)
                     leafCount++
                 }
            }
        }
    }
  }

  const validStalks = new Float32Array(stalkArray.buffer, 0, stalkCount * 16)
  const validBranches = new Float32Array(branchArray.buffer, 0, branchCount * 16)
  const validLeaves = new Float32Array(leafArray.buffer, 0, leafCount * 16)

  postMessage(
    {
        stalkInstances: validStalks,
        branchInstances: validBranches,
        leafInstances: validLeaves
    },
    { transfer: [validStalks.buffer, validBranches.buffer, validLeaves.buffer] }
  )
}
