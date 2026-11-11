# Guided tour

Bamboo user-visible guided tour.

## Sub-features

Start; five stops; Previous; Exit Tour; Finish Tour.

## How to get to it (user POV)

Choose Enter, then Guided Tour.

## Driving it with Playwright

Preconditions: fresh public Bamboo context, correct build, expected initialized forest.

Use normal buttons, not internal tour setters. At each Next wait for correctstep and realworker counts, then inspect saved pixels: Clearing4495, Guardian4994, Stream4794, Deer5993, Ascent4994. Capture reachable action and result. Finish returns exploration.

## Gotchas

Camera telemetry alone cannot certify visual readiness. Deer moves in normalmotion, requires realposition/clearance. RapidNext finalframing proof is not a fulljourney pass. Original desktopfulljourney stillpending.
