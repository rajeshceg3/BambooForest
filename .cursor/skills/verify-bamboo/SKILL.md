---
name: verify-bamboo
description: Drive Bamboo Forest through real browser entry, zone settings, guided tour, touch look and sound; measure frame times and preserve visual evidence.
---
# Verify Bamboo Forest

## Launch
Run npm ci when dependencies are absent. Run npm run dev -- --host 127.0.0.1 --port4187. Capture the launched PID and its Vite ready log. No database, account or private seed is needed. Each browser run uses an isolated context. To verify a built version use npm run build then npm run preview -- --host 127.0.0.1 --port4187. Do not double-drive a shared page.

## Doctor
Read package.json scripts, git rev-parse HEAD and the Vite log. Fetch the root and require the Bamboo Forest title and moduleasset. In the browser require a canvas and bambooReady4994 after normal Enter. If verifying hosted code, compare the fetched asset SHA256 against the build. A healthy HTTP response alone is not scene readiness.

## Drive
Use Playwright with actual Chromium, at390x844/mobile/hasTouch first, then1365x768 independently. Enter via getByRole('button',{name:/^Enter$/i}) focus and keyboard Enter, or genuine touchscreen/mouse at its bounds when animated stability blocks it. Guided Tour and Next Step use exact accessible names. Read features/README.md before choosing the path. Use scripts/phone-performance.mjs with BASE_URL and EVIDENCE_DIR for performance baseline. It starts its own local instance unless BASE_URL points to an existing target.

## Evidence
Exercise real UI, not internal setters. Store action logs, viewport, motion preference, observed renderer, initialized counts, screenshots and frame-window JSON in the evidence directory. Inspect actual screenshots. fps from a software renderer is not a phone-device fps claim. Analytical/model passes do not replace actual journeys. Process deadlines are not renderer death. Report every skipped or failed feature/entry path. Normal motion and reduced motion are different runs. Zone buttons change ambience/density at the existing camera, not physical location. A resize capture is not independent desktop entry. Any temporary subsystem removal is isolation only, never a passing product fix.

## Cleanup
The helper closes its own browser and terminates only its own Vite process. Preserve evidence after cleanup. Do not kill by process name or delete artifacts.

## Helpers
node .cursor/skills/verify-bamboo/scripts/phone-performance.mjs
BASE_URL=https://ccb0614e.bambooforest-preview.pages.dev/ EVIDENCE_DIR=/tmp/bamboo-proof node .cursor/skills/verify-bamboo/scripts/phone-performance.mjs
