import * as THREE from "three";
import { BallPhysics } from "./BallPhysics.ts";

/**
 * Deterministic parabolic shot path. BallPossessionController leaves InFlightShot
 * simulation to this solver; on completion the caller can release a loose ball.
 */
export class ShotTrajectorySolver {
  private active = false;
  private readonly start = new THREE.Vector3();
  private readonly target = new THREE.Vector3();
  private readonly previous = new THREE.Vector3();
  private elapsed = 0;
  private duration = 1.2;
  private apexHeightOffset = 4.5;

  constructor(
    private readonly ballMesh: THREE.Mesh,
    private readonly physics: BallPhysics
  ) {}

  launchBallFlight(
    releasePoint: THREE.Vector3,
    hoopTarget: THREE.Vector3,
    releaseQualityModifier = 0
  ): void {
    this.start.copy(releasePoint);
    this.target.copy(hoopTarget);
    // Apply release error to horizontal aim, scaled to avoid huge miss distances.
    this.target.x += THREE.MathUtils.clamp(releaseQualityModifier, -1, 1);
    this.elapsed = 0;
    this.active = true;
    this.physics.position.copy(this.start);
    this.physics.velocity.set(0, 0, 0);
    this.ballMesh.position.copy(this.start);
  }

  updateFlightTrajectory(deltaTime: number, onTargetReached: () => void): void {
    if (!this.active) return;
    const dt = THREE.MathUtils.clamp(deltaTime, 0, 0.05);
    if (dt <= 0) return;

    this.previous.copy(this.physics.position);
    this.elapsed = Math.min(this.duration, this.elapsed + dt);
    const t = this.elapsed / this.duration;
    const arc = 4 * this.apexHeightOffset * t * (1 - t);

    this.physics.position.set(
      THREE.MathUtils.lerp(this.start.x, this.target.x, t),
      THREE.MathUtils.lerp(this.start.y, this.target.y, t) + arc,
      THREE.MathUtils.lerp(this.start.z, this.target.z, t)
    );
    this.physics.velocity.copy(this.physics.position).sub(this.previous).multiplyScalar(1 / dt);
    this.ballMesh.position.copy(this.physics.position);
    this.ballMesh.rotateX(-dt * 10);

    if (t >= 1) {
      this.active = false;
      this.physics.velocity.set(0, -1.2, 0);
      onTargetReached();
    }
  }

  getIsFlightActive(): boolean { return this.active; }

  setApexHeightOffset(height: number): void {
    this.apexHeightOffset = THREE.MathUtils.clamp(height, 0.5, 8);
  }
}
