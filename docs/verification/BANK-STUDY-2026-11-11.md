# Unaccepted local bank study, Nov11

Do not promote this study as a finished bank fix. Added soil ledges, modest contour variation,800 small shoreline stones. Original300 stones, all water and existing scene geometry remain. Shared streamSection drives water and soil edges, within12m vegetation exclusion. Added bank4096 triangles; extra stones are80 triangles each, not cost-neutral.

Inspected full-scene local Chromium at1365/390 from the original stream tour camera [-2,1.5,-10] looking [-10,0.1,-7], with temporary Zen and navigation-disabled initialization restored. First opaque soil rim looked like a uniform beige canal ribbon and was rejected. A dark per-vertex-alpha outer blend removed that hard outer ribbon. Remaining result is still too plain for whole-scene acceptance. No normal journey proof. Alternate closer framing made the water larger but did not settle the hold. Along-stream view timed out at readiness and gives no pass.

Actual baseline and study phone frames inspected. No error in completed runs. The study is local-only, excluded from the foliage preview branch. test-stream-banks verifies finite geometry, deterministic added stones, the soil/existing exclusion bounds and shared water outline. This is analytic support, not accepted pixels. Existing bank hold remains open.


## Separate organic-bank diagnostic, 07:20 IST

Branch diag/organic-bank-20261111 starts at foliage45440fb, not the local-only deer branch. The original study remains separately preserved at e5fa22c. Reference page read and photograph inspected: https://www.pexels.com/photo/trees-near-body-of-water-in-the-middle-of-forest-12858154/ . The photo has irregular partly submerged stones, damp soil and overhanging vegetation; current procedural work is not a photo asset import or a recreation of that scene.

Reworked the shallow soil edge, kept its outer alpha fade, made stream contour variation resolvable by its existing longitudinal mesh, and changed the800 additional shoreline stones from small equally spaced beads to pairs of differently sized stones in irregular pockets. Original300 stones remain byte-for-byte transforms. All grove/critters/ground are retained. Reused the original rock material, with ordered wetness/occlusion smoothsteps and complete parent-world transform. No added render passes. Added4096 bank triangles and64000 shore-stone triangles. Foliage triangle increase from45440fb remains. These are not cost-neutral changes.

Analytic test checks finite normals/colors/positions, determinism, full stone bounds (including displacement), soil/water width and the existing12m exclusion. This test is support, not pixel acceptance.

Local full-scene reduced-motion diagnostic with temporary original stream-tour camera and Zen/navigation setup reached4994 trunks, with zero reported page errors at390. Inspected the real screenshot: shoreline stones now appear, but the view still presents the bank nearly horizontally and does not prove natural terrain quality. Temporary initialization restored. Along-stream alternate view at[-16,2.5,-16] looking[-2,.15,8] did not reach bamboo readiness at390 or1365. Built-app control repeated that timeout. A stream-only diagnostic rendered; restoring bamboo reproduced timeout. A longer75s readiness attempt still failed. Do not attribute cause to a physical device or remove the grove. An actual normal-tour attempt stalled when focusing Next; no pass. Isolated control is not combined-scene proof.

The foliage-hosted evidence note was preserved separately as /downloads/foliage-hosted-evidence.patch before branch change; reviewed remote45440fb remains unchanged. This bank work is not merged, not accepted, not production. Further preview inspection must use normal entry/tour, with each original crash/quality hold preserved.
