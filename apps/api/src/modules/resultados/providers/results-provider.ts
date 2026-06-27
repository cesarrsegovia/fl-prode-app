import { MatchStage, MatchStatus } from '@prisma/client';

/** Resultado normalizado de un partido, agnóstico del proveedor externo. */
export interface RemoteResult {
  /** Event id del proveedor (se guarda en Match.externalId). */
  externalId: string;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
  homeScoreET?: number | null;
  awayScoreET?: number | null;
  homePens?: number | null;
  awayPens?: number | null;
  /**
   * Abreviaturas y horario del evento remoto. Permiten matchear contra el
   * partido local cuando el externalId no coincide (p.ej. ESPN, cuyo event id
   * difiere del externalId sembrado). API-Football no los puebla.
   */
  homeAbbr?: string | null;
  awayAbbr?: string | null;
  startTime?: string | null;
}

/** Partido local mínimo que el provider necesita para consultar resultados. */
export interface ActiveMatch {
  id: string;
  externalId: string;
  startTime: Date;
}

/** Forma local usada para vincular resultados remotos (ver matchRemoteToLocal). */
export interface ActiveMatchWithTeams extends ActiveMatch {
  fixtureId: string;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
  homeAbbr: string | null;
  awayAbbr: string | null;
  stage: MatchStage;
  tournamentId: string;
  /** Solo para propagación de eliminación. */
  homeTeamId: string | null;
  awayTeamId: string | null;
}

/** Fila de la tabla de posiciones de un grupo, normalizada. */
export interface RemoteStandingTeam {
  /** Abreviatura del equipo según el proveedor (matchea Team.shortName local). */
  teamAbbr: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  /** Posición en el grupo (rank del proveedor; respeta sus desempates oficiales). */
  position: number;
}

/** Tabla de posiciones de un grupo del torneo. */
export interface RemoteStandingGroup {
  /** Nombre del grupo según el proveedor (p.ej. "Group A"). */
  groupName: string;
  teams: RemoteStandingTeam[];
}

export interface ResultsProvider {
  /** Trae los resultados remotos de los partidos activos dados. */
  fetchResults(activeMatches: ActiveMatch[]): Promise<RemoteResult[]>;

  /**
   * Trae la tabla de posiciones de los grupos del torneo, ya calculada por el
   * proveedor. Opcional: no todos los providers la implementan.
   */
  fetchStandings?(): Promise<RemoteStandingGroup[]>;
}

/** Token DI para inyectar el provider seleccionado. */
export const RESULTS_PROVIDER = Symbol('RESULTS_PROVIDER');
