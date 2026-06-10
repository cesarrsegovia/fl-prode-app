/**
 * Helpers de data fetching para Server Components.
 * No usan NextAuth — para endpoints públicos del torneo (no requieren JWT).
 * Cachean por defecto vía `next.revalidate`; los Server Components consumen
 * directamente desde acá.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000/api';

interface FetchOptions {
  revalidate?: number | false;
  tags?: string[];
}

async function serverGet<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const { revalidate = 60, tags } = opts;
  const res = await fetch(`${API_URL}${path}`, {
    next: {
      revalidate: revalidate === false ? undefined : revalidate,
      tags,
    },
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`GET ${path} → ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ---------- Tipos ----------

export interface TournamentDto {
  id: string;
  externalId: string | null;
  name: string;
  type: 'LEAGUE' | 'CUP' | 'INTERNATIONAL';
  country: string | null;
  startDate: string | null;
  endDate: string | null;
  logoUrl: string | null;
  trophyUrl: string | null;
  isActive: boolean;
  topScorerPlayerId?: string | null;
  topScorerDeadline?: string | null;
  groups?: GroupDto[];
  _count?: { teams?: number; matches?: number; fixtures?: number };
}

export interface GroupDto {
  id: string;
  tournamentId: string;
  name: string;
}

export interface TeamDto {
  id: string;
  externalId: string | null;
  name: string;
  shortName: string | null;
  code: string | null;
  flagUrl: string | null;
  logoUrl: string | null;
  confederation: string | null;
}

export interface StandingDto {
  id: string;
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  team: TeamDto;
}

export interface GroupWithStandingsDto extends GroupDto {
  teams: Array<{ id: string; teamId: string; team: TeamDto }>;
  standings: StandingDto[];
}

export interface VenueDto {
  id: string;
  externalId: string | null;
  name: string;
  city: string | null;
  country: string | null;
  capacity: number | null;
  imageUrl: string | null;
  _count?: { matches: number };
}

export interface MatchDto {
  id: string;
  externalId: string | null;
  stage: 'GROUP' | 'R32' | 'R16' | 'QUARTERFINAL' | 'SEMIFINAL' | 'THIRD_PLACE' | 'FINAL';
  groupId: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeTeamName: string;
  awayTeamName: string;
  startTime: string;
  status: 'PENDING' | 'LIVE' | 'FINISHED' | 'CANCELLED';
  refereeName?: string | null;
  attendance?: number | null;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam?: TeamDto | null;
  awayTeam?: TeamDto | null;
  venue?: VenueDto | null;
  group?: GroupDto | null;
}

export interface FixtureScheduleDto {
  id: string;
  round: number;
  name: string | null;
  closeAt: string;
  matches: MatchDto[];
}

export interface MatchDetailDto extends MatchDto {
  fixture: { id: string; round: number; name: string | null; closeAt: string };
  tournament: { id: string; name: string };
}

export interface PredictionAggregateDto {
  total: number;
  home: number;
  draw: number;
  away: number;
  homePct: number;
  drawPct: number;
  awayPct: number;
}

export interface TeamDetailDto extends TeamDto {
  tournamentTeams: Array<{
    id: string;
    tournament: { id: string; name: string; isActive: boolean };
    group: { id: string; name: string } | null;
    fifaRanking: number | null;
  }>;
}

export interface PlayerDto {
  id: string;
  name: string;
  position: string | null;
  number: number | null;
  photoUrl: string | null;
  age: number | null;
  isStaff: boolean;
  role: string | null;
}

// ---------- Tournament endpoints ----------

export const tournamentApi = {
  active: () => serverGet<TournamentDto | null>('/tournaments/active'),
  one: (id: string) => serverGet<TournamentDto>(`/tournaments/${id}`),
  groups: (id: string) =>
    serverGet<GroupWithStandingsDto[]>(`/tournaments/${id}/groups`),
  schedule: (id: string) =>
    serverGet<FixtureScheduleDto[]>(`/tournaments/${id}/schedule`),
  venues: (id: string) => serverGet<VenueDto[]>(`/tournaments/${id}/venues`),
  teams: (id: string) =>
    serverGet<(TeamDto & { group: string | null; fifaRanking: number | null })[]>(
      `/tournaments/${id}/teams`,
    ),
  bracket: (id: string) => serverGet<MatchDto[]>(`/tournaments/${id}/bracket`),
  bracketPickAggregate: (id: string) =>
    serverGet<{
      total: number;
      picks: Array<{
        team: { id: string; name: string; shortName: string | null; flagUrl: string | null };
        count: number;
        pct: number;
      }>;
    }>(`/tournaments/${id}/bracket-pick/aggregate`),
};

export const matchApi = {
  one: (id: string) => serverGet<MatchDetailDto>(`/matches/${id}`),
  aggregate: (id: string) =>
    serverGet<PredictionAggregateDto>(`/matches/${id}/predictions/aggregate`),
};

export const teamApi = {
  one: (id: string) => serverGet<TeamDetailDto>(`/teams/${id}`),
  matches: (id: string, tournamentId: string) =>
    serverGet<MatchDto[]>(
      `/teams/${id}/matches?tournamentId=${tournamentId}`,
    ),
  squad: (id: string, tournamentId: string) =>
    serverGet<PlayerDto[]>(`/teams/${id}/squad?tournamentId=${tournamentId}`),
};
