# Leaf random-ID static bake, Nov11 2026

Diagnostic only, enabled by `?leafbake=1`. Independent of PR96 and held PR92/93.
Do not promote: no useful steady-state speed improvement measured.

The original fract/sin/dot hash uses each leaf instance's exact Float32
translation. Evaluate once with a GPU vertex-transform-feedback pass, read
back its Float32 output, then upload as an InstancedBufferAttribute. CPU
Math.sin is not substituted. Each spatial chunk gets a small geometry clone
for its own per-instance attribute order; positions, normals, UVs, indices,
matrices, counts and original shader color/wind/material all stay intact.

The geometry clones and readback add startup work and some memory. Local
35126-ID bake/install was76ms wall time, not physical-device measurement.
Context restore rebuilds the IDs. Unsupported WebGL2 falls back to original.
Shared time/camera uniforms keep original and baked diagnostic programs live
when the comparison harness switches between them.

Four controlled paused390x844 views (entry/cross-stream/shore/wide) have zero
differing screenshot pixels and matching draw/triangle counts. They use the
same paused scene/camera/direct renderer. This is not postprocessing or
whole-journey acceptance, nor proof for every GPU.

Normal-motion same-page ABBA:
- Original1.40850 /1.39079fps.
- Baked1.38162 /1.40193fps.
No gain beyond this run's variation. The full4994stalk/8800branch/35126leaf
scene stayed present. This is not a loading/crash fix.

The new source/layout test checks every35126 real worker leaf across spatial
chunks for lookup ordering and retained geometry/matrices. Existing tests,
lint and build must pass before pushing. Full-journey/audio/performance/quality
and physical-phone holds remain.

Reproduction: `node docs/verification/static-leaf-pixel-ab.mjs` and
`node docs/verification/static-leaf-live-abba.mjs` from repo root. Chrome and
port4187 required. These start/stop their own Vite server.
