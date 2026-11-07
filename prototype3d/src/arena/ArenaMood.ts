export type CrowdEvent =
  | "home-score" | "away-score" | "home-clutch-score"
  | "home-dunk" | "away-dunk" | "turnover" | "timeout" | "buzzer";

export class ArenaMood {
  intensity = 0.25; // normalized 0..1
  standingRatio = 0.05;
  booRatio = 0;

  react(event: CrowdEvent, homeLead: number, secondsRemaining: number): void {
    const clutch = secondsRemaining <= 60 && Math.abs(homeLead) <= 5;
    const boost: Record<CrowdEvent, number> = {
      "home-score": 0.12, "away-score": 0.07,
      "home-clutch-score": 0.28, "home-dunk": 0.32,
      "away-dunk": 0.10, turnover: 0.08, timeout: 0.04, buzzer: 0.18
    };
    this.intensity = this.clamp(this.intensity + boost[event] + (clutch ? 0.08 : 0));
    if (event === "home-dunk" || event === "home-clutch-score" || event === "buzzer") {
      this.standingRatio = this.clamp(this.standingRatio + 0.25);
    }
    if (homeLead <= -18) this.booRatio = this.clamp(this.booRatio + 0.12);
    else this.booRatio = Math.max(0, this.booRatio - 0.03);
  }

  update(dt: number): void {
    this.intensity = Math.max(0.18, this.intensity - 0.025 * dt);
    this.standingRatio = Math.max(0.03, this.standingRatio - 0.08 * dt);
  }

  private clamp(value: number): number { return Math.max(0, Math.min(1, value)); }
}
