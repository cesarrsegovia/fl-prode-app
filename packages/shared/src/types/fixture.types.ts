export interface Season {
  id: string;
  name: string;
  isActive: boolean;
}

export interface Fixture {
  id: string;
  seasonId: string;
  round: number;
  closeAt: Date;
}

export interface FixtureWithMatches extends Fixture {
  matches: Match[];
}

export interface Match {
  id: string;
  fixtureId: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  startTime: Date;
  status: MatchStatus;
}

export enum MatchStatus {
  PENDING = 'PENDING',
  LIVE = 'LIVE',
  FINISHED = 'FINISHED',
  CANCELLED = 'CANCELLED',
}
