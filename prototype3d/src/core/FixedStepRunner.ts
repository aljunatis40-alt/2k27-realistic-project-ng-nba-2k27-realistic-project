export class FixedStepRunner {
  private accumulator = 0;
  private readonly stepSeconds: number;

  constructor(
    hz = 60,
    private readonly maxSubSteps = 5
  ) {
    this.stepSeconds = 1 / hz;
  }

  update(frameDeltaSeconds: number, simulate: (dt: number) => void): void {
    // Clamp long pauses/background-tab gaps to avoid a spiral of death.
    this.accumulator += Math.min(frameDeltaSeconds, 0.1);
    let steps = 0;
    while (this.accumulator >= this.stepSeconds && steps < this.maxSubSteps) {
      simulate(this.stepSeconds);
      this.accumulator -= this.stepSeconds;
      steps++;
    }
    if (steps === this.maxSubSteps) this.accumulator = 0;
  }

  get interpolationAlpha(): number {
    return this.accumulator / this.stepSeconds;
  }
}
