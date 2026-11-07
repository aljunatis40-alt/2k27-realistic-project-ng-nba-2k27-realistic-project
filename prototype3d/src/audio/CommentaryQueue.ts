export type CommentaryCue = {
  id: string;
  priority: number;
  cooldownMs: number;
  locale: "en" | "tl";
  clipId: string;
};

export class CommentaryQueue {
  private queue: CommentaryCue[] = [];
  private lastPlayed = new Map<string, number>();

  enqueue(cue: CommentaryCue, nowMs = performance.now()): void {
    const last = this.lastPlayed.get(cue.id) ?? -Infinity;
    if (nowMs - last < cue.cooldownMs) return;
    this.queue.push(cue);
    this.queue.sort((a, b) => b.priority - a.priority);
  }

  next(nowMs = performance.now()): CommentaryCue | undefined {
    const cue = this.queue.shift();
    if (cue) this.lastPlayed.set(cue.id, nowMs);
    return cue;
  }

  clear(): void { this.queue = []; }
}
