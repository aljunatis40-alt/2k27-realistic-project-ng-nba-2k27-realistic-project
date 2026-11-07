import * as THREE from "three";
import { BallPhysics } from "../simulation/BallPhysics.ts";

export enum BallState {
  AttachedToHandler = "AttachedToHandler",
  InFlightPass = "InFlightPass",
  InFlightShot = "InFlightShot",
  LooseOnCourt = "LooseOnCourt"
}

export interface PlayerActor {
  id: string;
  isHomeTeam: boolean;
  mesh: THREE.Object3D;
  position: THREE.Vector3;
  handNode: THREE.Object3D;
  stamina: number;
}

export interface BallPossessionOptions {
  catchRadius?: number;
  dribbleHeight?: number;
  dribbleFrequency?: number;
  onPossessionChanged?: (handler: PlayerActor | null) => void;
  onPassCaught?: (receiver: PlayerActor) => void;
  onLooseBall?: () => void;
}

/** Owns ball possession and pass/catch state while sharing the project's ball physics. */
export class BallPossessionController {
  private state = BallState.LooseOnCourt;
  private handler: PlayerActor | null = null;
  private passReceiver: PlayerActor | null = null;
  private readonly flightStart = new THREE.Vector3();
  private readonly flightTarget = new THREE.Vector3();
  private flightProgress = 0;
  private flightDuration = 0.5;
  private elapsed = 0;
  private readonly handPosition = new THREE.Vector3();
  private readonly catchRadius: number;
  private readonly dribbleHeight: number;
  private readonly dribbleFrequency: number;
  private readonly options: BallPossessionOptions;

  constructor(
    private readonly ball: BallPhysics,
    private readonly ballMesh: THREE.Object3D,
    options: BallPossessionOptions = {}
  ) {
    this.options = options;
    this.catchRadius = Math.max(0.1, options.catchRadius ?? 0.85);
    this.dribbleHeight = Math.max(0.05, options.dribbleHeight ?? 0.42);
    this.dribbleFrequency = Math.max(1, options.dribbleFrequency ?? 7.5);
  }

  get ballState(): BallState { return this.state; }
  getCurrentHandler(): PlayerActor | null { return this.handler; }
  get isBallInFlight(): boolean {
    return this.state === BallState.InFlightPass || this.state === BallState.InFlightShot;
  }

  update(deltaTime: number): void {
    const dt = THREE.MathUtils.clamp(deltaTime, 0, 0.1);
    this.elapsed += dt;

    switch (this.state) {
      case BallState.AttachedToHandler:
        this.updateDribbleAttachment();
        break;
      case BallState.InFlightPass:
        this.updatePass(dt);
        break;
      case BallState.InFlightShot:
        // ShotTrajectorySolver owns the shot's deterministic ballistic path.
        break;
      case BallState.LooseOnCourt:
        this.ball.step(dt);
        break;
    }

    this.ballMesh.position.copy(this.ball.position);
  }

  assignPossession(player: PlayerActor): void {
    this.handler = player;
    this.passReceiver = null;
    this.state = BallState.AttachedToHandler;
    this.ball.velocity.set(0, 0, 0);
    this.ball.angularVelocity.set(0, 0, 0);
    this.elapsed = 0;
    this.updateDribbleAttachment();
    this.options.onPossessionChanged?.(player);
  }

  initiatePassTransfer(fromPlayer: PlayerActor, toPlayer: PlayerActor, duration = 0.5): boolean {
    if (this.state !== BallState.AttachedToHandler || this.handler?.id !== fromPlayer.id) return false;
    if (fromPlayer.id === toPlayer.id) return false;

    this.handler = null;
    this.passReceiver = toPlayer;
    this.state = BallState.InFlightPass;
    this.flightProgress = 0;
    this.flightDuration = Math.max(0.12, duration);
    this.flightStart.copy(this.ball.position);
    toPlayer.mesh.getWorldPosition(this.flightTarget);
    this.flightTarget.y += 1.15;
    this.elapsed = 0;
    this.options.onPossessionChanged?.(null);
    return true;
  }

  /** Call immediately after BallPhysics.launch() for a jump shot or dunk. */
  beginShotFlight(): void {
    this.handler = null;
    this.passReceiver = null;
    this.state = BallState.InFlightShot;
    this.elapsed = 0;
    this.options.onPossessionChanged?.(null);
  }

  /** Convert a steal or deflection into a live loose ball using current velocity. */
  releaseAsLooseBall(): void {
    this.handler = null;
    this.passReceiver = null;
    this.state = BallState.LooseOnCourt;
    this.options.onPossessionChanged?.(null);
    this.options.onLooseBall?.();
  }

  tryRecoverLooseBall(players: readonly PlayerActor[]): PlayerActor | null {
    if (this.state !== BallState.LooseOnCourt) return null;
    let closest: PlayerActor | null = null;
    let closestDistance = this.catchRadius;
    for (const player of players) {
      const distance = player.mesh.position.distanceTo(this.ball.position);
      if (distance < closestDistance) {
        closest = player;
        closestDistance = distance;
      }
    }
    if (closest) this.assignPossession(closest);
    return closest;
  }

  private updateDribbleAttachment(): void {
    if (!this.handler) {
      this.state = BallState.LooseOnCourt;
      return;
    }
    this.handler.handNode.getWorldPosition(this.handPosition);
    const bounce = Math.abs(Math.sin(this.elapsed * this.dribbleFrequency)) * this.dribbleHeight;
    this.ball.position.copy(this.handPosition);
    this.ball.position.y = Math.max(0.12, this.handPosition.y - bounce);
    this.ball.velocity.set(0, 0, 0);
  }

  private updatePass(deltaTime: number): void {
    if (!this.passReceiver) {
      this.state = BallState.LooseOnCourt;
      return;
    }
    this.flightProgress = Math.min(1, this.flightProgress + deltaTime / this.flightDuration);
    const t = this.flightProgress;
    this.ball.position.lerpVectors(this.flightStart, this.flightTarget, t);
    this.ball.position.y += Math.sin(t * Math.PI) * 0.28;
    this.ball.velocity.set(0, 0, 0);

    const receiverPosition = this.passReceiver.mesh.getWorldPosition(new THREE.Vector3());
    if (this.flightProgress >= 1 || receiverPosition.distanceTo(this.ball.position) <= this.catchRadius) {
      const receiver = this.passReceiver;
      this.assignPossession(receiver);
      this.options.onPassCaught?.(receiver);
    }
  }
}
