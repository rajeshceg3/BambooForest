# Compositor MSAA investigation, Nov11 2026

Research checkpoint only. No candidate implementation in this branch yet.
Default source behavior unchanged. Do not merge or promote without exact390
A-B review. PR92/93 and static-bake experiments remain held.

## Finding

Effects.tsx leaves EffectComposer multisampling at its library default. At
ULTRA_LOW, the actual main scene draws report GL.SAMPLES=4 and
GL.SAMPLE_BUFFERS=1. The Canvas antialias option controls a separate default
framebuffer and does not turn off this offscreen compositor sampling.

Local full-scene390x844 normal-motion SwiftShader diagnostic:
- Temporarily set only EffectComposer multisampling={0}:2.26610 /2.27732fps.
- Restore original source:1.43090 /1.39309fps.
- All4994stalk/8800branch/35126leaf content, material and geometry retained.
- Temporary source edit reverted. This is not a production candidate.

MSAA removal can lose edge quality. The scene is still slow. Physical-phone
performance and full-journey/audio/quality acceptance remain unproved.

## Reproduction and next work

`node docs/verification/compositor-sample-audit.mjs` starts its own Vite on4187,
opens real local Chrome, enters the app and records framebuffer sample counts
around actual draws. It is a sample-state audit, NOT a GPU timer.

Earlier attempts to rank programs with finish() were inconclusive. readPixels
on the multisampled main framebuffer returnedINVALID_OPERATION, so those
program timings are invalid and must not be used as a cost breakdown.

Investigate whether a lower-cost edge-preserving compositor setup can keep
intended material/geometry/details. Compare actual390 entry, near stalk/leaf
edges, stream/shore and visible deer before any candidate promotion. No
unreviewed production changes, and no claim that disabling AA meets quality.

Separate completed static-term experiments:
- Rock PR96/head24f7e9b: exact local Float32 values and bounded pixel pairs,
  only~2-3% speed gain and extra7.33MiB target. Not recommended to ship.
- Leaf-ID branch diag/static-leaf-id-20261111/head7b960d8: bounded pixel pairs
  equal, no measured speed gain, startup readback and geometry clones. Do not
  promote. Both default to original unless explicit diagnostic query selected.
