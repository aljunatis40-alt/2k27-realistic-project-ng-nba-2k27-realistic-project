export type RosterPlayer = {
  id: string;
  position: "PG" | "SG" | "SF" | "PF" | "C";
  stamina: number; // 0..1
  fouls: number;
  minutesPlayed: number;
  available: boolean;
};

export class RotationManager {
  chooseSubstitutions(
    onCourt: RosterPlayer[],
    bench: RosterPlayer[],
    staminaThreshold = 0.28,
    foulLimit = 5
  ): Array<{ outId: string; inId: string }> {
    const changes: Array<{ outId: string; inId: string }> = [];
    const usedIncoming = new Set<string>();

    for (const tired of onCourt) {
      if (tired.stamina > staminaThreshold && tired.fouls < foulLimit) continue;
      const replacement = bench
        .filter((p) => p.available && !usedIncoming.has(p.id))
        .sort((a, b) => {
          const positionMatch = Number(b.position === tired.position)
            - Number(a.position === tired.position);
          return positionMatch || b.stamina - a.stamina;
        })[0];

      if (replacement) {
        changes.push({ outId: tired.id, inId: replacement.id });
        usedIncoming.add(replacement.id);
      }
    }
    return changes;
  }
}
