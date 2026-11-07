# NBA 2K27 Realistic Project — Mobile Prototype v0.1

This is an early 2D mobile-control prototype, not a finished 3D NBA simulation.

## Included
- Touch virtual joystick
- PASS, SHOOT, DRIVE, DEFEND buttons
- Basic player movement and defender pursuit
- Simplified ball launch and scoring
- PWA manifest and service worker for install/offline caching when hosted over HTTPS

## Run
Open `index.html` in a modern mobile browser for a basic local test.

## Install as an app
PWA installation and offline caching require HTTPS hosting (for example GitHub Pages). After hosting:
1. Open the HTTPS site in Chrome on Android.
2. Open the browser menu.
3. Choose **Install app** or **Add to Home screen**.

## Known prototype limitations
- 2D top-down prototype, not 3D.
- Simplified pass/shoot physics and scoring.
- No official NBA assets, player likenesses, teams, or licensed branding.
- Not yet a rules-compliant basketball simulation.
- No verified Android APK build yet.

Next milestones: improve possession/shot physics, add teammate passing, implement proper court boundaries and shot clock, then move to a 3D engine/cloud build pipeline.

## Advanced realism roadmap

The proposed broadcast cameras, instant replay, commentary/audio, living arena, player/ball details, TV scoreboard, and mobile optimization architecture are documented in [`docs/ADVANCED_REALISM_ROADMAP.md`](docs/ADVANCED_REALISM_ROADMAP.md). These are planned systems, not features already implemented in v0.1.
