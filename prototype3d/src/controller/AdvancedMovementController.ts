import * as THREE from "three";
import { PlayerController } from "./PlayerController.ts";

export type AdvancedGameplayState =
  | "IdleDribble"
  | "CrossoverDrive"
  | "InAirShot"
  | "DunkAnimationLoop";

export interface AdvancedMovementOptions {
  baseJogSpeed?: number;
  burstSprintSpeed?: number;
  crossoverDampeningFactor?: number;
  crossoverDuration?: number;
  shotDuration?: number;
  dunkDistance?: number;
  hoopPosition: THREE.Vector3;
  onBallRelease?: (kind: "jump-shot" | "dunk", releasePosition: THREE.Vector3) => void;
  onStateChange?: (state: AdvancedGameplayState) => void;
}

export class AdvancedMovementController {
  state: AdvancedGameplayState = "IdleDribble";
  private elapsed = 0;
  private released = false;
  private readonly baseJogSpeed: number;
  private readonly burstSprintSpeed: number;
  private readonly crossoverDampeningFactor: number;
  private readonly crossoverDuration: number;
  private readonly shotDuration: number;
  private readonly dunkDistance: number;
  private readonly hoopPosition: THREE.Vector3;
  private readonly onBallRelease?: AdvancedMovementOptions["onBallRelease"];
  private readonly onStateChange?: AdvancedMovementOptions["onStateChange"];
  private readonly jumpStartY: number;
  private readonly forward = new THREE.Vector3();
  private readonly releasePosition = new THREE.Vector3();

  constructor(
    private readonly player: THREE.Object3D,
    private readonly locomotion: PlayerController,
    options: AdvancedMovementOptions
  ) {
    this.baseJogSpeed = options.baseJogSpeed ?? 5.2;
    this.burstSprintSpeed = options.burstSprintSpeed ?? 7.8;
    this.crossoverDampeningFactor = THREE.MathUtils.clamp(options.crossoverDampeningFactor ?? 0.85, 0.1, 1);
    this.crossoverDuration = options.crossoverDuration ?? 0.58;
    this.shotDuration = options.shotDuration ?? 0.82;
    this.dunkDistance = options.dunkDistance ?? 3.8;
    this.hoopPosition = options.hoopPosition.clone();
    this.onBallRelease = options.onBallRelease;
    this.onStateChange = options.onStateChange;
    this.jumpStartY = player.position.y;
  }

  setMovementInput(x: number, z: number, sprint: boolean): void {
    if (this.state !== "IdleDribble") return;
    this.locomotion.setInput(x, z, sprint);
  }

  triggerCrossover(): boolean {
    if (this.state !== "IdleDribble") return false;
    this.elapsed = 0;
    this.setState("CrossoverDrive");
    return true;
  }

  requestShot(sprinting: boolean): "jump-shot" | "dunk" | null {
    if (this.state !== "IdleDribble") return null;
    const distance = this.player.position.distanceTo(this.hoopPosition);
    this.elapsed = 0;
    this.released = false;

    if (distance <= this.dunkDistance && sprinting) {
      this.setState("DunkAnimationLoop");
      return "dunk";
    }

    this.setState("InAirShot");
    return "jump-shot";
  }

  update(deltaSeconds: number): void {
    const dt = Math.min(Math.max(deltaSeconds, 0), 0.05);

    if (this.state === "IdleDribble") {
      this.locomotion.update(dt);
      return;
    }

    this.elapsed += dt;

    if (this.state === "CrossoverDrive") {
      const speed = this.baseJogSpeed * this.crossoverDampeningFactor;
      this.forward.set(0, 0, 1).applyQuaternion(this.player.quaternion).normalize();
      this.player.position.addScaledVector(this.forward, speed * dt);
      if (this.elapsed >= this.crossoverDuration) this.setState("IdleDribble");
      return;
    }

    if (this.state === "InAirShot") {
      const progress = THREE.MathUtils.clamp(this.elapsed / this.shotDuration, 0, 1);
      this.player.position.y = this.jumpStartY + Math.sin(progress * Math.PI) * 0.72;

      if (!this.released && progress >= 0.52) {
        this.released = true;
        this.releasePosition.copy(this.player.position).add(new THREE.Vector3(0, 1.35, 0));
        this.onBallRelease?.("jump-shot", this.releasePosition.clone());
      }

      if (progress >= 1) {
        this.player.position.y = this.jumpStartY;
        this.setState("IdleDribble");
      }
      return;
    }

    if (this.state === "DunkAnimationLoop") {
      const target = this.hoopPosition.clone();
      target.y = this.jumpStartY;
      const toHoop = target.sub(this.player.position);
      toHoop.y = 0;
      const distance = toHoop.length();
      if (distance > 1.05) {
        toHoop.normalize();
        this.player.position.addScaledVector(toHoop, Math.min(5.5 * dt, distance - 1.05));
        this.player.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), toHoop);
      }

      if (!this.released && this.elapsed >= 0.48) {
        this.released = true;
        this.releasePosition.copy(this.player.position).add(new THREE.Vector3(0, 2.05, 0));
        this.onBallRelease?.("dunk", this.releasePosition.clone());
      }

      if (this.elapsed >= 0.95) this.setState("IdleDribble");
    }
  }

  private setState(next: AdvancedGameplayState): void {
    this.state = next;
    if (next === "IdleDribble") {
      this.player.position.y = this.jumpStartY;
      this.locomotion.setInput(0, 0, false);
    }
    this.onStateChange?.(next);
  }

  get isBusy(): boolean {
    return this.state !== "IdleDribble";
  }

  get currentJogSpeed(): number {
    return this.baseJogSpeed;
  }

  get currentSprintSpeed(): number {
    return this.burstSprintSpeed;
  }
}
