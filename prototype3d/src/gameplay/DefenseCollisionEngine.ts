import * as THREE from "three";
import { BallPhysics } from "../simulation/BallPhysics.ts";

export interface DefenseCollisionOptions {
  baseStealSuccessProbability?: number;
  baseBlockSuccessProbability?: number;
  contactReachRadius?: number;
  random?: () => number;
  onSteal?: () => void;
  onBlock?: () => void;
}

/** Prototype steal/block resolution. Possession, fouls and referee rules remain separate systems. */
export class DefenseCollisionEngine {
  private readonly stealChance: number;
  private readonly blockChance: number;
  private readonly reachRadius: number;
  private readonly random: () => number;
  private readonly onSteal?: () => void;
  private readonly onBlock?: () => void;
  private readonly poke = new THREE.Vector3();
  private readonly deflection = new THREE.Vector3();

  constructor(
    private readonly ball: BallPhysics,
    options: DefenseCollisionOptions = {}
  ) {
    this.stealChance = THREE.MathUtils.clamp(options.baseStealSuccessProbability ?? 0.35, 0, 1);
    this.blockChance = THREE.MathUtils.clamp(options.baseBlockSuccessProbability ?? 0.4, 0, 1);
    this.reachRadius = Math.max(0, options.contactReachRadius ?? 1.5);
    this.random = options.random ?? Math.random;
    this.onSteal = options.onSteal;
    this.onBlock = options.onBlock;
  }

  executeStealAttempt(defender: THREE.Object3D, ballCarrier: THREE.Object3D): boolean {
    if (defender.position.distanceTo(ballCarrier.position) > this.reachRadius) return false;
    if (this.random() > this.stealChance) return false;

    // A successful poke creates a loose-ball impulse. This prototype does not yet
    // own a possession/turnover state machine, so callers must handle that event.
    this.poke.copy(defender.getWorldDirection(new THREE.Vector3()));
    this.poke.y = 0.2;
    if (this.poke.lengthSq() < 0.0001) this.poke.set(0, 0.2, 1);
    this.poke.normalize().multiplyScalar(6);
    this.ball.velocity.copy(this.poke);
    this.onSteal?.();
    return true;
  }

  executeShotBlockAttempt(
    defender: THREE.Object3D,
    shooter: THREE.Object3D,
    ballInFlight: boolean
  ): boolean {
    if (!ballInFlight) return false;
    if (defender.position.distanceTo(shooter.position) > this.reachRadius + 0.5) return false;
    if (this.random() > this.blockChance) return false;

    defender.getWorldDirection(this.deflection);
    this.deflection.negate();
    this.deflection.y = -0.5;
    if (this.deflection.lengthSq() < 0.0001) this.deflection.set(0, -0.5, 1);
    this.deflection.normalize().multiplyScalar(4);
    this.ball.velocity.copy(this.deflection);
    this.onBlock?.();
    return true;
  }
}
