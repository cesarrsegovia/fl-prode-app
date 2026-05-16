import axios, { AxiosInstance } from 'axios';

// Tipos mínimos que usamos del response de API-Football (v3.football.api-sports.io).
// La API devuelve más campos; sólo modelamos los que nos sirven.

export interface AFLeague {
  league: { id: number; name: string; type: string; logo: string };
  country: { name: string; code: string | null; flag: string | null };
  seasons: Array<{
    year: number;
    start: string;
    end: string;
    current: boolean;
  }>;
}

export interface AFTeam {
  team: {
    id: number;
    name: string;
    code: string | null;
    country: string;
    founded: number | null;
    logo: string;
  };
  venue?: { id: number | null; name: string | null };
}

export interface AFStandings {
  league: {
    id: number;
    name: string;
    season: number;
    standings: Array<
      Array<{
        rank: number;
        team: { id: number; name: string; logo: string };
        group: string; // "Group A", ...
        points: number;
        goalsDiff: number;
        all: {
          played: number;
          win: number;
          draw: number;
          lose: number;
          goals: { for: number; against: number };
        };
      }>
    >;
  };
}

export interface AFVenue {
  id: number;
  name: string;
  address: string | null;
  city: string;
  country: string;
  capacity: number | null;
  surface: string | null;
  image: string | null;
}

export interface AFFixture {
  fixture: {
    id: number;
    referee: string | null;
    timezone: string;
    date: string; // ISO
    timestamp: number;
    venue: { id: number | null; name: string | null; city: string | null };
    status: { long: string; short: string; elapsed: number | null };
  };
  league: {
    id: number;
    name: string;
    season: number;
    round: string; // "Group Stage - 1", "Round of 32", ...
  };
  teams: {
    home: { id: number | null; name: string; logo: string | null };
    away: { id: number | null; name: string; logo: string | null };
  };
  goals: { home: number | null; away: number | null };
  score: {
    halftime: { home: number | null; away: number | null };
    fulltime: { home: number | null; away: number | null };
    extratime: { home: number | null; away: number | null };
    penalty: { home: number | null; away: number | null };
  };
}

export interface AFPlayer {
  player: {
    id: number;
    name: string;
    age: number | null;
    number: number | null;
    position: string | null;
    photo: string | null;
  };
}

export interface AFSquadResponse {
  team: { id: number; name: string; logo: string };
  players: AFPlayer['player'][];
}

interface AFEnvelope<T> {
  get: string;
  parameters: Record<string, string>;
  errors: unknown[] | Record<string, string>;
  results: number;
  paging: { current: number; total: number };
  response: T[];
}

export class ApiFootballClient {
  private readonly http: AxiosInstance;

  constructor(apiKey: string, baseUrl: string) {
    this.http = axios.create({
      baseURL: baseUrl,
      timeout: 15_000,
      headers: { 'x-apisports-key': apiKey },
    });
  }

  private async get<T>(path: string, params?: Record<string, unknown>): Promise<T[]> {
    const res = await this.http.get<AFEnvelope<T>>(path, { params });
    const errs = res.data?.errors;
    const hasErrors = Array.isArray(errs)
      ? errs.length > 0
      : errs && Object.keys(errs).length > 0;
    if (hasErrors) {
      throw new Error(
        `API-Football error en ${path}: ${JSON.stringify(errs)}`,
      );
    }
    return res.data?.response ?? [];
  }

  league(leagueId: number, season: number): Promise<AFLeague[]> {
    return this.get<AFLeague>('/leagues', { id: leagueId, season });
  }

  teams(leagueId: number, season: number): Promise<AFTeam[]> {
    return this.get<AFTeam>('/teams', { league: leagueId, season });
  }

  standings(leagueId: number, season: number): Promise<AFStandings[]> {
    return this.get<AFStandings>('/standings', { league: leagueId, season });
  }

  venue(venueId: number): Promise<AFVenue[]> {
    return this.get<AFVenue>('/venues', { id: venueId });
  }

  fixtures(leagueId: number, season: number): Promise<AFFixture[]> {
    return this.get<AFFixture>('/fixtures', { league: leagueId, season });
  }

  squad(teamId: number): Promise<AFSquadResponse[]> {
    return this.get<AFSquadResponse>('/players/squads', { team: teamId });
  }
}
