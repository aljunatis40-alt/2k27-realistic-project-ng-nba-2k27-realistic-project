export interface PlayerMatchStats {
  playerID: string;
  playerName: string;
  pointsScored: number;
  assistsRecorded: number;
  reboundsCollected: number;
}

export interface LeaderboardView {
  panel: HTMLElement;
  finalScoreBanner: HTMLElement;
  rowsParent: HTMLElement;
  rowTemplate: HTMLElement;
}

export interface LeaderboardOptions {
  maxRows?: number;
  onDisplayed?: (topPlayers: readonly PlayerMatchStats[]) => void;
}

export class PostGameLeaderboard {
  private readonly stats = new Map<string, PlayerMatchStats>();
  private readonly maxRows: number;

  constructor(
    private readonly view: LeaderboardView,
    private readonly options: LeaderboardOptions = {}
  ) {
    this.maxRows = Math.max(1, Math.floor(options.maxRows ?? 5));
    this.view.panel.hidden = true;
    this.view.rowTemplate.hidden = true;
  }

  /** Adds stat deltas; pass zero for categories that did not change. */
  updateLivePlayerStatTrack(
    id: string,
    name: string,
    points = 0,
    assists = 0,
    rebounds = 0
  ): void {
    if (!id.trim() || !name.trim()) throw new Error("Player ID and name are required.");
    for (const value of [points, assists, rebounds]) {
      if (!Number.isFinite(value) || value < 0) {
        throw new RangeError("Stat updates must be finite, non-negative increments.");
      }
    }

    const current = this.stats.get(id) ?? {
      playerID: id,
      playerName: name,
      pointsScored: 0,
      assistsRecorded: 0,
      reboundsCollected: 0
    };
    current.playerName = name;
    current.pointsScored += points;
    current.assistsRecorded += assists;
    current.reboundsCollected += rebounds;
    this.stats.set(id, current);
  }

  compileAndDisplayPostGameLeaderboard(finalScore: string): PlayerMatchStats[] {
    this.view.finalScoreBanner.textContent = finalScore.toLocaleUpperCase();
    this.view.rowsParent.replaceChildren();

    const ranked = [...this.stats.values()]
      .sort((a, b) =>
        b.pointsScored - a.pointsScored ||
        b.assistsRecorded - a.assistsRecorded ||
        b.reboundsCollected - a.reboundsCollected ||
        a.playerName.localeCompare(b.playerName)
      )
      .slice(0, this.maxRows)
      .map((player) => ({ ...player }));

    for (const player of ranked) {
      const row = this.view.rowTemplate.cloneNode(true) as HTMLElement;
      row.hidden = false;
      row.removeAttribute("id");
      this.setField(row, "player-name", player.playerName.toLocaleUpperCase());
      this.setField(row, "points", `${player.pointsScored} PTS`);
      this.setField(row, "assists", `${player.assistsRecorded} AST`);
      this.setField(row, "rebounds", `${player.reboundsCollected} REB`);
      row.dataset.playerId = player.playerID;
      this.view.rowsParent.appendChild(row);
    }

    this.view.panel.hidden = false;
    this.options.onDisplayed?.(ranked);
    return ranked;
  }

  closeLeaderboardPanelOverlay(): void {
    this.view.panel.hidden = true;
  }

  resetMatchStats(): void {
    this.stats.clear();
    this.view.rowsParent.replaceChildren();
    this.view.panel.hidden = true;
  }

  getPlayerStats(playerID: string): PlayerMatchStats | undefined {
    const player = this.stats.get(playerID);
    return player ? { ...player } : undefined;
  }

  getAllPlayerStats(): PlayerMatchStats[] {
    return [...this.stats.values()].map((player) => ({ ...player }));
  }

  private setField(row: HTMLElement, field: string, value: string): void {
    const element = row.querySelector<HTMLElement>(`[data-stat="${field}"]`);
    if (element) element.textContent = value;
  }
}
