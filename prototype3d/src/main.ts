import * as THREE from "three";
import { BallPhysics } from "./simulation/BallPhysics.ts";
import { FixedStepRunner } from "./core/FixedStepRunner.ts";
import { PlayerController } from "./controller/PlayerController.ts";
import { CameraDirector, type CameraMode } from "./camera/CameraDirector.ts";

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
const skin = new THREE.MeshStandardMaterial({ color: "#a96f4c", roughness: 0.82 });
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

const playerController = new PlayerController(player, {
  moveSpeed: 3.8,
  sprintMultiplier: 1.45,
  turnSpeed: 10
});

const ball = new THREE.Mesh(
  new THREE.SphereGeometry(0.12, 24, 16),
  new THREE.MeshStandardMaterial({ color: "#d87924", roughness: 0.72 })
);
scene.add(ball);
const ballPhysics = new BallPhysics();
ballPhysics.launch(new THREE.Vector3(0, 2.2, 0), new THREE.Vector3(1.2, 2.8, 0.2));

const fixedStep = new FixedStepRunner(60);
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

function makeControl(label: string): HTMLDivElement {
  const el = document.createElement("div");
  el.textContent = label;
  el.style.cssText = "display:flex;align-items:center;justify-content:center;color:white;font:700 12px Arial;user-select:none;-webkit-user-select:none;touch-action:none";
  return el;
}

// Mobile virtual joystick.
const stickBase = makeControl("");
stickBase.style.cssText += ";position:fixed;left:24px;bottom:28px;width:124px;height:124px;border:2px solid #ffffff88;border-radius:50%;background:#101a2a88";
const stickKnob = makeControl("");
stickKnob.style.cssText += ";width:48px;height:48px;border-radius:50%;background:#ffffffcc;box-shadow:0 2px 12px #0008";
stickBase.appendChild(stickKnob);
root.appendChild(stickBase);

let stickPointer: number | null = null;
function updateStick(event: PointerEvent): void {
  const rect = stickBase.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = event.clientX - cx;
  const dy = event.clientY - cy;
  const max = 43;
  const length = Math.hypot(dx, dy);
  const scale = length > max ? max / length : 1;
  const px = dx * scale;
  const py = dy * scale;
  stickKnob.style.transform = `translate(${px}px, ${py}px)`;
  joystickX = px / max;
  joystickZ = py / max;
}
stickBase.addEventListener("pointerdown", (event) => {
  stickPointer = event.pointerId;
  stickBase.setPointerCapture(event.pointerId);
  updateStick(event);
});
stickBase.addEventListener("pointermove", (event) => {
  if (event.pointerId === stickPointer) updateStick(event);
});
function releaseStick(event: PointerEvent): void {
  if (event.pointerId !== stickPointer) return;
  stickPointer = null;
  joystickX = 0;
  joystickZ = 0;
  stickKnob.style.transform = "translate(0px, 0px)";
}
stickBase.addEventListener("pointerup", releaseStick);
stickBase.addEventListener("pointercancel", releaseStick);

const sprintButton = makeControl("SPRINT");
sprintButton.style.cssText += ";position:fixed;right:26px;bottom:42px;width:76px;height:76px;border-radius:50%;border:2px solid #ffffff99;background:#b33a32dd;box-shadow:0 3px 12px #0008";
sprintButton.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  sprintHeld = true;
});
const stopSprint = (): void => { sprintHeld = false; };
sprintButton.addEventListener("pointerup", stopSprint);
sprintButton.addEventListener("pointercancel", stopSprint);
sprintButton.addEventListener("lostpointercapture", stopSprint);
root.appendChild(sprintButton);

window.addEventListener("keydown", (event) => {
  keys.add(event.code);
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) event.preventDefault();
});
window.addEventListener("keyup", (event) => keys.delete(event.code));
window.addEventListener("blur", () => { keys.clear(); sprintHeld = false; });

function readInput(): void {
  const keyboardX = Number(keys.has("KeyD") || keys.has("ArrowRight")) - Number(keys.has("KeyA") || keys.has("ArrowLeft"));
  const keyboardZ = Number(keys.has("KeyS") || keys.has("ArrowDown")) - Number(keys.has("KeyW") || keys.has("ArrowUp"));
  const useKeyboard = keyboardX !== 0 || keyboardZ !== 0;
  const x = useKeyboard ? keyboardX : joystickX;
  const z = useKeyboard ? keyboardZ : joystickZ;
  const sprint = sprintHeld || keys.has("ShiftLeft") || keys.has("ShiftRight");
  playerController.setInput(x, z, sprint);
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
  playerController.update(dt);
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
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();
