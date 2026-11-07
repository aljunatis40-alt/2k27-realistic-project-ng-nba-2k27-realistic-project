import * as THREE from "three";
import { PlayerFatigueEngine } from "../simulation/PlayerFatigueEngine.ts";

export interface SweatParticleOptions {
  capacity?: number;
  baseEmissionRate?: number;
  maximumFatigueEmissionRate?: number;
  sweatActivationThresholdPercent?: number;
}

/**
 * Lightweight procedural sweat droplets attached to a player root.
 * Uses one Points draw call and a fixed-size buffer for mobile performance.
 */
export class SweatParticleEngine {
  readonly object: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  private readonly positions: Float32Array;
  private readonly velocities: THREE.Vector3[];
  private readonly ages: Float32Array;
  private readonly lifetimes: Float32Array;
  private readonly capacity: number;
  private readonly maxEmissionRate: number;
  private readonly threshold: number;
  private emissionAccumulator = 0;
  private cursor = 0;
  private disposed = false;

  constructor(
    private readonly playerRoot: THREE.Object3D,
    private readonly fatigue: PlayerFatigueEngine,
    options: SweatParticleOptions = {}
  ) {
    this.capacity = Math.max(8, Math.floor(options.capacity ?? 96));
    this.maxEmissionRate = Math.max(0, options.maximumFatigueEmissionRate ?? 45);
    this.threshold = THREE.MathUtils.clamp(options.sweatActivationThresholdPercent ?? 0.35, 0, 0.99);
    this.positions = new Float32Array(this.capacity * 3);
    this.ages = new Float32Array(this.capacity);
    this.lifetimes = new Float32Array(this.capacity);
    this.velocities = Array.from({ length: this.capacity }, () => new THREE.Vector3());
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xb9e8ff,
      size: 0.045,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      sizeAttenuation: true
    });
    this.object = new THREE.Points(geometry, material);
    this.object.frustumCulled = false;
    this.object.visible = false;
    this.playerRoot.add(this.object);
  }

  update(deltaSeconds: number): void {
    if (this.disposed) return;
    const dt = Math.min(Math.max(deltaSeconds, 0), 0.05);
    const fatiguePercent = THREE.MathUtils.clamp(this.fatigue.fatiguePercentage, 0, 1);
    if (fatiguePercent < this.threshold) {
      this.object.visible = false;
      this.emissionAccumulator = 0;
      this.clearParticles();
      return;
    }

    this.object.visible = true;
    const scale = (fatiguePercent - this.threshold) / (1 - this.threshold);
    const emissionRate = THREE.MathUtils.lerp(0, this.maxEmissionRate, scale);
    this.emissionAccumulator += emissionRate * dt;
    while (this.emissionAccumulator >= 1) {
      this.emitOne();
      this.emissionAccumulator -= 1;
    }

    for (let i = 0; i < this.capacity; i++) {
      if (this.ages[i] >= this.lifetimes[i]) continue;
      this.ages[i] += dt;
      const velocity = this.velocities[i];
      velocity.y -= 2.8 * dt;
      this.positions[i * 3] += velocity.x * dt;
      this.positions[i * 3 + 1] += velocity.y * dt;
      this.positions[i * 3 + 2] += velocity.z * dt;
      if (this.ages[i] >= this.lifetimes[i]) {
        this.positions[i * 3 + 1] = -1000;
      }
    }
    const attribute = this.object.geometry.getAttribute("position") as THREE.BufferAttribute;
    attribute.needsUpdate = true;
  }

  private emitOne(): void {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.capacity;
    // Emit near the head/shoulder line; points remain in the player's local space.
    this.positions[i * 3] = THREE.MathUtils.randFloat(-0.24, 0.24);
    this.positions[i * 3 + 1] = THREE.MathUtils.randFloat(1.25, 1.62);
    this.positions[i * 3 + 2] = THREE.MathUtils.randFloat(-0.12, 0.12);
    this.velocities[i].set(
      THREE.MathUtils.randFloat(-0.08, 0.08),
      THREE.MathUtils.randFloat(-0.25, -0.05),
      THREE.MathUtils.randFloat(-0.08, 0.08)
    );
    this.ages[i] = 0;
    this.lifetimes[i] = THREE.MathUtils.randFloat(0.35, 0.8);
  }

  private clearParticles(): void {
    for (let i = 0; i < this.capacity; i++) {
      this.ages[i] = this.lifetimes[i] = 0;
      this.positions[i * 3 + 1] = -1000;
    }
    (this.object.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.playerRoot.remove(this.object);
    this.object.geometry.dispose();
    this.object.material.dispose();
  }
}
