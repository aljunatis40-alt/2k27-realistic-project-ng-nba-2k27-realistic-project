import * as THREE from "three";
import { BallPhysics } from "./simulation/BallPhysics.ts";
import { FixedStepRunner } from "./core/FixedStepRunner.ts";
import { PlayerController } from "./controller/PlayerController.ts";
import { CameraDirector, type CameraMode } from "./camera/CameraDirector.ts";
import { PlayerFatigueEngine } from "./simulation/PlayerFatigueEngine.ts";
import { AdvancedMovementController } from "./controller/AdvancedMovementController.ts";
import { OffensiveTeamAI, type OffensivePlayCall } from "./ai/OffensiveTeamAI.ts";
import { MobileTouchInputManager } from "./ui/MobileTouchInputManager.ts";
import { GraphicsQualityManager, type GraphicsPreset } from "./performance/GraphicsQualityManager.ts";
import { AudioMixerManager } from "./audio/AudioMixerManager.ts";

const root = document.querySelector<HTMLDivElement>("#app");
if (!root) throw new Error("Missing #app root");

const scene = new THREE.Scene();
scene.background = new THREE.Color("#101a2a");

const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 6, 10);
camera.lookAt(0, 1, 0);
const cameraDirector = new CameraDirector(camera);
cameraDirector.setMode("2k");

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.style.touchAction = "none";
root.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffffff, 0x26344a, 2.0));
const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
keyLight.position.set(4, 9, 5);
scene.add(keyLight);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(15, 24),
  new THREE.MeshStandardMaterial({ color: "#b87943", roughness: 0.82 })
);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// Simple placeholder player mesh; licensed player models and animations come later.
const player = new THREE.Group();
const jersey = new THREE.MeshStandardMaterial({ color: "#3d79c5", roughness: 0.68 });
const skin = new THREE.MeshPhysicalMaterial({ color: "#a96f4c", roughness: 0.45, clearcoat: 0, clearcoatRoughness: 0.35 });
const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.62, 5, 10), jersey);
torso.position.y = 0.88;
player.add(torso);
const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 16, 12), skin);
head.position.y = 1.48;
player.add(head);
const leftLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.105, 0.48, 4, 8), jersey);
leftLeg.position.set(-0.14, 0.28, 0);
player.add(leftLeg);
const rightLeg = leftLeg.clone();
rightLeg.position.x = 0.14;
player.add(rightLeg);
player.position.set(0, 0, 2.5);
scene.add(player);

const offBallTeammates: THREE.Group[] = [];
for (let i = 0; i < 4; i++) {
  const teammate = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.6, 5, 10), jersey);
  body.position.y = 0.86;
  const teammateHead = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 10), skin);
  teammateHead.position.y = 1.46;
  teammate.add(body, teammateHead);
  const legA = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.45, 4, 8), jersey);
  legA.position.set(-0.13, 0.27, 0);
  const legB = legA.clone();
  legB.position.x = 0.13;
  teammate.add(legA, legB);
  const startX = i < 2 ? (i === 0 ? -4.5 : 4.5) : (i === 2 ? -5.5 : 5.5);
  const startZ = i < 2 ? -1.5 : 3.8;
  teammate.position.set(startX, 0, startZ);
  scene.add(teammate);
  offBallTeammates.push(teammate);
}

const fatigueEngine = new PlayerFatigueEngine([skin], { maxStamina: 100, sprintBurnRate: 3.5, recoveryRate: 2.0 });

const playerController = new PlayerController(player, {
  moveSpeed: 5.2,
  sprintMultiplier: 1.5,
  turnSpeed: 10
});

const hoopPosition = new THREE.Vector3(0, 3.05, -10.5);
const rim = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.045, 10, 32), new THREE.MeshStandardMaterial({ color: "#e36b32", metalness: 0.55, roughness: 0.38 }));
rim.rotation.x = Math.PI / 2;
rim.position.copy(hoopPosition);
scene.add(rim);
const backboard = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.05, 0.08), new THREE.MeshStandardMaterial({ color: "#dce8ef", transparent: true, opacity: 0.72 }));
backboard.position.set(0, 3.85, -11.05);
scene.add(backboard);

const ball = new THREE.Mesh(
  new THREE.SphereGeometry(0.12, 24, 16),
  new THREE.MeshStandardMaterial({ color: "#d87924", roughness: 0.72 })
);
scene.add(ball);
const ballPhysics = new BallPhysics();
ballPhysics.launch(new THREE.Vector3(0, 2.2, 0), new THREE.Vector3(1.2, 2.8, 0.2));

const advancedMovement = new AdvancedMovementController(player, playerController, {
  hoopPosition,
  baseJogSpeed: 5.2,
  burstSprintSpeed: 7.8,
  crossoverDampeningFactor: 0.85,
  onBallRelease: (kind, origin) => {
    const target = hoopPosition.clone().sub(origin);
    const horizontal = new THREE.Vector3(target.x, 0, target.z).normalize();
    const velocity = kind === "dunk"
      ? new THREE.Vector3(horizontal.x * 3.2, 3.8, horizontal.z * 3.2)
      : new THREE.Vector3(horizontal.x * 7.2, 6.1, horizontal.z * 7.2);
    ballPhysics.launch(origin, velocity);
  }
});

const graphicsQuality = new GraphicsQualityManager({
  renderer,
  scene,
  keyLight,
  courtMaterial,
  playerRoots: [player, ...offBallTeammates]
});

const offensiveAI = new OffensiveTeamAI({
  ballCarrier: player,
  teammates: offBallTeammates,
  basketPosition: hoopPosition,
  moveSpeed: 3.9,
  arrivalRadius: 0.28
});

const fixedStep = new FixedStepRunner(120);
const clock = new THREE.Clock();
const keys = new Set<string>();
let sprintHeld = false;
let joystickX = 0;
let joystickZ = 0;

const title = document.createElement("div");
title.textContent = "NBA 2K27 · PLAYER MOVEMENT TEST";
title.style.cssText = "position:fixed;top:env(safe-area-inset-top,12px);left:50%;transform:translateX(-50%);padding:9px 13px;border:1px solid #ffffff44;border-radius:12px;background:#101a2add;color:white;font:800 12px Arial;white-space:nowrap;pointer-events:none";
root.appendChild(title);

// On-screen camera selector for the four requested viewing modes.
const cameraMenu = document.createElement("div");
cameraMenu.style.cssText = "position:fixed;top:48px;right:10px;display:flex;flex-wrap:wrap;justify-content:flex-end;gap:5px;max-width:230px;z-index:5";
const cameraModes: Array<{ label: string; mode: CameraMode }> = [
  { label: "2K", mode: "2k" },
  { label: "BROADCAST", mode: "broadcast" },
  { label: "NOSEBLEED", mode: "nosebleed" },
  { label: "RIM CAM", mode: "rim" }
];
for (const item of cameraModes) {
  const button = makeControl(item.label);
  button.style.cssText += ";min-height:34px;padding:0 9px;border:1px solid #ffffff88;border-radius:8px;background:#101a2add;font:700 10px Arial";
  button.addEventListener("click", () => {
    cameraDirector.setMode(item.mode);
    for (const child of Array.from(cameraMenu.children) as HTMLDivElement[]) {
      child.style.background = child === button ? "#b33a32" : "#101a2add";
    }
  });
  if (item.mode === "2k") button.style.background = "#b33a32";
  cameraMenu.appendChild(button);
}
root.appendChild(cameraMenu);

// Runtime graphics selector: Low / Medium / Ultra.
const qualityMenu = document.createElement("div");
qualityMenu.style.cssText = "position:fixed;top:92px;right:10px;display:flex;gap:5px;z-index:5";
const qualityOptions: Array<{ label: string; preset: GraphicsPreset }> = [
  { label: "LOW", preset: "MobileLow" },
  { label: "MED", preset: "MobileMedium" },
  { label: "ULTRA", preset: "NextGenUltra" }
];
for (const option of qualityOptions) {
  const button = makeControl(option.label);
  button.style.cssText += ";min-height:30px;padding:0 9px;border:1px solid #ffffff88;border-radius:8px;background:#101a2add;font:700 10px Arial";
  button.addEventListener("click", () => {
    graphicsQuality.applyGraphicsSettingsPreset(option.preset);
    for (const child of Array.from(qualityMenu.children) as HTMLDivElement[]) {
      child.style.background = child === button ? "#26734d" : "#101a2add";
    }
  });
  if (option.preset === "MobileMedium") button.style.background = "#26734d";
  qualityMenu.appendChild(button);
}
root.appendChild(qualityMenu);

// Persistent master, commentary, arena SFX and crowd audio controls.
const audioMixer = new AudioMixerManager();
audioMixer.createSettingsPanel(root);
const resumeAudio = () => { void audioMixer.resume(); };
root.addEventListener("pointerdown", resumeAudio, { once: true });
root.addEventListener("keydown", resumeAudio, { once: true });

const playbookMenu = document.createElement("div");
playbookMenu.style.cssText = "position:fixed;left:10px;top:48px;display:flex;flex-direction:column;gap:5px;z-index:5";
const playOptions: Array<{ label: string; play: OffensivePlayCall }> = [
  { label: "FIVE OUT", play: "FiveOutSpacing" },
  { label: "PICK & ROLL", play: "PickAndRoll" },
  { label: "BASELINE CUT", play: "BaselineCut" }
];
for (const option of playOptions) {
  const button = makeControl(option.label);
  button.style.cssText += ";min-width:92px;min-height:32px;padding:0 8px;border:1px solid #ffffff88;border-radius:8px;background:#101a2add;font:700 9px Arial";
  button.addEventListener("click", () => {
    offensiveAI.setPlay(option.play);
    for (const child of Array.from(playbookMenu.children) as HTMLDivElement[]) child.style.background = child === button ? "#26734d" : "#101a2add";
  });
  if (option.play === "FiveOutSpacing") button.style.background = "#26734d";
  playbookMenu.appendChild(button);
}
root.appendChild(playbookMenu);



function makeControl(label: string): HTMLDivElement {
  const el = document.createElement("div");
  el.textContent = label;
  el.style.cssText = "display:flex;align-items:center;justify-content:center;color:white;font:700 12px Arial;user-select:none;-webkit-user-select:none;touch-action:none";
  return el;
}

// Unified mobile controls.
const mobileInput = new MobileTouchInputManager(root, {
  onShoot: () => {
    advancedMovement.requestShot(mobileInput.isSprinting || keys.has("ShiftLeft") || keys.has("ShiftRight"));
  },
  onPass: () => {
    let receiver: THREE.Group | undefined;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const teammate of offBallTeammates) {
      const distance = player.position.distanceTo(teammate.position);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        receiver = teammate;
      }
    }
    if (receiver) {
      const origin = player.position.clone().add(new THREE.Vector3(0, 1.25, 0));
      const direction = receiver.position.clone().add(new THREE.Vector3(0, 1, 0)).sub(origin);
      const distance = direction.length();
      direction.normalize();
      ballPhysics.launch(origin, direction.multiplyScalar(Math.min(11, 5 + distance * 0.65)));
    }
  },
  onCrossover: () => { advancedMovement.triggerCrossover(); }
});

window.addEventListener("keydown", (event) => {
  keys.add(event.code);
  if (event.code === "KeyE") advancedMovement.triggerCrossover();
  if (event.code === "Space") advancedMovement.requestShot(keys.has("ShiftLeft") || keys.has("ShiftRight"));
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) event.preventDefault();
});
window.addEventListener("keyup", (event) => keys.delete(event.code));
window.addEventListener("blur", () => { keys.clear(); });

function readInput(): void {
  const keyboardX = Number(keys.has("KeyD") || keys.has("ArrowRight")) - Number(keys.has("KeyA") || keys.has("ArrowLeft"));
  const keyboardZ = Number(keys.has("KeyS") || keys.has("ArrowDown")) - Number(keys.has("KeyW") || keys.has("ArrowUp"));
  const useKeyboard = keyboardX !== 0 || keyboardZ !== 0;
  const touch = mobileInput.getMovementInputDirectionalVector();
  const x = useKeyboard ? keyboardX : touch.x;
  const z = useKeyboard ? keyboardZ : touch.z;
  const sprintRequested = mobileInput.isSprinting || keys.has("ShiftLeft") || keys.has("ShiftRight");
  const sprint = sprintRequested && fatigueEngine.canSprint;
  advancedMovement.setMovementInput(x, z, sprint);
}

function resize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", resize);

function animate(): void {
  const dt = Math.min(clock.getDelta(), 0.05);
  readInput();
  fatigueEngine.update(dt, playerController.input.sprint);
  advancedMovement.update(dt);
  offensiveAI.update(dt);
  player.position.x = THREE.MathUtils.clamp(player.position.x, -6.8, 6.8);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -10.8, 10.8);

  fixedStep.update(dt, (step) => ballPhysics.step(step));
  ball.position.copy(ballPhysics.position);

  const cameraFocus = ball.position.clone();
  if (cameraDirector.mode === "2k") {
    const handlerFocus = player.position.clone().add(new THREE.Vector3(0, 1, 0));
    cameraFocus.lerp(handlerFocus, 0.4);
  }
  cameraDirector.update(dt, cameraFocus);
  if (graphicsQuality.shouldRender(performance.now())) renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();
