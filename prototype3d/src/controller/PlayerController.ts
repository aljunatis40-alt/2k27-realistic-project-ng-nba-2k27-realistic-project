import * as THREE from "three";

export type PlayerInput = {
  x: number;
  z: number;
  sprint: boolean;
};

export type PlayerControllerConfig = {
  moveSpeed?: number;
  sprintMultiplier?: number;
  turnSpeed?: number;
};

export class PlayerController {
  readonly object: THREE.Object3D;
  readonly velocity = new THREE.Vector3();
  readonly input: PlayerInput = { x: 0, z: 0, sprint: false };
  private readonly moveSpeed: number;
  private readonly sprintMultiplier: number;
  private readonly turnSpeed: number;
  private readonly direction = new THREE.Vector3();
  private readonly targetQuaternion = new THREE.Quaternion();

  constructor(object: THREE.Object3D, config: PlayerControllerConfig = {}) {
    this.object = object;
    this.moveSpeed = config.moveSpeed ?? 3.8;
    this.sprintMultiplier = config.sprintMultiplier ?? 1.45;
    this.turnSpeed = config.turnSpeed ?? 10;
  }

  setInput(x: number, z: number, sprint = false): void {
    const length = Math.hypot(x, z);
    const scale = length > 1 ? 1 / length : 1;
    this.input.x = x * scale;
    this.input.z = z * scale;
    this.input.sprint = sprint;
  }

  update(deltaSeconds: number): void {
    const dt = Math.min(Math.max(deltaSeconds, 0), 0.05);
    this.direction.set(this.input.x, 0, this.input.z);
    const hasInput = this.direction.lengthSq() > 0.0001;
    const speed = this.moveSpeed * (this.input.sprint ? this.sprintMultiplier : 1);

    if (hasInput) {
      this.direction.normalize();
      this.object.position.addScaledVector(this.direction, speed * dt);
      this.targetQuaternion.setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        this.direction
      );
      this.object.quaternion.slerp(
        this.targetQuaternion,
        1 - Math.exp(-this.turnSpeed * dt)
      );
    }
    this.velocity.set(
      this.input.x * speed,
      0,
      this.input.z * speed
    );
  }

  get isMoving(): boolean {
    return Math.hypot(this.input.x, this.input.z) > 0.05;
  }
}
