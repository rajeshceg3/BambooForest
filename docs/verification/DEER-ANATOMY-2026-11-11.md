# Deer candidate, Nov11 2026

Candidate on diag/deer-grounding-20261111. Not accepted, not merged. Original foliage/bank/quadrant/motion/audio/performance holds remain.

## References

Read anatomy guidance and inspected real roe-deer photographs before modelling:
- https://animaldiversity.org/accounts/Capreolus_capreolus/ (proportions, ears, narrow cloven hooves)
- https://design.tutsplus.com/articles/how-to-draw-animals-deer-species-and-anatomy--vector-21372 (skeleton, silhouette, joints and hoof structure)
- https://www.colourbox.com/image/side-view-of-a-roe-deer-buck-looking-to-the-camera-and-coming-closer-image-56121884 (Jakub Mrocek photo, private visual reference only, not copied into the app)
- https://commons.wikimedia.org/wiki/File:Capreolus_capreolus_(51717308436).jpg (Caroline Legg photo, inspected as reference only)

No external image, model or texture was shipped. The procedural model is newly authored.

## Changes

A single smooth-union skinned surface joins the tapered torso, chest, haunch, neck base, skull and muzzle. Two bones articulate neck/head without floating pieces. Thin articulated forelegs and rear stifle/hock chains end in split hooves. Hoof pivots place the bottom at the existing ground y=-0.01. Walk uses a four-phase gait with stance travel matched to forward speed; swing lifts the foot rather than translating the entire animal below the floor. Root y remains0. Existing dry-bank exclusion retained. All bamboo/ground/river geometry retained.

Reduced motion stops animal time and locomotion. Animation uses capped simulation delta, not wall time after a long stall. Pose/state/hoof-bottom telemetry supplements actual pixels; it does not replace them. Tiny soft contact marks under hooves are independent of quality-tier real-time shadows.

Tour animal camera moves to10,2,-5 and looks low enough to frame the animal above the phone information card. This new normal-tour framing still needs hosted actual-UI review.

## Executed evidence

Actual local Google Chromium at1365x768 and390x844, full4994-stalk Grove scene. Diagnostic camera/Zen initialization and navigation-disable edits were temporary and restored after each run. This is combined-scene animal proof, not a genuine full-zone journey. Seeded randomness made pose comparisons repeatable.

- ALERT at both widths: successive actual frames, animal fully visible, upright, muzzle/ears present, no disconnected neck/torso seam. Readback stateALERT and root9,0,-8. Latest desktop series hoof-bottom telemetry all-0.0100. Phone anatomy/alert frames were also inspected.
- WALK at both widths from camera5,2,-10.5: three successive actual frames, full animal visible, articulated limb positions and moving body. Root progressed approximately9.085,0,-8.010 to9.134,0,-8.395, simulation phase0.257 to1.457. No page errors in these runs. Turns still need judgment in hosted context; do not infer whole-world/device performance.
- Reduced-motion anatomy at both widths was inspected before the last telemetry/refactor; final hosted reduced coverage remains open.

Earlier failed/occluded diagnostic frames are not passes. A previous script overlapped restoration after its command timeout; it was stopped, original App/Experience source restored from HEAD, then the bounded single-pose runs above were repeated. No such diagnostic initialization remains in source.

## Suite gate

npm run lint; npm run build; test-workers.cjs; test-deer.cjs; animation-bounds.cjs; stream-axis.cjs all pass. The new foot analytic test covers40000 samples, no bottom belowground, swing maximum about0.11, planted feet at-0.01 and stance velocity matched to root translation. This is analytic support only.

Lint follow-up: fixed the new callback dependency/semicolon issue; corrected existing Birds array dependencies and moved UI intention data outside the component. Existing context-module shared hook/data exports have explicit narrow Fast Refresh exceptions. No correctness lint rule was disabled globally.

Awaited: exact hosted candidate SHA/bundle and actual normal entry/tour view at both widths, visible phone animal, plus parent visual review. No merge until that review. Graze is not certified by the walk/alert frames. No physical-device or broad hardware-health claim.

## Hosted normal-tour deviation and follow-up

The first exact-head hosted phone normal-tour run reached step3 via Enter, Guided Tour and three Next actions. It exposed a framing failure: the deer had roamed to9.736,0,-6.083, about a metre from the fixed10,2,-5 camera, cropping the face and hiding the body. This is a failed gate, not an accepted candidate. The next change makes the animal step frame the actual deer root with a safe side offset(-4.6,2,-3), looking below its root to leave room above the phone card. Scene geometry is untouched. Requires renewed hosted pixels. Full suite rerun passed before the follow-up push. Local normal tour navigation suffered software-rendering timeouts and supplies no pass.
