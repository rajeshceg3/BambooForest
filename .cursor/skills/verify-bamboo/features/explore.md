# Explore and look

Bamboo user-visible explore and look.

## Sub-features

Entry; ambience/density settings; touch and mouse look; Reset view.

## How to get to it (user POV)

Choose Enter. Zone buttons are Grove, Clearing, Stream, Deep Forest on phone and Go to NAME on desktop.

## Driving it with Playwright

Preconditions: fresh public Bamboo context, correct build, expected initialized forest.

Use exact accessible names. Real CDP touch starts in right70percent;360,180 to79.5,180 gives roughly90degrees. Three swipes cross pi. Read resulting cameraRotation and actual screenshots. Reset view must return18,2,-10 with0pitch/yaw.

## Gotchas

Full counts must be installed. A foreground stalk is not renderer failure. Mouse pointerlock makes resetting pointer position an opposite input. Four settings are not four physical locations.
