import * as THREE from 'three'
import { SimplexNoise } from 'three-stdlib'

self.onmessage = (e: MessageEvent) => {
  const { count, spread = 2000 } = e.data
  // Repeatable placement, including the noise permutation table.
  let seed = 7319
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }

  const stalkArray = new Float32Array(count * 16)
  const branchArray = new Float32Array(count * 5 * 16)
  const leafArray = new Float32Array(count * 5 * 3 * 16)

  let stalkCount = 0
  let branchCount = 0
  let leafCount = 0

  const tempStalk = new THREE.Object3D()
  const tempBranch = new THREE.Object3D()
  const tempLeaf = new THREE.Object3D()

  const simplex = new SimplexNoise({ random })

  for (let i = 0; i < count; i++) {
    let x = 0, z = 0
    let valid = false

    for (let attempt = 0; attempt < 10; attempt++) {
      x = (random() - 0.5) * spread
      z = (random() - 0.5) * spread

      const noiseVal = simplex.noise(x * 0.015, z * 0.015);
      const n = noiseVal * 0.5 + 0.5;

      if (n < 0.45) continue;

      const distToCenter = Math.sqrt(x * x + z * z)
      const distToStream = Math.abs(x - z + 15) / Math.sqrt(2)

      // Stream plane is 20 wide (+-10 from its axis); excluding only <6 left
      // stalk bases standing in the water once the field shrank to the fog
      // window. Keep stalks fully on the bank.
      if (distToStream < 12) continue
      if (distToCenter < 5 || Math.hypot(x - 18, z + 10) < 3.5) continue

      valid = true
      break;
    }

    if (!valid) continue;

    const rotationY = random() * Math.PI * 2
    const scale = 0.7 + random() * 0.8

    tempStalk.position.set(x, 4 * scale, z)
    tempStalk.rotation.set(0, rotationY, 0)
    tempStalk.scale.set(scale, scale, scale)
    tempStalk.updateMatrix()
    tempStalk.matrix.toArray(stalkArray, stalkCount * 16)
    stalkCount++

    // Branches only in the upper half of the stalk (localY 0.2..2.0): with
    // branches from -1.5 up, sparse tiers showed diagonal sticks and leaf
    // clusters floating at heights where the thin trunk doesn't read, i.e.
    // fragments detached from any visible trunk. Crown placement keeps
    // foliage attached to a continuous visible column.
    const numNodes = 3;
    for (let h = 0; h < numNodes; h++) {
        const localY = 0.2 + h * 0.9 + (random() * 0.2 - 0.1);
        if (localY > 2.0) continue;

        if (random() > 0.3) {
            const branchAngle = random() * Math.PI * 2;

            tempBranch.position.set(x, (4 + localY) * scale, z);
            tempBranch.rotation.set(0, branchAngle, 0);
            tempBranch.rotateX(-Math.PI / 4 - random() * 0.2);

            const branchLen = 1.4 + random() * 0.8;
            tempBranch.scale.set(scale * 0.5, branchLen, scale * 0.5);

            tempBranch.updateMatrix();

            if (branchCount * 16 < branchArray.length) {
                tempBranch.matrix.toArray(branchArray, branchCount * 16)
                branchCount++
            }

            // Use the actual branch transform rather than separate trig with
            // an opposite Z sign. Keep the existing instance budget.
            const numLeaves = 3 + Math.floor(random() * 3);
            for (let L = 0; L < numLeaves; L++) {
                 const leafAngle = random() * Math.PI * 2;

                 // Alternate blades along the branchlet instead of a
                 // disconnected upright flag-cluster at its very tip.
                 // Keep the same random draws, preserving all stalk matrices.
                 const along = 0.45 + L / Math.max(1, numLeaves - 1) * 0.55
                 const attach = new THREE.Vector3(0, along, 0).applyMatrix4(tempBranch.matrix)
                 tempLeaf.position.set(
                     attach.x + (random() - 0.5) * 0.05,
                     attach.y + (random() - 0.5) * 0.05,
                     attach.z + (random() - 0.5) * 0.05
                 );

                 tempLeaf.rotation.set(
                     -1.65 - random() * 0.4,
                     branchAngle + (L % 2 ? -0.6 : 0.6) + leafAngle * 0.08,
                     (random() - 0.5) * 0.5
                 );

                 const leafScale = (0.8 + random() * 0.5) * scale;
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
