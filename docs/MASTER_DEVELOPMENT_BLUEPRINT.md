# NBA 2K27 Realistic Project — Master Development Blueprint

## Product target
A mobile-first basketball simulation that grows from the existing 2D canvas prototype into a 3D basketball game with broadcast-style presentation. The current 2D game remains the stable playable baseline while the 3D client is developed separately.

## Technology
- Current playable baseline: HTML Canvas, JavaScript, PWA.
- 3D foundation: Three.js + TypeScript + Vite.
- Later high-end option: evaluate Unity only after the 3D prototype proves the gameplay and asset pipeline.
- Simulation must remain independent of rendering and audio.

## Architecture rules
1. MatchState is authoritative for score, clocks, fouls, possession, roster, fatigue, and player statistics.
2. Simulation emits typed semantic events. Presentation systems subscribe; they do not invent gameplay outcomes.
3. Use a fixed simulation timestep and render interpolation.
4. All expensive systems have budgets: crowd LOD, pooled effects, limited active audio voices, and distance-based animation updates.
5. Every feature must degrade gracefully on low-end Android devices.
6. Keep current root index.html unchanged while the separate 3D client is developed in /prototype3d.

## Repository structure
```text
/
  index.html
  manifest.webmanifest
  sw.js
  icon.svg
  docs/
    ADVANCED_REALISM_ROADMAP.md
    MASTER_DEVELOPMENT_BLUEPRINT.md
  prototype3d/
    package.json
    tsconfig.json
    src/
      core/
      simulation/
      camera/
      audio/
      arena/
      effects/
      ui/
      i18n/
      performance/
```

## 1. Camera, replay, and media crew
Camera modes: 2K sideline follow, Broadcast high sideline, Drive trailing, Nosebleed overview, Rim close-up, and Player POV. Each profile has offset, FOV, damping, and allowed trigger conditions. Use exponential damping: alpha = 1 - exp(-k * dt). A camera transition has a cooldown and priority so a normal pass cannot interrupt a dunk or replay.

360-degree orbit uses yaw and pitch around a focus point. Clamp pitch and radius; preserve court readability and keep the ball handler inside a safe frame. Trigger Drive Cam on a fast-break event and Rim Cam only for selected dunk/replay moments.

Replay buffer: retain 8–12 seconds of compact snapshots at 15–30 samples/second. Store player transforms, ball transform, animation IDs, and game clock—not cloned meshes or full scenes. Freeze a selected segment, play at normal or slow speed, then restore the live camera and simulation presentation state.

Media crew: use a few reusable rigs in baseline safety zones. Cameramen rotate/aim upper body toward the ball. Floor sweepers are activated by DeadBall plus a floor-wet marker, follow a short path, play a mop animation, and return to an object pool. They never enter active player collision zones.

## 2. Audio and commentary
Separate Play-by-Play, Color Commentary, Arena PA, and SFX. Use typed events and a priority queue. Priority example: buzzer-beater > dunk > confirmed made shot > shooting foul > turnover > routine pass. Cooldowns prevent repetitive lines. Color commentary is delayed to avoid voice overlap. Commentary must only describe confirmed simulation outcomes.

Tagalog and English use separate original text/audio banks. Never imitate a real commentator or use unlicensed broadcast recordings. Stream longer voice clips; cap simultaneous voices and duck crowd ambience under commentary.

## 3. Living arena
Crowd tiers:
- Near court: small number of full rigs and expressive animations.
- Mid stands: instanced rigs with a small animation palette.
- Far stands: low-poly clusters, baked motion, or crowd cards.

ArenaMood is a normalized 0–1 value derived from event importance, home/away context, score margin, and remaining time. Crowd response changes cheer, boo, stand, wave, and timeout dance weights. Do not run full AI for every spectator.

Bench players use pooled finite states: seated, stand, clap, celebrate, disappointed. Coach states: observe, signal play, protest, timeout huddle. RotationManager uses stamina, foul trouble, position/role, substitution eligibility, and lineup constraints. Starting Five is data-driven and works for any fictional/custom roster.

## 4. Ball, net, sweat, and floor
Use a fixed timestep. Ball integration:
- v += gravity * dt
- p += v * dt
- On ground contact: vY = -restitution * vY
- Apply horizontal friction to XZ velocity.
Use a physics library only when collision complexity warrants it. Keep a stable engine-independent BallState interface.

Net animation receives a contact impulse from a made shot, deforms, then damps toward rest. Sweat increases with exertion and minutes played; represent it first through material roughness/specular changes and only add sparse droplets for close cameras. Wet floor is a localized timed patch; sweeper animation responds during dead ball.

## 5. Broadcast HUD and bilingual settings
One MatchState feeds the scoreboard: team labels/marks, score, period, game clock, 24/14-second shot clock, team fouls, possession, and timeout count. Player stat cards appear after timeout, substitution, or free throw. Stats are read from PlayerStats; UI never maintains duplicate counters.

Localization uses stable keys, e.g. GAME_START, SHOT_MADE, TIMEOUT, SETTINGS_LANGUAGE. The language setting changes all UI strings and commentary selection. Keep Tagalog and English dictionaries complete and fall back to English if a key is missing.

Touch controls: left virtual stick; right-side Pass, Shoot, Drive, Steal, Block, and context-sensitive action. Support multitouch pointer IDs, safe-area insets, adjustable button scale, and remappable controls.

## 6. Performance budget
- Crowd: GPU instancing for repeated geometry/materials; use a few animation variants.
- LOD: full rigs near court, reduced rigs mid-stands, cards/clusters far away.
- Culling: skip off-screen and distant animation updates.
- Pool: particles, droplets, audio emitters, crew, and temporary UI.
- Fixed simulation: 60 Hz initially; render independently, with interpolation.
- Mobile baseline: stable 30 FPS on supported mid-range Android before targeting 60.
- Quality levels: Low/Balanced/High; dynamically reduce render scale, shadow map resolution, crowd update rate, and effects count.
- Bake static arena lighting; reserve real-time shadows for near players and ball.
- Measure frame time, memory, thermal behavior, and resume-from-background on real devices.

## 7. Delivery milestones and acceptance checks
1. Keep 2D v0.1 stable; create isolated 3D Vite client.
2. 3D half-court, one controllable player, orbit/follow camera.
3. Ball possession, dribble, pass, shot, rim/backboard collision.
4. Camera presets and event-triggered camera director.
5. Fixed-timestep replay snapshots and scoreboard fed by MatchState.
6. Original SFX, commentary queue, Tagalog/English UI.
7. Crowd instancing, bench/coach reactions, starting five and rotations.
8. Media crew, dead-ball sweeper, net and sweat effects.
9. Android performance profiling and quality scaling.

A milestone is complete only after a reproducible build and a real Android test. The present repository contains a 2D prototype and design/starter code; it is not yet a complete 3D game or APK.
