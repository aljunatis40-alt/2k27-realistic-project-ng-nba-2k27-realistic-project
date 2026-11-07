export interface ShotMeterOptions {
  perfectWindowStart?: number;
  perfectWindowEnd?: number;
  maximumHoldDuration?: number;
  onRelease: (excellent: boolean, normalizedRelease: number) => void;
}

/** Hold-to-shoot timing meter shared by touch and keyboard controls. */
export class ShotMeterEngine {
  private readonly container: HTMLDivElement;
  private readonly fill: HTMLDivElement;
  private readonly perfectWindowStart: number;
  private readonly perfectWindowEnd: number;
  private readonly maximumHoldDuration: number;
  private readonly onRelease: ShotMeterOptions["onRelease"];
  private elapsed = 0;
  private gathering = false;

  constructor(parent: HTMLElement, options: ShotMeterOptions) {
    this.perfectWindowStart = options.perfectWindowStart ?? 0.48;
    this.perfectWindowEnd = options.perfectWindowEnd ?? 0.52;
    this.maximumHoldDuration = Math.max(0.1, options.maximumHoldDuration ?? 1);
    this.onRelease = options.onRelease;

    this.container = document.createElement("div");
    this.container.setAttribute("aria-label", "Shot timing meter");
    this.container.style.cssText = "position:fixed;left:50%;bottom:190px;transform:translateX(-50%);width:min(230px,55vw);height:18px;padding:3px;border:1px solid #ffffffaa;border-radius:10px;background:#101a2add;z-index:8;display:none;pointer-events:none;overflow:hidden";
    this.fill = document.createElement("div");
    this.fill.style.cssText = "height:100%;width:0%;border-radius:7px;background:#f0c43c;transition:width 40ms linear";
    this.container.appendChild(this.fill);
    parent.appendChild(this.container);
  }

  begin(): void {
    if (this.gathering) return;
    this.gathering = true;
    this.elapsed = 0;
    this.fill.style.width = "0%";
    this.fill.style.background = "#f0c43c";
    this.container.style.display = "block";
  }

  update(deltaSeconds: number): void {
    if (!this.gathering) return;
    this.elapsed = Math.min(this.maximumHoldDuration, this.elapsed + Math.max(0, deltaSeconds));
    const progress = this.elapsed / this.maximumHoldDuration;
    this.fill.style.width = `${progress * 100}%`;
    const inWindow = progress >= this.perfectWindowStart && progress <= this.perfectWindowEnd;
    this.fill.style.background = inWindow ? "#36d477" : "#f0c43c";
    if (this.elapsed >= this.maximumHoldDuration) this.release();
  }

  release(): void {
    if (!this.gathering) return;
    this.gathering = false;
    this.container.style.display = "none";
    const normalized = Math.min(1, this.elapsed / this.maximumHoldDuration);
    const excellent = normalized >= this.perfectWindowStart && normalized <= this.perfectWindowEnd;
    this.onRelease(excellent, normalized);
  }

  cancel(): void {
    this.gathering = false;
    this.container.style.display = "none";
  }

  get isGathering(): boolean {
    return this.gathering;
  }

  dispose(): void {
    this.cancel();
    this.container.remove();
  }
}
