import * as THREE from "three";

export interface IntroPlayer {
  id: string;
  name: string;
  position: string;
  status?: string;
  headshotUrl?: string;
}

export interface IntroPresentationView {
  root: HTMLElement;
  teamBanner: HTMLElement;
  playerName: HTMLElement;
  playerPosition: HTMLElement;
  playerNumber: HTMLElement;
  headshot: HTMLImageElement;
}

export interface IntroAudioHooks {
  playArenaIntro?: () => void;
  announcePlayer?: (announcement: string) => void;
}

export interface IntroPresentationOptions {
  holdSeconds?: number;
  spotlightHeight?: number;
  onComplete?: () => void;
}

export class IntroPresentationEngine {
  private index = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private runToken = 0;
  private lineup: IntroPlayer[] = [];
  private readonly holdSeconds: number;
  private readonly spotlightHeight: number;

  constructor(
    private readonly view: IntroPresentationView,
    private readonly spotlight?: THREE.SpotLight,
    private readonly spotlightTarget?: THREE.Object3D,
    private readonly audio: IntroAudioHooks = {},
    private readonly options: IntroPresentationOptions = {}
  ) {
    this.holdSeconds = Math.max(0.5, options.holdSeconds ?? 3.5);
    this.spotlightHeight = options.spotlightHeight ?? 10;
    this.view.root.hidden = true;
    this.view.root.setAttribute("aria-live", "polite");
  }

  start(teamAbbreviation: string, startingFive: IntroPlayer[]): boolean {
    this.stop();
    const starters = startingFive.filter((player) => player.status === undefined || player.status === "Starter");
    if (starters.length === 0) return false;

    this.lineup = starters.slice(0, 5);
    this.index = 0;
    const token = this.runToken;
    this.view.teamBanner.textContent = `${teamAbbreviation.toUpperCase()} STARTING LINEUP`;
    this.view.root.hidden = false;
    this.audio.playArenaIntro?.();
    if (this.spotlight) this.spotlight.visible = true;
    this.presentNext(token);
    return true;
  }

  stop(): void {
    this.runToken += 1;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.view.root.hidden = true;
    if (this.spotlight) this.spotlight.visible = false;
  }

  private presentNext(token: number): void {
    if (token !== this.runToken) return;
    if (this.index >= this.lineup.length) {
      this.finish(token);
      return;
    }

    const player = this.lineup[this.index];
    const jerseyNumber = this.extractJerseyNumber(player.id);
    this.view.playerName.textContent = player.name.toLocaleUpperCase();
    this.view.playerPosition.textContent = `POSITION: ${player.position}`;
    this.view.playerNumber.textContent = jerseyNumber ? `#${jerseyNumber}` : "";

    if (player.headshotUrl) {
      this.view.headshot.src = player.headshotUrl;
      this.view.headshot.hidden = false;
      this.view.headshot.alt = `${player.name} headshot`;
    } else {
      this.view.headshot.removeAttribute("src");
      this.view.headshot.hidden = true;
      this.view.headshot.alt = "";
    }

    if (this.spotlight && this.spotlightTarget) {
      this.spotlight.position.copy(this.spotlightTarget.position).add(
        new THREE.Vector3(0, this.spotlightHeight, 0)
      );
      this.spotlight.target = this.spotlightTarget;
      this.spotlight.visible = true;
    }

    const announcement = jerseyNumber
      ? `At ${player.position}... Number ${jerseyNumber}... ${player.name}!`
      : `At ${player.position}... ${player.name}!`;
    this.audio.announcePlayer?.(announcement);

    this.timer = setTimeout(() => {
      this.timer = null;
      if (token !== this.runToken) return;
      this.index += 1;
      this.presentNext(token);
    }, this.holdSeconds * 1000);
  }

  private extractJerseyNumber(playerId: string): string {
    const match = playerId.match(/(\d{1,2,3})$/);
    return match?.[1].replace(/^0+(?=\d)/, "") ?? "";
  }

  private finish(token: number): void {
    if (token !== this.runToken) return;
    this.view.root.hidden = true;
    if (this.spotlight) this.spotlight.visible = false;
    this.options.onComplete?.();
  }

  get currentPlayerIndex(): number {
    return this.index;
  }

  get isRunning(): boolean {
    return !this.view.root.hidden && this.timer !== null;
  }
}
