import * as THREE from "three";

export type GraphicsPreset = "MobileLow" | "MobileMedium" | "NextGenUltra";

export interface GraphicsQualityOptions {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  keyLight: THREE.DirectionalLight;
  courtMaterial: THREE.MeshStandardMaterial;
  playerRoots?: THREE.Object3D[];
}

type PresetConfig = {
  renderScale: number;
  targetFps: number;
  shadows: boolean;
  shadowMapSize: number;
  shadowDistance: number;
  courtRoughness: number;
};

const PRESETS: Record<GraphicsPreset, PresetConfig> = {
  MobileLow: {
    renderScale: 0.7,
    targetFps: 60,
    shadows: false,
    shadowMapSize: 0,
    shadowDistance: 15,
    courtRoughness: 0.9
  },
  MobileMedium: {
    renderScale: 0.85,
    targetFps: 60,
    shadows: true,
    shadowMapSize: 1024,
    shadowDistance: 35,
    courtRoughness: 0.5
  },
  NextGenUltra: {
    renderScale: 1,
    targetFps: 120,
    shadows: true,
    shadowMapSize: 2048,
    shadowDistance: 75,
    courtRoughness: 0.12
  }
};

/**
 * Hardware-aware Three.js quality presets. Pixel ratio and shadow settings are
 * adapted for mobile GPUs. The browser/display still controls the true refresh
 * rate; targetFps is a render ceiling, not a guarantee of 60/120 FPS.
 */
export class GraphicsQualityManager {
  activeGraphicsPreset: GraphicsPreset = "MobileMedium";
  private lastRenderTime = 0;
  private readonly basePixelRatio: number;

  constructor(private readonly options: GraphicsQualityOptions) {
    this.basePixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    this.applyGraphicsSettingsPreset(this.activeGraphicsPreset);
  }

  applyGraphicsSettingsPreset(preset: GraphicsPreset): void {
    this.activeGraphicsPreset = preset;
    const config = PRESETS[preset];
    const { renderer, keyLight, courtMaterial, playerRoots = [] } = this.options;

    renderer.setPixelRatio(Math.max(0.5, this.basePixelRatio * config.renderScale));
    renderer.shadowMap.enabled = config.shadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    keyLight.castShadow = config.shadows;
    if (config.shadows) {
      keyLight.shadow.mapSize.set(config.shadowMapSize, config.shadowMapSize);
      keyLight.shadow.camera.near = 0.5;
      keyLight.shadow.camera.far = config.shadowDistance;
      keyLight.shadow.camera.left = -18;
      keyLight.shadow.camera.right = 18;
      keyLight.shadow.camera.top = 18;
      keyLight.shadow.camera.bottom = -18;
      keyLight.shadow.needsUpdate = true;
    }

    courtMaterial.roughness = config.courtRoughness;
    courtMaterial.needsUpdate = true;

    for (const root of playerRoots) {
      root.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.castShadow = config.shadows;
          object.receiveShadow = config.shadows;
        }
      });
    }

    renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.lastRenderTime = 0;
  }

  /** Returns false when the selected render ceiling has not elapsed. */
  shouldRender(nowMs: number): boolean {
    const targetFps = PRESETS[this.activeGraphicsPreset].targetFps;
    const frameInterval = 1000 / targetFps;
    if (this.lastRenderTime !== 0 && nowMs - this.lastRenderTime < frameInterval) return false;
    this.lastRenderTime = nowMs;
    return true;
  }

  onQualityDropdownValueMutated(index: number): void {
    const presets: GraphicsPreset[] = ["MobileLow", "MobileMedium", "NextGenUltra"];
    const selected = presets[index];
    if (selected) this.applyGraphicsSettingsPreset(selected);
  }
}
