export type GameEvents = {
  ShotMade: { shooterId: string; points: 2 | 3; clutch: boolean };
  DunkStarted: { playerId: string; defenderId?: string };
  FoulCalled: { playerId: string; shooting: boolean; severity: "common" | "flagrant" };
  DeadBall: { reason: "out" | "foul" | "timeout" | "quarter" };
  BuzzerBeater: { shooterId: string; points: 2 | 3 };
  TimeoutStarted: { teamId: string };
  PossessionChanged: { teamId: string };
};

type Listener<T> = (payload: T) => void;

export class EventBus<E extends object> {
  private listeners = new Map<keyof E, Set<Listener<never>>>();

  on<K extends keyof E>(event: K, listener: Listener<E[K]>): () => void {
    let bucket = this.listeners.get(event);
    if (!bucket) {
      bucket = new Set<Listener<never>>();
      this.listeners.set(event, bucket);
    }
    bucket.add(listener as Listener<never>);
    return () => bucket?.delete(listener as Listener<never>);
  }

  emit<K extends keyof E>(event: K, payload: E[K]): void {
    this.listeners.get(event)?.forEach((listener) => {
      (listener as Listener<E[K]>)(payload);
    });
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const gameEvents = new EventBus<GameEvents>();
