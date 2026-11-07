# NBA 2K27 Realistic Project — Advanced Realism Roadmap

> Scope: original, fictional basketball game assets and teams. This is a technical target, not a claim that the current prototype already has these features. Current build remains a lightweight 2D canvas prototype.

## Architecture decision

Keep the existing browser prototype as the playable baseline. Introduce a separate Three.js + TypeScript 3D client in stages. Keep simulation state independent from rendering so camera, crowd, audio, and effects can be optimized or replaced without changing basketball rules.

Suggested modules:

```text
src/
  app/              GameApp, SceneBootstrap, AssetRegistry
  core/             EventBus, GameClock, FixedTimestep, ObjectPool
  simulation/       MatchState, PlayerState, BallPhysics, Rules, RotationManager
  camera/           CameraDirector, CameraMode, ReplayController
  presentation/     BroadcastDirector, Scoreboard, PlayerStatCard
  audio/            AudioDirector, CommentaryQueue, ArenaPA
  arena/            CrowdManager, BenchManager, CoachManager, MediaCrew
  effects/          SweatController, FloorWetness, NetAnimator, DustFX
  ui/               TouchControls, BroadcastHUD, PauseMenu
  performance/      LODManager, VisibilityCuller, QualityScaler
```

## Event-driven game logic

Gameplay systems publish semantic events. Presentation systems subscribe to them; they should not poll every player every frame.

Core event examples:
- `PossessionChanged`
- `ShotReleased`, `ShotMade`, `ShotMissed`
- `DunkStarted`, `DunkFinished`
- `FoulCalled`, `FreeThrowStarted`
- `TimeoutStarted`, `QuarterEnded`, `BuzzerBeater`
- `SubstitutionStarted`, `PlayerFatigueChanged`

### TypeScript event bus starter

```ts
type GameEvents = {
  ShotMade: { shooterId: string; points: 2 | 3; clutch: boolean };
  DunkStarted: { playerId: string; defenderId?: string };
  FoulCalled: { playerId: string; shooting: boolean };
  DeadBall: { reason: "out" | "foul" | "timeout" | "quarter" };
  PossessionChanged: { teamId: string };
};

type Handler<T> = (payload: T) => void;
class EventBus<E extends Record<string, unknown>> {
  private listeners = new Map<keyof E, Set<Handler<any>>>();
  on<K extends keyof E>(event: K, fn: Handler<E[K]>) {
    const set = this.listeners.get(event) ?? new Set();
    set.add(fn); this.listeners.set(event, set);
    return () => set.delete(fn);
  }
  emit<K extends keyof E>(event: K, payload: E[K]) {
    this.listeners.get(event)?.forEach(fn => fn(payload));
  }
}
export const gameEvents = new EventBus<GameEvents>();
```

## 1. Broadcast cameras and media crew

### Camera modes

Create a `CameraDirector` with named profiles, each containing a target, offset, field of view, damping, and transition duration:
- **2K Cam:** elevated sideline follow, sees ball and half-court spacing.
- **Broadcast:** high sideline angle with stable framing and scoreboard-safe composition.
- **Drive Cam:** lower trailing camera, activated on a fast break or drive.
- **Nosebleed:** high, wide arena overview.
- **Rim Cam:** short-lived goal-side angle for selected dunk/replay moments.
- **Player POV:** shoulder/eye-level view, optional accessibility/immersion mode.

Use smooth interpolation (damped spring or lerp) rather than snapping. Keep a safe framing rectangle around the ball handler, ball, and nearest defender. Avoid changing cameras every possession; use cooldowns and event priority.

### Camera director starter

```ts
import * as THREE from "three";
type CameraMode = "2k" | "broadcast" | "drive" | "nosebleed" | "rim" | "playerPOV";
type CameraProfile = { offset: THREE.Vector3; fov: number; damping: number };

const profiles: Record<CameraMode, CameraProfile> = {
  "2k":        { offset: new THREE.Vector3(0, 15, 12), fov: 48, damping: 5 },
  broadcast:   { offset: new THREE.Vector3(0, 21, 4),  fov: 42, damping: 3 },
  drive:       { offset: new THREE.Vector3(-7, 5, 5), fov: 58, damping: 8 },
  nosebleed:   { offset: new THREE.Vector3(0, 34, 0),  fov: 38, damping: 2 },
  rim:         { offset: new THREE.Vector3(4, 5, 7),   fov: 62, damping: 7 },
  playerPOV:   { offset: new THREE.Vector3(0, 2, -1), fov: 76, damping: 10 }
};

export class CameraDirector {
  mode: CameraMode = "broadcast";
  constructor(private camera: THREE.PerspectiveCamera) {}
  setMode(mode: CameraMode) { this.mode = mode; }
  update(dt: number, target: THREE.Vector3) {
    const p = profiles[this.mode];
    const desired = target.clone().add(p.offset);
    const alpha = 1 - Math.exp(-p.damping * dt);
    this.camera.position.lerp(desired, alpha);
    this.camera.lookAt(target);
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, p.fov, p.damping, dt);
    this.camera.updateProjectionMatrix();
  }
}
```

For 360-degree camera control, orbit around a target anchor, but clamp vertical angle and distance so the court stays readable. Drive/dunk camera cuts are triggered by gameplay events, not random frame conditions.

### Instant replay

Record a rolling 8–12 second buffer of compact transforms (position, rotation, ball position, animation state, game clock) at 15–30 samples/second. On a clutch shot, buzzer beater, dunk, or shooting foul, freeze a replay snapshot and play it at normal speed or slow motion from a replay camera. Do not clone the entire live scene. Reuse the same actors and restore live state after replay.

### Media crew and floor sweepers

Use a small number of reusable cameraman/sweeper rigs with authored animation clips. Cameramen stay in safe baseline zones and track the play with head/upper-body aim offsets. Sweepers activate only after a dead-ball event, follow a short spline to the marked wet spot, play a sweep animation, then return to a pooled idle state. Never let crew collide with active players or the ball.

## 2. Commentary, PA and audio

Separate commentary into:
- **Play-by-play:** immediate factual call for the current action.
- **Color:** tactical/context reaction, delayed slightly so voices do not overlap.
- **Arena PA:** lineup introductions, substitutions, free throws, announcements.
- **SFX:** dribble, rim, net, whistle, shoes, crowd swell, buzzer.

Use a priority queue and cooldowns. Example priorities: buzzer-beater > made shot > dunk > foul > ordinary pass. Add a line only when its preconditions are true (e.g. a three-pointer must be confirmed as three points). Avoid repeating the same call within a short window.

```ts
type AudioCue = { id: string; priority: number; cooldownMs: number; clip: string };
class CommentaryQueue {
  private lastPlayed = new Map<string, number>();
  private queue: AudioCue[] = [];
  enqueue(cue: AudioCue) {
    const now = performance.now();
    if (now - (this.lastPlayed.get(cue.id) ?? -Infinity) < cue.cooldownMs) return;
    this.queue.push(cue);
    this.queue.sort((a, b) => b.priority - a.priority);
  }
  next(): AudioCue | undefined {
    const cue = this.queue.shift();
    if (cue) this.lastPlayed.set(cue.id, performance.now());
    return cue;
  }
}
```

Start with original placeholder voice clips and sound effects. Use licensed or user-created audio only; do not imitate real commentators or use unlicensed broadcast recordings.

## 3. Crowd, bench, coach and rotations

Crowd tiers:
1. Near-court crowd: a limited set of full animated 3D characters.
2. Mid-tier: instanced characters with a few looping animation variations.
3. Far stands: low-poly clusters, baked animation, or crowd cards.

Crowd response is driven by an `ArenaMood` value (0–1), score margin, time remaining, home/away possession, and event type. A clutch home shot raises cheer intensity; a large deficit can shift some sections to subdued/boo states. Avoid simulating every spectator as a full AI agent.

Bench/coach system:
- Bench players use low-cost idle/reaction states: seated, stand, clap, celebrate, disappointed.
- Coach uses a small finite-state machine: coach, signal play, protest, timeout huddle.
- Rotation manager tracks stamina, fouls, role, substitution eligibility, and lineup constraints.
- Starting Five is a presentation sequence driven by the team's lineup data; the same system supports any fictional/custom team roster.

## 4. Ball, net, sweat and surface details

Ball physics should run at a fixed simulation timestep, independent of render frame rate. Use gravity, collision restitution, friction, spin, and controlled hand/ground constraints. A 3D physics library can be introduced later; keep the ball interface engine-independent.

Net animation should react to ball/net contact impulses, then damp back to rest. Sweat is a material/effect progression based on player exertion and minutes played, not a constant expensive particle stream. Use roughness/specular changes, small normal-map variation, and sparse droplets only for close-up camera shots. Wet-floor patches are localized and temporary; sweepers respond to those patches during dead balls.

## 5. Broadcast scoreboard and player stats

Keep scoreboard values sourced from one authoritative `MatchState`, not separately maintained UI counters. Render the TV overlay as HTML/CSS or a lightweight Three.js overlay:
- Home/away team names and original team marks
- Score, period, game clock, shot clock
- Team fouls and possession indicator
- Optional timeout count
- Player stat card after free throws, substitutions, and timeouts

For any real-person player names/statistics, use only properly licensed data or user-supplied fictional roster data. The example below is a fictional placeholder.

```ts
type PlayerStats = { points: number; assists: number; rebounds: number; steals: number };
function formatStatLine(name: string, s: PlayerStats) {
  return `${name}  |  ${s.points} PTS  ${s.assists} AST  ${s.rebounds} REB`;
}
// Example fictional roster entry:
const sample = formatStatLine("J. Carter", { points: 25, assists: 8, rebounds: 6, steals: 2 });
```

## 6. Performance rules for mobile

- **LOD:** full rigs only near the court; mid/low rigs in the stands.
- **Instancing:** reuse geometry/materials for crowd, seats, lights, and repeated props.
- **Pooling:** reuse particles, sweat droplets, towels, and temporary effects.
- **Culling:** do not update off-screen or distant characters every frame.
- **Animation budget:** stagger crowd updates; update far crowd at a lower rate.
- **Fixed timestep:** simulation at a stable step; render independently with interpolation.
- **Dynamic resolution:** lower render scale and shadow quality when frame time rises.
- **Shadows:** reserve real-time shadows for players/ball near the action; bake arena lighting.
- **Textures:** compress textures, use atlases, mipmaps, and sensible texture sizes.
- **Audio:** stream longer commentary clips; pool short SFX voices and cap simultaneous sounds.
- **Quality presets:** Low / Balanced / High, selected using device capability and measured frame time.

Target a stable 30 FPS baseline on supported mid-range phones before attempting 60 FPS. Measure on actual Android devices; do not infer performance from desktop testing.

## 7. Integration order and acceptance checks

1. Build a 3D half-court and one controllable player; keep current 2D prototype available.
2. Add ball possession, dribble, pass, shot and hoop collision.
3. Add camera profiles and manual switching.
4. Add event-driven scoreboard and replay buffer.
5. Add original SFX and a small commentary cue set.
6. Add instanced crowd, bench reactions and coach.
7. Add media crew and dead-ball sweeper behavior.
8. Add sweat/net/floor effects and quality scaling.

Each milestone must have a mobile test build or HTTPS playable sample. Verify touch input, portrait/landscape behavior, thermals, memory, frame pacing, and recovery from background/resume. No milestone is considered complete until tested on a real Android phone.

## Current status

- Existing repository build: 2D canvas prototype v0.1.
- This document: proposed architecture and starter logic only.
- Not yet implemented: 3D camera, replay, commentary, crowd, bench, sweat, net physics, full TV scoreboard, APK.
