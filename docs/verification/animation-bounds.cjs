// Analytic stalled-frame coefficient check, not visual or functional proof.
const assert = require('node:assert/strict');
for (const delta of [0.016, 0.2, 1, 2, 10]) {
  const cameraAlpha = 1 - Math.exp(-6 * delta);
  const deerAlpha = Math.min(delta, 0.05) * 5;
  assert(cameraAlpha >= 0 && cameraAlpha <= 1);
  assert(deerAlpha >= 0 && deerAlpha <= 1);
  console.log({ delta, cameraAlpha, deerAlpha });
}
