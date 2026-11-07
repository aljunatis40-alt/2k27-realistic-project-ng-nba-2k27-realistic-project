import * as THREE from "three";

/**
 * One InstancedMesh represents many repeated spectators. Keep detailed animated
 * rigs only in a small courtside zone; use this for mid/far stands.
 */
export class CrowdInstancing {
  readonly mesh: THREE.InstancedMesh;
  private readonly dummy = new THREE.Object3D();

  constructor(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    count: number
  ) {
    this.mesh = new THREE.InstancedMesh(geometry, material, count);
    this.mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    this.mesh.frustumCulled = true;
  }

  setSeat(index: number, position: THREE.Vector3, yaw: number, scale = 1): void {
    this.dummy.position.copy(position);
    this.dummy.rotation.set(0, yaw, 0);
    this.dummy.scale.setScalar(scale);
    this.dummy.updateMatrix();
    this.mesh.setMatrixAt(index, this.dummy.matrix);
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  setCrowdTint(index: number, color: THREE.Color): void {
    this.mesh.setColorAt(index, color);
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
