# Static rock-noise bake, Nov 11 2026

Diagnostic only. Opt in with `?rockbake=1`; default remains original.
No production promotion. PR92/93 are excluded and remain held.

## Implementation and retained detail

The identical 3D simplex GLSL expression is evaluated once by the same GPU
into a 1024x469 RGBA Float32 target. The original vertex shader samples its
scalar result. All 300 river and 800 shore matrices, positions, topology,
normals, flattening, material, moss, speckle, wetness and lighting stay intact.
Unsupported WebGL2/float targets fall back to the original path. Context
restore rebuilds the texture rather than keeping an empty restored target.
Program cache keys distinguish live and baked shaders.

The retained target costs 7,684,096 bytes, plus lookup attributes. Bake submission
on local SwiftShader was 41.2ms CPU wall time; this is not a complete GPU/startup
cost measurement. No claim of lower total memory or physical-device safety.

## Evidence

- Transform feedback runs the original vertex expression for all 480,000
  instance/vertex pairs, then compares to the baked GPU values: zero differing
  Float32 values, zero nonfinite values, GL error zero, on local SwiftShader.
- Controlled paused-scene A-B at CSS viewport 390x844: entry, cross-stream,
  shoreline, wide stream. Identical camera, animation state and renderer;
  only shader input switches. Zero differing screenshot pixels at all four
  poses, with identical draw/triangle counts for each pair. Direct renderer
  static proof is not whole-journey/postprocessing acceptance.
- Same-page normal-motion live-loop ABBA: original 1.42185/1.42187fps,
  baked 1.44468/1.47065fps. Full 4994 stalks, 8800 branches, 35126 leaves.
  This tiny improvement is insufficient to recommend promotion.
- Lint, TypeScript/Vite build and every existing .cjs verification script pass.
  Bundle-size and old Browserslist warnings remain.

Reproduce from repo root with Node: `docs/verification/static-rock-gpu-proof.mjs`,
`static-rock-pixel-ab.mjs`, `static-rock-live-abba.mjs`. Requires local Chrome
and starts/stops its own Vite on4187. GPU expression equality is measured only
on this renderer, not all GPUs. Hosted final-head proof is tracked separately.
Original full-journey, audio, performance, quality and physical-phone holds stay.
