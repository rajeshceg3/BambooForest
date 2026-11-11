# Sound

Bamboo user-visible sound.

## Sub-features

Muted entry; unmute; zone mix; mute again.

## How to get to it (user POV)

Enter normally, then choose Unmute.

## Driving it with Playwright

Preconditions: fresh public Bamboo context, correct build, expected initialized forest.

Use exactUnmute/Mute UI. Passively observe AudioContext state and real output/analyser signal. Stream should increase its stream stem after crossfade. Muting suspends context and stops its clock.

## Gotchas

A suspended analyser retains its last nonzero sample, not live sound. Do not call residual buffer audible. Signal proof is not listening-quality proof.
