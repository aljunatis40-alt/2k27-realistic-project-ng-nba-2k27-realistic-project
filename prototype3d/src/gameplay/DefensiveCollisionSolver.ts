import * as THREE from "three";
import { BallPhysics } from "../simulation/BallPhysics.ts";
import { BallPossessionController, BallState, type PlayerActor } from "./BallPossessionController.ts";

/** Rating- and stamina-aware steal, block and shot-contest resolver. */
export class DefensiveCollisionSolver {
  private readonly stealReachRadius = 1.4;
  private readonly blockReachRadius = 1.8;
  private readonly contestDistance = 2.5;

  constructor(
    private readonly possession: BallPossessionController,
    private readonly ball: BallPhysics,
    private readonly random: () => number = Math.random
  ) {}

  evaluateStealAttempt(defender: PlayerActor, handler: PlayerActor, stealRating = 75): boolean {
    if (defender.isHomeTeam === handler.isHomeTeam) return false;
    if (this.possession.getCurrentHandler()?.id !== handler.id) return false;
    if (defender.mesh.position.distanceTo(handler.mesh.position) > this.stealReachRadius) return false;

    const stamina = THREE.MathUtils.clamp(defender.stamina / 100, 0, 1);
    const rating = THREE.MathUtils.clamp(stealRating / 100, 0, 1);
    if (this.random() > rating * 0.35 * stamina) return false;

    const direction = defender.mesh.getWorldDirection(new THREE.Vector3());
    direction.y = 0.2;
    if (direction.lengthSq() < 0.0001) direction.set(0, 0.2, 1);
    this.ball.velocity.copy(direction.normalize().multiplyScalar(6));
    this.possession.releaseAsLooseBall();
    return true;
  }

  evaluateShotBlockAttempt(defender: PlayerActor, shooter: PlayerActor, blockRating = 80): boolean {
    if (defender.isHomeTeam === shooter.isHomeTeam) return false;
    if (this.possession.ballState !== BallState.InFlightShot) return false;
    if (defender.mesh.position.distanceTo(shooter.mesh.position) > this.blockReachRadius) return false;

    const stamina = THREE.MathUtils.clamp(defender.stamina / 100, 0, 1);
    const rating = THREE.MathUtils.clamp(blockRating / 100, 0, 1);
    if (this.random() > rating * 0.42 * stamina) return false;

    const direction = defender.mesh.getWorldDirection(new THREE.Vector3()).negate();
    direction.y = -0.5;
    if (direction.lengthSq() < 0.0001) direction.set(0, -0.5, 1);
    this.ball.velocity.copy(direction.normalize().multiplyScalar(4));
    this.possession.releaseAsLooseBall();
    return true;
  }

  calculateShotContestFactor(shooter: PlayerActor, defenders: readonly PlayerActor[]): number {
    let maximum = 0;
    for (const defender of defenders) {
      if (defender.isHomeTeam === shooter.isHomeTeam) continue;
      const distance = defender.mesh.position.distanceTo(shooter.mesh.position);
      if (distance > this.contestDistance) continue;
      const staminaFactor = THREE.MathUtils.clamp(defender.stamina / 100, 0, 1);
      const contest = (1 - distance / this.contestDistance) * 100 * staminaFactor;
      maximum = Math.max(maximum, contest);
    }
    return THREE.MathUtils.clamp(maximum, 0, 100);
  }
}
