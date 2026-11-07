import { Vector3, type Object3D } from "three";
import type { BallPhysics } from "./BallPhysics.ts";

export type RefereeState = "PreTipOff" | "LivePlay" | "DeadBall" | "ReviewingPlay";
export type PossessionArrow = "Home" | "Away";

export interface RefereeClockHooks {
  toggleGameClock: (running: boolean) => void;
  resetShotClock: (seconds: number) => void;
}

export interface RefereeEvent {
  type: "tip-off" | "violation" | "dead-ball" | "inbound-ready" | "review-started" | "review-ended";
  message: string;
  team?: PossessionArrow;
}

export interface RefereeOptions {
  tipOffVerticalSpeed?: number;
  tipOffBallHeight?: number;
  deadBallDelaySeconds?: number;
  openingShotClockSeconds?: number;
  violationShotClockSeconds?: number;
  onEvent?: (event: RefereeEvent) => void;
  onInboundReady?: (team: PossessionArrow) => void;
}

export class RefereeEngine {
  private state: RefereeState = "PreTipOff";
  private possessionArrow: PossessionArrow = "Home";
  private quarter = 1;
  private deadBallTimer: ReturnType<typeof setTimeout> | null = null;
  private runToken = 0;

  private readonly tipOffVerticalSpeed: number;
  private readonly tipOffBallHeight: number;
  private readonly deadBallDelaySeconds: number;
  private readonly openingShotClockSeconds: number;
  private readonly violationShotClockSeconds: number;

  constructor(
    private readonly ball: BallPhysics,
    private readonly centerCourt: Object3D,
    private readonly clock?: RefereeClockHooks,
    private readonly options: RefereeOptions = {}
  ) {
    this.tipOffVerticalSpeed = options.tipOffVerticalSpeed ?? 8.5;
    this.tipOffBallHeight = options.tipOffBallHeight ?? 1.5;
    this.deadBallDelaySeconds = Math.max(0, options.deadBallDelaySeconds ?? 2.5);
    this.openingShotClockSeconds = options.openingShotClockSeconds ?? 24;
    this.violationShotClockSeconds = options.violationShotClockSeconds ?? 24;
    this.prepareForTipOff();
  }

  prepareForTipOff(): void {
    this.cancelDeadBallTimer();
    this.state = "PreTipOff";
    this.clock?.toggleGameClock(false);
    this.clock?.resetShotClock(this.openingShotClockSeconds);
    this.ball.position.copy(this.centerCourt.position).add(new Vector3(0, this.tipOffBallHeight, 0));
    this.ball.velocity.set(0, 0, 0);
    this.ball.angularVelocity.set(0, 0, 0);
  }

  executeJumpBallTipOff(): boolean {
    if (this.state !== "PreTipOff") return false;

    this.ball.position.copy(this.centerCourt.position).add(new Vector3(0, this.tipOffBallHeight, 0));
    this.ball.velocity.set(0, this.tipOffVerticalSpeed, 0);
    this.ball.angularVelocity.set(0, 0, 0);
    this.state = "LivePlay";
    this.clock?.toggleGameClock(true);
    this.emit("tip-off", "Whistle: opening tip-off. Ball is live.");
    return true;
  }

  callViolation(violationType: string, turnoverToTeam: PossessionArrow): boolean {
    if (this.state !== "LivePlay") return false;

    this.cancelDeadBallTimer();
    this.state = "DeadBall";
    this.possessionArrow = turnoverToTeam;
    this.clock?.toggleGameClock(false);
    this.emit("violation", `Violation: ${violationType}. Possession awarded to ${turnoverToTeam}.`, turnoverToTeam);
    this.emit("dead-ball", "Play stopped for an inbound.", turnoverToTeam);

    const token = this.runToken;
    this.deadBallTimer = setTimeout(() => {
      this.deadBallTimer = null;
      if (token !== this.runToken || this.state !== "DeadBall") return;
      this.clock?.resetShotClock(this.violationShotClockSeconds);
      this.emit("inbound-ready", `Inbound ready for ${this.possessionArrow}.`, this.possessionArrow);
      this.options.onInboundReady?.(this.possessionArrow);
    }, this.deadBallDelaySeconds * 1000);

    return true;
  }

  /** Call only after the inbound pass has actually been completed. */
  confirmInbound(): boolean {
    if (this.state !== "DeadBall") return false;
    this.cancelDeadBallTimer();
    this.state = "LivePlay";
    this.clock?.toggleGameClock(true);
    this.emit("tip-off", `Ball live. ${this.possessionArrow} possession.`, this.possessionArrow);
    return true;
  }

  beginReview(): boolean {
    if (this.state !== "DeadBall") return false;
    this.state = "ReviewingPlay";
    this.emit("review-started", "Official review started.");
    return true;
  }

  endReview(): boolean {
    if (this.state !== "ReviewingPlay") return false;
    this.state = "DeadBall";
    this.emit("review-ended", "Official review completed. Awaiting inbound.");
    return true;
  }

  setQuarter(quarter: number): void {
    if (!Number.isInteger(quarter) || quarter < 1) throw new RangeError("Quarter must be a positive integer.");
    this.quarter = quarter;
  }

  setPossessionArrow(team: PossessionArrow): void {
    this.possessionArrow = team;
  }

  getCurrentRefereeState(): RefereeState { return this.state; }
  getPossessionArrow(): PossessionArrow { return this.possessionArrow; }
  getCurrentQuarter(): number { return this.quarter; }

  dispose(): void {
    this.cancelDeadBallTimer();
    this.clock?.toggleGameClock(false);
  }

  private cancelDeadBallTimer(): void {
    this.runToken += 1;
    if (this.deadBallTimer !== null) {
      clearTimeout(this.deadBallTimer);
      this.deadBallTimer = null;
    }
  }

  private emit(type: RefereeEvent["type"], message: string, team?: PossessionArrow): void {
    this.options.onEvent?.({ type, message, team });
  }
}
