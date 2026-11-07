import { Vector3 } from "three";

export type BallConfig = {
  gravity: number;
  restitution: number;
  groundFriction: number;
  radius: number;
};

export class BallPhysics {
  readonly position = new Vector3(0, 2, 0);
  readonly velocity = new Vector3();
  readonly angularVelocity = new Vector3();

  constructor(
    private readonly config: BallConfig = {
      gravity: 9.81,
      restitution: 0.72,
      groundFriction: 0.985,
      radius: 0.12
    }
  ) {}

  launch(origin: Vector3, initialVelocity: Vector3): void {
    this.position.copy(origin);
    this.velocity.copy(initialVelocity);
  }

  step(dt: number, floorY = 0): void {
    // Semi-implicit Euler integration; call at a fixed simulation interval.
    this.velocity.y -= this.config.gravity * dt;
    this.position.addScaledVector(this.velocity, dt);

    const minY = floorY + this.config.radius;
    if (this.position.y < minY) {
      this.position.y = minY;
      if (this.velocity.y < 0) {
        this.velocity.y = -this.velocity.y * this.config.restitution;
      }
      this.velocity.x *= this.config.groundFriction;
      this.velocity.z *= this.config.groundFriction;

      if (Math.abs(this.velocity.y) < 0.18) this.velocity.y = 0;
    }

    // Simple spin decay placeholder; detailed Magnus/air drag can be added later.
    this.angularVelocity.multiplyScalar(Math.exp(-0.12 * dt));
  }
}
