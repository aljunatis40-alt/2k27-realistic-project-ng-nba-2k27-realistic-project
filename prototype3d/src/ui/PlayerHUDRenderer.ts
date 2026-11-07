import * as THREE from "three";
import type { PlayerActor } from "../gameplay/BallPossessionController.ts";

type PlayerHudCard = {
  element: HTMLDivElement;
  label: HTMLDivElement;
  staminaFill: HTMLDivElement;
};

/** Lightweight screen-space labels and stamina bars for every active court player. */
export class PlayerHUDRenderer {
  private readonly container: HTMLDivElement;
  private readonly cards = new Map<string, PlayerHudCard>();
  private readonly projected = new THREE.Vector3();
  private readonly world = new THREE.Vector3();

  constructor(
    private readonly camera: THREE.Camera,
    parent: HTMLElement,
    containerId = "game-hud-overlay"
  ) {
    const existing = document.getElementById(containerId);
    if (existing instanceof HTMLDivElement) {
      this.container = existing;
    } else {
      this.container = document.createElement("div");
      this.container.id = containerId;
      parent.appendChild(this.container);
    }
    this.container.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;overflow:hidden;z-index:4";
  }

  registerPlayerHUDElement(player: PlayerActor): void {
    if (this.cards.has(player.id)) return;

    const card = document.createElement("div");
    card.style.cssText = "position:absolute;display:flex;flex-direction:column;align-items:center;gap:2px;transform:translate(-50%,-100%);color:#fff;font:700 10px Arial,sans-serif;text-shadow:0 1px 3px #000,1px 0 2px #000;white-space:nowrap";

    const label = document.createElement("div");
    label.textContent = player.id;
    card.appendChild(label);

    const frame = document.createElement("div");
    frame.style.cssText = "width:44px;height:4px;background:#111c;border:1px solid #fff9;border-radius:3px;overflow:hidden";
    const fill = document.createElement("div");
    fill.style.cssText = "width:100%;height:100%;background:#20e060";
    frame.appendChild(fill);
    card.appendChild(frame);
    this.container.appendChild(card);
    this.cards.set(player.id, { element: card, label, staminaFill: fill });
  }

  updateHUDOverlays(players: readonly PlayerActor[]): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    for (const player of players) {
      let card = this.cards.get(player.id);
      if (!card) {
        this.registerPlayerHUDElement(player);
        card = this.cards.get(player.id);
      }
      if (!card) continue;

      player.mesh.getWorldPosition(this.world);
      this.world.y += 2.05;
      this.projected.copy(this.world).project(this.camera);

      const visible = this.projected.z >= -1 && this.projected.z <= 1 &&
        this.projected.x >= -1.15 && this.projected.x <= 1.15 &&
        this.projected.y >= -1.15 && this.projected.y <= 1.15;
      card.element.style.display = visible ? "flex" : "none";
      if (!visible) continue;

      card.element.style.left = `${(this.projected.x * 0.5 + 0.5) * width}px`;
      card.element.style.top = `${(-this.projected.y * 0.5 + 0.5) * height}px`;

      const stamina = THREE.MathUtils.clamp(player.stamina, 0, 100);
      card.staminaFill.style.width = `${stamina}%`;
      card.staminaFill.style.background = stamina <= 30 ? "#ff3838" : stamina <= 65 ? "#ffd43b" : "#20e060";
    }
  }

  purgeHUDContainerMemory(): void {
    this.container.replaceChildren();
    this.cards.clear();
  }

  dispose(): void {
    this.purgeHUDContainerMemory();
    this.container.remove();
  }
}
