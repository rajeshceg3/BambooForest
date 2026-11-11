# Phone performance

Bamboo user-visible phone performance.

## Sub-features

Launch/doctor; startup; frame windows; touch response; before/after proof.

## How to get to it (user POV)

Use the helper from a fresh default scene.

## Driving it with Playwright

Preconditions: fresh public Bamboo context, correct build, expected initialized forest.

Run helper at390x844 normalmotion. Require actualEnter, full4994/8800/35126 and observedrenderer. Compare equivalentcamera/counts and multiple windows, store pixels and errors.

## Gotchas

Software-renderer results are scoped. Measure both normal/idle states and actualtouch. Never certify a frame-rate target from a model or subsystem-stripped diagnostic.
