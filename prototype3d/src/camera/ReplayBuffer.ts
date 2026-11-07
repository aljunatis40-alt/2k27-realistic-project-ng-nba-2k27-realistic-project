import { Vector3, Quaternion } from "three";

export type ReplaySnapshot = {
  time: number;
  ballPosition: Vector3;
  playerTransforms: Array<{ id: string; position: Vector3; rotation: Quaternion }>;
  gameClockSeconds: number;
};

export class ReplayBuffer {
  private samples: ReplaySnapshot[] = [];

  constructor(
    private readonly durationSeconds = 10,
    private readonly sampleRate = 20
  ) {}

  get sampleInterval(): number { return 1 / this.sampleRate; }

  push(snapshot: ReplaySnapshot): void {
    this.samples.push({
      ...snapshot,
      ballPosition: snapshot.ballPosition.clone(),
      playerTransforms: snapshot.playerTransforms.map((p) => ({
        id: p.id, position: p.position.clone(), rotation: p.rotation.clone()
      }))
    });
    const cutoff = snapshot.time - this.durationSeconds;
    while (this.samples.length && this.samples[0].time < cutoff) {
      this.samples.shift();
    }
  }

  getWindow(endTime: number, seconds = 5): ReplaySnapshot[] {
    const start = endTime - seconds;
    return this.samples.filter((s) => s.time >= start && s.time <= endTime);
  }

  clear(): void { this.samples = []; }
}
