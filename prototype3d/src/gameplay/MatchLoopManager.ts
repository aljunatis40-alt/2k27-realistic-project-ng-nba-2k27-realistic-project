import * as THREE from "three";

export enum MatchState {
  PreTipOff = "PreTipOff",
  LivePlay = "LivePlay",
  DeadBall = "DeadBall",
  PostGame = "PostGame"
}

export type MatchWhistleReason = "Quarter_End" | "Shot_Clock_Violation" | "Score_Made" | "Manual_Dead_Ball";

export interface MatchPlayerPort {
  updateStance?: (deltaTime: number) => void;
}

export interface MatchLoopOptions {
  quarterLengthSeconds?: number;
  shotClockSeconds?: number;
  deadBallDurationSeconds?: number;
  onWhistle?: (reason: MatchWhistleReason) => void;
  onStateChange?: (state: MatchState) => void;
  onScoreChange?: (home: number, away: number) => void;
  onClockChange?: (gameClock: number, shotClock: number, period: number) => void;
  processPlayers?: (players: readonly MatchPlayerPort[], deltaTime: number) => void;
  resolvePhysics?: () => void;
}

/**
 * Match clock/state coordinator. It deliberately does not award points from
 * ball/rim contact: a validated basket-crossing detector must call registerScore.
 */
export class MatchLoopManager {
  private state = MatchState.PreTipOff;
  private gameClock: number;
  private shotClock: number;
  private period = 1;
  private homeScore = 0;
  private awayScore = 0;
  private deadBallRemaining = 0;
  private readonly quarterLength: number;
  private readonly initialShotClock: number;
  private readonly deadBallDuration: number;
  private readonly players: MatchPlayerPort[];
  private readonly basketball: THREE.Object3D | null;
  private readonly options: MatchLoopOptions;

  constructor(
    players: MatchPlayerPort[] = [],
    basketball: THREE.Object3D | null = null,
    options: MatchLoopOptions = {}
  ) {
    this.players = players;
    this.basketball = basketball;
    this.options = options;
    this.quarterLength = Math.max(1, options.quarterLengthSeconds ?? 720);
    this.initialShotClock = Math.max(1, options.shotClockSeconds ?? 24);
    this.deadBallDuration = Math.max(0, options.deadBallDurationSeconds ?? 2.5);
    this.gameClock = this.quarterLength;
    this.shotClock = this.initialShotClock;
    this.emitClock();
  }

  get matchState(): MatchState { return this.state; }
  get score(): Readonly<{ home: number; away: number }> { return { home: this.homeScore, away: this.awayScore }; }
  get clocks(): Readonly<{ game: number; shot: number; period: number }> {
    return { game: Math.max(0, this.gameClock), shot: Math.max(0, this.shotClock), period: this.period };
  }

  start(): void {
    if (this.state !== MatchState.PreTipOff && this.state !== MatchState.DeadBall) return;
    this.setState(MatchState.LivePlay);
  }

  update(deltaTime: number): void {
    const dt = THREE.MathUtils.clamp(deltaTime, 0, 0.1);
    if (this.state === MatchState.DeadBall) {
      this.deadBallRemaining -= dt;
      if (this.deadBallRemaining <= 0) {
        if (this.gameClock <= 0) this.advancePeriod();
        else {
          this.resetShotClock();
          this.start();
        }
      }
      return;
    }
    if (this.state !== MatchState.LivePlay) return;

    this.gameClock = Math.max(0, this.gameClock - dt);
    this.shotClock = Math.max(0, this.shotClock - dt);
    this.options.processPlayers?.(this.players, dt);
    for (const player of this.players) player.updateStance?.(dt);
    this.options.resolvePhysics?.();
    this.emitClock();

    if (this.gameClock <= 0) this.triggerWhistle("Quarter_End");
    else if (this.shotClock <= 0) this.triggerWhistle("Shot_Clock_Violation");
  }

  registerScore(isHome: boolean, points: number): void {
    if (this.state !== MatchState.LivePlay || !Number.isInteger(points) || points < 1 || points > 4) return;
    if (isHome) this.homeScore += points;
    else this.awayScore += points;
    this.options.onScoreChange?.(this.homeScore, this.awayScore);
    this.triggerWhistle("Score_Made");
  }

  resetShotClock(seconds = this.initialShotClock): void {
    this.shotClock = Math.max(0, seconds);
    this.emitClock();
  }

  triggerWhistle(reason: MatchWhistleReason): void {
    if (this.state !== MatchState.LivePlay) return;
    this.deadBallRemaining = this.deadBallDuration;
    this.setState(MatchState.DeadBall);
    this.options.onWhistle?.(reason);
  }

  endMatch(): void {
    this.setState(MatchState.PostGame);
  }

  private advancePeriod(): void {
    if (this.period >= 4) {
      if (this.homeScore === this.awayScore) {
        this.period += 1; // Overtime periods continue until a non-tied finish.
        this.gameClock = 300;
      } else {
        this.endMatch();
        return;
      }
    } else {
      this.period += 1;
      this.gameClock = this.quarterLength;
    }
    this.resetShotClock();
    this.deadBallRemaining = this.deadBallDuration;
    this.emitClock();
    this.setState(MatchState.DeadBall);
  }

  private setState(next: MatchState): void {
    if (this.state === next) return;
    this.state = next;
    this.options.onStateChange?.(next);
  }

  private emitClock(): void {
    this.options.onClockChange?.(Math.max(0, this.gameClock), Math.max(0, this.shotClock), this.period);
  }
}
