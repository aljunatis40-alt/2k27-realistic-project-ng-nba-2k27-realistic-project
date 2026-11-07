import * as THREE from "three";
import { BallPhysics } from "./simulation/BallPhysics.ts";
import { FixedStepRunner } from "./core/FixedStepRunner.ts";

const root = document.querySelector<HTMLDivElement>("#app");
if (!root) throw new Error("Missing #app root");

const scene = new THREE.Scene();
scene.background = new THREE.Color("#101a2a");

const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 6, 10);
camera.lookAt(0, 1, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
root.appendChild(renderer.domElement);

const ambient = new THREE.HemisphereLight(0xffffff, 0x26344a, 2.0);
scene.add(ambient);
const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
keyLight.position.set(4, 9, 5);
scene.add(keyLight);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(15, 24),
  new THREE.MeshStandardMaterial({ color: "#b87943", roughness: 0.82 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
scene.add(floor);

const ball = new THREE.Mesh(
  new THREE.SphereGeometry(0.12, 24, 16),
  new THREE.MeshStandardMaterial({ color: "#d87924", roughness: 0.72 })
);
scene.add(ball);

const ballPhysics = new BallPhysics();
ballPhysics.launch(new THREE.Vector3(0, 2.2, 0), new THREE.Vector3(1.2, 2.8, 0.2));
const fixedStep = new FixedStepRunner(60);
const clock = new THREE.Clock();

const title = document.createElement("div");
title.textContent = "NBA 2K27 · 3D FOUNDATION TEST";
title.style.cssText = "position:fixed;top:env(safe-area-inset-top,12px);left:50%;transform:translateX(-50%);padding:9px 13px;border:1px solid #ffffff44;border-radius:12px;background:#101a2add;font-size:12px;font-weight:800;white-space:nowrap";
root.appendChild(title);

function resize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", resize);

function animate(): void {
  const dt = Math.min(clock.getDelta(), 0.1);
  fixedStep.update(dt, (step) => ballPhysics.step(step));
  ball.position.copy(ballPhysics.position);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();
