# Cheap-tier repair, PR 82 (not merged)

Actual trunk defect: CylinderGeometry radialSegments=1. Reproduced with Three.js: x extent about 3.67e-17, versus 0.3 units at eight segments. The one-segment surface does not form a bamboo tube. Corrected to eight radial segments. Earlier crown-only explanation was insufficient.

Scatter is now seeded, including the SimplexNoise permutation table. Worker tests compare two independent runs and check every base against the stream bank. The stream group is translated -15 along X then rotated PI/4, so its world-space axis is x-z+15=0. Old exclusions used x+z=0; grass also used a narrower two-unit exclusion. Both now use the actual axis with a 12-unit margin. No hand-placed gateway cluster was added: seeded output already has 273 stalks within 40 units of entry at ULTRA_LOW.

Instance bounds are recomputed after uploading worker matrices. This is preventive culling hygiene, not an independently proven cause of the prior image.

Run `node docs/verification/test-workers.cjs` for deterministic placement and bank-exclusion checks. These checks do not establish visible trunk continuity. Desktop/phone preview pixels and reload consistency remain required. No visual acceptance or performance acceptance yet.

Cost caveat: this branch increases ULTRA_LOW bamboo and ground-cover counts, and repairs collapsed trunk geometry. It is NOT render-cost neutral. Physical-device performance remains unmeasured.
