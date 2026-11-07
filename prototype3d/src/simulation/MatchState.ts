export type TeamState = {
  id: string;
  name: string;
  score: number;
  teamFouls: number;
  timeouts: number;
};

export type PlayerStats = {
  points: number;
  assists: number;
  rebounds: number;
  steals: number;
  blocks: number;
  fouls: number;
};

export type MatchState = {
  home: TeamState;
  away: TeamState;
  period: number;
  gameClockSeconds: number;
  shotClockSeconds: number;
  possessionTeamId: string;
  playerStats: Record<string, PlayerStats>;
};

export function createMatchState(home: TeamState, away: TeamState): MatchState {
  return {
    home: { ...home }, away: { ...away },
    period: 1, gameClockSeconds: 720, shotClockSeconds: 24,
    possessionTeamId: home.id, playerStats: {}
  };
}

export function addScore(state: MatchState, teamId: string, points: 2 | 3): void {
  const team = teamId === state.home.id ? state.home
    : teamId === state.away.id ? state.away : undefined;
  if (!team) throw new Error(`Unknown team: ${teamId}`);
  team.score += points;
}
