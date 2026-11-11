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

Awaited: exact hosted candidate SHA/bundle and actual normal entry/tour view at both widths, visible phone animal, plus reviewer visual review. No merge until that review. Graze is not certified by the walk/alert frames. No physical-device or broad hardware-health claim.

## Hosted normal-tour deviation and follow-up

The first exact-head hosted phone normal-tour run reached step3 via Enter, Guided Tour and three Next actions. It exposed a framing failure: the deer had roamed to9.736,0,-6.083, about a metre from the fixed10,2,-5 camera, cropping the face and hiding the body. This is a failed gate, not an accepted candidate. The next change makes the animal step frame the actual deer root with a safe side offset(-4.6,2,-3), looking below its root to leave room above the phone card. Scene geometry is untouched. Requires renewed hosted pixels. Full suite rerun passed before the follow-up push. Local normal tour navigation suffered software-rendering timeouts and supplies no pass.

The independent hosted1365 entry reached the animal but a foreground stalk occluded the body, so24dfad6 is not accepted. Follow-up chooses a5.5m camera ring angle using actual current stalk-instance positions and radius, leaving a body-width corridor instead of only a centre ray. Selection does not mutate scene instances. The choice follows roaming position, and angular damping maintains radius while changing sides. Negative clearance is exposed rather than claimed clear. New unit test verifies63 headings and the impossible sealed-ring case. Hosted pixels remain the gate.

## Reviewed preview evidence at05:48 IST Nov11

Latest implementation4804af4d78ade9a6389aad11e5df769452f7760d is available as draft stacked PR83 https://github.com/rajeshceg3/BambooForest/pull/83, base fix/cheap-tier-visuals. Exact successful preview https://bamboo-forest-5qspf58tq-rajeshceg3s-projects.vercel.app served assets/index-68f1f8ef.js. PR82 remains OPEN/unmerged. Nothing merged or promoted.

The follow-camera now scores48 sightlines against actual existing stalk matrices. It preserves5.5m distance, settles immediately after zone-instance changes, then damps angle using wall delta. Among unobstructed choices it prefers a side view. The target is below the root by0.9m to leave clear desktop card space. Earlier fixed-camera and rear/occluded passes are rejected. No vegetation instances removed.

Actual hosted390x844 normal Enter/Guided Tour/three Next actions reached step3. Inspected settled capture cloud-browser-20261111-001723.png: full side animal, muzzle/ears, torso/neck continuous, legs and hooves visible above readable card, no foreground stalk occluding body. Same actual tour resized to1365x768 gave cloud-browser-20261111-001754.png, likewise visible; this is resize coverage, not an independent desktop entry. Readback ULTRA_LOW,5993 bambooReady, ALERT root7.776,0,-6.547, all four hoof bottoms-0.0100, view clearance0.269. Console read held only keepalive info. Local actual walk/alert contact sheet and phone three-frame walk sheet inspected and sent for visual review.

Full suite passed before latest push: lint, build, test-workers.cjs, test-deer.cjs, test-deer-view.cjs, animation-bounds.cjs, stream-axis.cjs. Foot40000 samples support grounding. View test63 headings support radius/clearance handling. Neither replaces pixels.

Independent1365 normal entry reached Clearing and Ancient Guardian. Advance toward Flowing Reflection met repeated30s JS/AX deadlines, then daemon wait timed out and page read about:blank. That journey is NOT a pass, and the cause is not established as a renderer crash. Browser session closed after evidence. Candidate and this deviation were reported for review. Graze, final reduced-motion/full journey, physical-device/performance, foliage/bank/quadrants and reviewer visual acceptance remain open.
