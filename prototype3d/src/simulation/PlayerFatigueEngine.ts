import * as THREE from "three";

export type FatigueConfig = {
  maxStamina?: number;
  sprintBurnRate?: number;
  recoveryRate?: number;
  dryRoughness?: number;
  sweatyRoughness?: number;
  maxClearcoat?: number;
};

export class PlayerFatigueEngine {
  readonly maxStamina: number;
  private stamina: number;
  private sprintBurnRate: number;
  private recoveryRate: number;
  private readonly materials: THREE.Material[];
  private readonly config: Required<Pick<FatigueConfig, "dryRoughness" | "sweatyRoughness" | "maxClearcoat">>;

  constructor(materials: THREE.Material[] = [], config: FatigueConfig = {}) {
    this.maxStamina = Math.max(1, config.maxStamina ?? 100);
    this.stamina = this.maxStamina;
    this.sprintBurnRate = Math.max(0, config.sprintBurnRate ?? 3.5);
    this.recoveryRate = Math.max(0, config.recoveryRate ?? 2.0);
    this.materials = materials;
    this.config = {
      dryRoughness: config.dryRoughness ?? 0.45,
      sweatyRoughness: config.sweatyRoughness ?? 0.12,
      maxClearcoat: config.maxClearcoat ?? 0.75
    };
    this.applySweatVisuals();
  }

  update(deltaSeconds: number, sprinting: boolean): void {
    const dt = Math.min(Math.max(deltaSeconds, 0), 0.05);
    if (sprinting && this.stamina > 0) {
      this.stamina = Math.max(0, this.stamina - this.sprintBurnRate * dt);
    } else {
      this.stamina = Math.min(this.maxStamina, this.stamina + this.recoveryRate * dt);
    }
    this.applySweatVisuals();
  }

  get currentStamina(): number {
    return this.stamina;
  }

  get fatiguePercentage(): number {
    return 1 - this.stamina / this.maxStamina;
  }

  get canSprint(): boolean {
    return this.stamina > 0.5;
  }

  setRates(burnRate: number, recoveryRate: number): void {
    this.sprintBurnRate = Math.max(0, burnRate);
    this.recoveryRate = Math.max(0, recoveryRate);
  }

  private applySweatVisuals(): void {
    const fatigue = this.fatiguePercentage;
    for (const material of this.materials) {
      const physical = material as THREE.MeshPhysicalMaterial;
      if ("roughness" in material) {
        physical.roughness = THREE.MathUtils.lerp(
          this.config.dryRoughness,
          this.config.sweatyRoughness,
          fatigue
        );
      }
      if ("clearcoat" in material) {
        physical.clearcoat = this.config.maxClearcoat * fatigue;
        physical.clearcoatRoughness = THREE.MathUtils.lerp(0.35, 0.08, fatigue);
      }
      material.needsUpdate = true;
    }
  }
}
