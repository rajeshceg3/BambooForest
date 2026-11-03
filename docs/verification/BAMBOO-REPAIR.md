# Cheap-tier repair, PR 82 (not merged)

Actual trunk defect: CylinderGeometry radialSegments=1. Reproduced with Three.js: x extent about 3.67e-17, versus 0.3 units at eight segments. The one-segment surface does not form a bamboo tube. Corrected to eight radial segments. Earlier crown-only explanation was insufficient.

Scatter is now seeded, including the SimplexNoise permutation table. Worker tests compare two independent runs and check every base against the stream bank. The stream group is translated -15 along X then rotated PI/4, so its world-space axis is x-z+15=0. Old exclusions used x+z=0; grass also used a narrower two-unit exclusion. Both now use the actual axis with a 12-unit margin. No hand-placed gateway cluster was added: seeded output already has 114 stalks within 40 units of bank entry at ULTRA_LOW.

Instance bounds are recomputed after uploading worker matrices. This is preventive culling hygiene, not an independently proven cause of the prior image.

Run `node docs/verification/test-workers.cjs` for deterministic placement and bank-exclusion checks. These checks do not establish visible trunk continuity. At f3b423c, desktop/phone pixels show continuous trunks on the bank and a desktop reload preserves grove layout. Entry still lay within the water corridor, so afe5c4c moves it to bank position [12,2,0] with a five-unit trunk clearance. Fresh pixels for that change remain required. No visual acceptance or performance acceptance yet.

Cost caveat: this branch increases ULTRA_LOW bamboo and ground-cover counts, and repairs collapsed trunk geometry. It is NOT render-cost neutral. Physical-device performance remains unmeasured.

## Next composition and animation pass

042e683 puts entry inside the grove at [18,2,-10], tiles ground textures over 32 world units, adds inexpensive water bump detail, and keeps deer ashore. Entry desktop/phone/reload inspected: near-trunk framing reads as a grove; bank bump looked excessive, and deer appeared inverted on reload. Not accepted.

2988468 reduces bank bump from 4 to 0.12 and caps deer delta at 0.05: previous lerp factors delta*5 exceeded one on slow frames and could extrapolate head/leg rotations. Camera rotation damping changed to bounded exponential coefficients. `animation-bounds.cjs` checks those coefficients for deltas through ten seconds; actual deer pixels still required.

Tour inspection exposed the camera remaining at entry after Next Step changed zone text. 091953a stabilizes the Canvas camera config object so UI rerenders no longer reapply entry position. This is a candidate fix requiring fresh tour-step pixels, not a proven tour pass.

Verification skill and feature map are now in `.agents/skills/verify-bamboo/`. Generated only. Entry-only screenshot checks above are not full feature-map or quadrant coverage.
