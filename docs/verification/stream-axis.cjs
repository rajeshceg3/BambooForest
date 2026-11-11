const T = require('three');
const assert = require('node:assert/strict');
const transform = new T.Matrix4().makeRotationY(Math.PI / 4);
transform.setPosition(-15, 0.05, 0);
for (const z of [-1000, -20, 0, 20, 1000]) {
  const p = new T.Vector3(0, 0, z).applyMatrix4(transform);
  assert(Math.abs(p.x - p.z + 15) < 1e-8);
}
for (const x of [-10, 10]) {
  const p = new T.Vector3(x, 0, 20).applyMatrix4(transform);
  assert(Math.abs(Math.abs(p.x - p.z + 15) / Math.SQRT2 - 10) < 1e-8);
}
console.log('Stream axis and half-width verified from actual group transform');
