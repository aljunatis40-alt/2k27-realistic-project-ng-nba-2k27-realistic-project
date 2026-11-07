import * as THREE from "three";

export type CameraMode =
  | "2k" | "broadcast" | "drive" | "nosebleed" | "rim" | "playerPOV";

type Profile = { offset: THREE.Vector3; fov: number; damping: number };

const profiles: Record<CameraMode, Profile> = {
  "2k": { offset: new THREE.Vector3(0, 15, 12), fov: 48, damping: 5 },
  broadcast: { offset: new THREE.Vector3(0, 21, 4), fov: 42, damping: 3 },
  drive: { offset: new THREE.Vector3(-7, 5, 5), fov: 58, damping: 8 },
  nosebleed: { offset: new THREE.Vector3(0, 34, 0), fov: 38, damping: 2 },
  rim: { offset: new THREE.Vector3(4, 5, 7), fov: 62, damping: 7 },
  playerPOV: { offset: new THREE.Vector3(0, 2, -1), fov: 76, damping: 10 }
};

export class CameraDirector {
  mode: CameraMode = "broadcast";
  private readonly desired = new THREE.Vector3();

  constructor(private readonly camera: THREE.PerspectiveCamera) {}

  setMode(mode: CameraMode): void {
    this.mode = mode;
  }

  update(dt: number, focus: THREE.Vector3, orbitYaw = 0): void {
    const profile = profiles[this.mode];
    this.desired.copy(profile.offset).applyAxisAngle(
      new THREE.Vector3(0, 1, 0), orbitYaw
    ).add(focus);

    const alpha = 1 - Math.exp(-profile.damping * dt);
    this.camera.position.lerp(this.desired, alpha);
    this.camera.lookAt(focus);
    this.camera.fov = THREE.MathUtils.damp(
      this.camera.fov, profile.fov, profile.damping, dt
    );
    this.camera.updateProjectionMatrix();
  }
}
