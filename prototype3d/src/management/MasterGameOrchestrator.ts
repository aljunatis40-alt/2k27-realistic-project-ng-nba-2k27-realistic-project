import type { CameraMode } from "../camera/CameraDirector.ts";

export interface RosterSystemPort {
  isReady?: () => boolean;
}

export interface RefereeSystemPort {
  prepareForTipOff: () => void;
  dispose?: () => void;
}

export interface ScoreboardSystemPort {
  toggleClock: (running: boolean) => void;
}

export interface AudioSystemPort {
  triggerPAAnnouncement: (message: string) => void;
  triggerArenaSFX: (eventId: string) => void;
}

export interface CameraSystemPort {
  setMode: (mode: CameraMode) => void;
}

export interface LeaderboardSystemPort {
  compileAndDisplayPostGameLeaderboard: (finalScoreSummary: string) => unknown;
}

export interface MasterGameDependencies {
  rosterEngine: RosterSystemPort | null;
  refereeEngine: RefereeSystemPort | null;
  scoreboardEngine: ScoreboardSystemPort | null;
  audioEngine: AudioSystemPort | null;
  cameraEngine: CameraSystemPort | null;
  postGameLeaderboard: LeaderboardSystemPort | null;
}

export interface MasterGameOrchestratorOptions {
  welcomeAnnouncement?: string;
  endGameSoundId?: string;
  onLog?: (level: "info" | "warn" | "error", message: string) => void;
}

/**
 * Coordinates the boot and shutdown sequence for game subsystems.
 * Systems are injected through small ports so this module does not depend
 * on Unity singletons or on unfinished UI/audio implementations.
 */
export class MasterGameOrchestrator {
  private sessionActive = false;

  private readonly welcomeAnnouncement: string;
  private readonly endGameSoundId: string;

  constructor(
    private readonly systems: MasterGameDependencies,
    private readonly options: MasterGameOrchestratorOptions = {}
  ) {
    this.welcomeAnnouncement =
      options.welcomeAnnouncement ??
      "Welcome to the next-generation basketball simulation. Prepare for tip-off.";
    this.endGameSoundId = options.endGameSoundId ?? "period_end_buzzer";
  }

  initializeUniversalGameFramework(): boolean {
    this.log("info", "Initializing NBA 2K27 subsystem boot sequence.");

    const missing = this.getMissingDependencies();
    if (missing.length > 0) {
      this.log("error", `Initialization failed. Missing systems: ${missing.join(", ")}.`);
      this.sessionActive = false;
      return false;
    }

    if (this.systems.rosterEngine?.isReady && !this.systems.rosterEngine.isReady()) {
      this.log("error", "Initialization failed. Roster system is not ready.");
      this.sessionActive = false;
      return false;
    }

    try {
      // Keep the scoreboard stopped until the referee starts live play.
      this.systems.scoreboardEngine!.toggleClock(false);
      this.systems.refereeEngine!.prepareForTipOff();
      this.systems.audioEngine!.triggerPAAnnouncement(this.welcomeAnnouncement);
      this.systems.cameraEngine!.setMode("broadcast");

      this.sessionActive = true;
      this.log("info", "Subsystem boot sequence completed. Ready for tip-off.");
      return true;
    } catch (error) {
      this.sessionActive = false;
      try {
        this.systems.scoreboardEngine?.toggleClock(false);
        this.systems.refereeEngine?.dispose?.();
      } catch {
        // Preserve the original initialization failure in the log.
      }
      this.log("error", `Initialization aborted: ${this.errorMessage(error)}`);
      return false;
    }
  }

  triggerMatchEndSequence(finalScoreSummary: string): boolean {
    if (!this.sessionActive) {
      this.log("warn", "Match-end sequence ignored because no session is active.");
      return false;
    }

    this.sessionActive = false;

    try {
      this.systems.scoreboardEngine!.toggleClock(false);
      this.systems.audioEngine!.triggerArenaSFX(this.endGameSoundId);
      this.systems.cameraEngine!.setMode("nosebleed");
      this.systems.postGameLeaderboard!.compileAndDisplayPostGameLeaderboard(finalScoreSummary);
      this.log("info", "Match session ended. Game systems returned to an idle state.");
      return true;
    } catch (error) {
      this.log("error", `Match-end sequence encountered an error: ${this.errorMessage(error)}`);
      return false;
    }
  }

  isGameSessionActive(): boolean {
    return this.sessionActive;
  }

  private getMissingDependencies(): string[] {
    const missing: string[] = [];
    for (const [name, system] of Object.entries(this.systems)) {
      if (system === null || system === undefined) missing.push(name);
    }
    return missing;
  }

  private log(level: "info" | "warn" | "error", message: string): void {
    this.options.onLog?.(level, `[Master Orchestrator] ${message}`);
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
