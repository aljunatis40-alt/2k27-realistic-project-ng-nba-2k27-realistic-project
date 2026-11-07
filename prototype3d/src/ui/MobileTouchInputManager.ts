export interface MobileTouchInputCallbacks {
  onShoot: () => void;
  onShootRelease?: () => void;
  onPass: () => void;
  onCrossover: () => void;
  onSteal?: () => void;
}

export class MobileTouchInputManager {
  private readonly base: HTMLDivElement;
  private readonly knob: HTMLDivElement;
  private readonly sprintButton: HTMLDivElement;
  private readonly joystickRadius = 43;
  private pointerId: number | null = null;
  private x = 0;
  private y = 0;
  private sprinting = false;

  constructor(private readonly root: HTMLElement, callbacks: MobileTouchInputCallbacks) {
    this.base = this.makeControl("");
    this.base.style.cssText += ";position:fixed;left:24px;bottom:28px;width:124px;height:124px;border:2px solid #ffffff88;border-radius:50%;background:#101a2a88;z-index:6;touch-action:none";
    this.knob = this.makeControl("");
    this.knob.style.cssText += ";width:48px;height:48px;border-radius:50%;background:#ffffffcc;box-shadow:0 2px 12px #0008";
    this.base.appendChild(this.knob);
    this.root.appendChild(this.base);

    this.base.addEventListener("pointerdown", this.onPointerDown);
    this.base.addEventListener("pointermove", this.onPointerMove);
    this.base.addEventListener("pointerup", this.onPointerEnd);
    this.base.addEventListener("pointercancel", this.onPointerEnd);
    this.base.addEventListener("lostpointercapture", this.onPointerEnd);

    this.sprintButton = this.makeControl("SPRINT");
    this.sprintButton.style.cssText += ";position:fixed;right:26px;bottom:42px;width:76px;height:76px;border-radius:50%;border:2px solid #ffffff99;background:#b33a32dd;box-shadow:0 3px 12px #0008;z-index:6";
    this.sprintButton.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      this.sprinting = true;
      this.sprintButton.setPointerCapture(event.pointerId);
    });
    const stopSprint = (): void => { this.sprinting = false; };
    this.sprintButton.addEventListener("pointerup", stopSprint);
    this.sprintButton.addEventListener("pointercancel", stopSprint);
    this.sprintButton.addEventListener("lostpointercapture", stopSprint);
    this.root.appendChild(this.sprintButton);

    const actions = this.makeControl("");
    actions.style.cssText = "position:fixed;right:18px;bottom:132px;display:flex;gap:7px;z-index:6";
    const shoot = this.makeAction("SHOOT", "#b33a32dd", callbacks.onShoot, callbacks.onShootRelease);
    const pass = this.makeAction("PASS", "#26734ddd", callbacks.onPass);
    const crossover = this.makeAction("CROSSOVER", "#234c83dd", callbacks.onCrossover);
    const steal = this.makeAction("STEAL", "#a66a20dd", callbacks.onSteal ?? (() => {}));
    actions.append(shoot, pass, crossover, steal);
    this.root.appendChild(actions);

    window.addEventListener("blur", stopSprint);
  }

  getMovementInputDirectionalVector(): { x: number; z: number } {
    return { x: this.x, z: this.y };
  }

  get isSprinting(): boolean {
    return this.sprinting;
  }

  dispose(): void {
    this.base.removeEventListener("pointerdown", this.onPointerDown);
    this.base.removeEventListener("pointermove", this.onPointerMove);
    this.base.removeEventListener("pointerup", this.onPointerEnd);
    this.base.removeEventListener("pointercancel", this.onPointerEnd);
    this.base.removeEventListener("lostpointercapture", this.onPointerEnd);
    this.base.remove();
    this.knob.remove();
    this.sprintButton.remove();
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (this.pointerId !== null) return;
    this.pointerId = event.pointerId;
    this.base.setPointerCapture(event.pointerId);
    this.updateJoystick(event);
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (event.pointerId === this.pointerId) this.updateJoystick(event);
  };

  private readonly onPointerEnd = (event: PointerEvent): void => {
    if (event.pointerId !== this.pointerId) return;
    this.pointerId = null;
    this.x = 0;
    this.y = 0;
    this.knob.style.transform = "translate(0px, 0px)";
  };

  private updateJoystick(event: PointerEvent): void {
    const rect = this.base.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const length = Math.hypot(dx, dy);
    const scale = length > this.joystickRadius ? this.joystickRadius / length : 1;
    const px = dx * scale;
    const py = dy * scale;
    this.knob.style.transform = `translate(${px}px, ${py}px)`;
    this.x = px / this.joystickRadius;
    this.y = py / this.joystickRadius;
  }

  private makeAction(label: string, background: string, callback: () => void, onRelease?: () => void): HTMLDivElement {
    const button = this.makeControl(label);
    button.style.cssText += `;min-width:58px;height:42px;padding:0 8px;border:1px solid #ffffff99;border-radius:10px;background:${background};font:700 10px Arial;touch-action:manipulation`;
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      callback();
    });
    if (onRelease) {
      const release = (): void => onRelease();
      button.addEventListener("pointerup", release);
      button.addEventListener("pointercancel", release);
      button.addEventListener("lostpointercapture", release);
    }
    return button;
  }

  private makeControl(label: string): HTMLDivElement {
    const element = document.createElement("div");
    element.textContent = label;
    element.style.cssText = "display:flex;align-items:center;justify-content:center;color:white;font:700 12px Arial;user-select:none;-webkit-user-select:none;touch-action:none";
    return element;
  }
}
