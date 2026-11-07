import * as THREE from "three";

export type CameraMode = "2k" | "broadcast" | "nosebleed" | "rim";

type CameraProfile = {
  offset: THREE.Vector3;
  fov: number;
  positionSmoothSpeed: number;
  rotationSmoothSpeed: number;
};

const profiles: Record<CameraMode, CameraProfile> = {
  "2k": {
    offset: new THREE.Vector3(0, 8.5, 9),
    fov: 48,
    positionSmoothSpeed: 4.5,
    rotationSmoothSpeed: 6
  },
  broadcast: {
    offset: new THREE.Vector3(14, 6, 0),
    fov: 42,
    positionSmoothSpeed: 4.5,
    rotationSmoothSpeed: 6
  },
  nosebleed: {
    offset: new THREE.Vector3(22, 15, -2),
    fov: 38,
    positionSmoothSpeed: 3,
    rotationSmoothSpeed: 4
  },
  rim: {
    offset: new THREE.Vector3(0, 3.5, 4.5),
    fov: 62,
    positionSmoothSpeed: 6,
    rotationSmoothSpeed: 7
  }
};

/** Smooth camera presets translated from the Unity camera-engine specification. */
export class CameraDirector {
  mode: CameraMode = "2k";
  private readonly desiredPosition = new THREE.Vector3();
  private readonly lookDirection = new THREE.Vector3();
  private readonly worldUp = new THREE.Vector3(0, 1, 0);

  constructor(private readonly camera: THREE.PerspectiveCamera) {
    this.camera.fov = profiles[this.mode].fov;
    this.camera.updateProjectionMatrix();
  }

  setMode(mode: CameraMode): void {
    this.mode = mode;
  }

  update(dt: number, focus: THREE.Vector3): void {
    const profile = profiles[this.mode];
    const safeDt = Math.max(0, Math.min(dt, 0.05));
    const positionAlpha = 1 - Math.exp(-profile.positionSmoothSpeed * safeDt);
    const rotationAlpha = 1 - Math.exp(-profile.rotationSmoothSpeed * safeDt);

    this.desiredPosition.copy(focus).add(profile.offset);
    this.camera.position.lerp(this.desiredPosition, positionAlpha);

    this.lookDirection.copy(focus).sub(this.camera.position);
    if (this.lookDirection.lengthSq() > 0.0001) {
      const desiredRotation = new THREE.Quaternion().setFromRotationMatrix(
        new THREE.Matrix4().lookAt(this.camera.position, focus, this.worldUp)
      );
      this.camera.quaternion.slerp(desiredRotation, rotationAlpha);
    }

    const fovAlpha = 1 - Math.exp(-profile.positionSmoothSpeed * safeDt);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, profile.fov, fovAlpha);
    this.camera.updateProjectionMatrix();
  }
}
