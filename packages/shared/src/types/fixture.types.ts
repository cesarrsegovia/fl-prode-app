export interface Season {
  id: string;
  name: string;
  isActive: boolean;
}

export interface Fixture {
  id: string;
  tournamentId: string;
  round: number;
  name: string | null;
  closeAt: Date;
}

export interface FixtureWithMatches extends Fixture {
  matches: Match[];
}

export interface Team {
  id: string;
  externalId: string | null;
  name: string;
  shortName: string | null;
  code: string | null;
  flagUrl: string | null;
  logoUrl: string | null;
  confederation: string | null;
}

export enum MatchStage {
  GROUP = 'GROUP',
  R32 = 'R32',
  R16 = 'R16',
  QUARTERFINAL = 'QUARTERFINAL',
  SEMIFINAL = 'SEMIFINAL',
  THIRD_PLACE = 'THIRD_PLACE',
  FINAL = 'FINAL',
}

export interface Match {
  id: string;
  fixtureId: string;
  tournamentId: string;
  stage: MatchStage;
  groupId: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number | null;
  awayScore: number | null;
  homeScoreET: number | null;
  awayScoreET: number | null;
  homePens: number | null;
  awayPens: number | null;
  startTime: Date;
  status: MatchStatus;
  homeTeam?: Team | null;
  awayTeam?: Team | null;
}

export enum MatchStatus {
  PENDING = 'PENDING',
  LIVE = 'LIVE',
  FINISHED = 'FINISHED',
  CANCELLED = 'CANCELLED',
}
