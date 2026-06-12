import { MatchStatus } from '@prisma/client';

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
}

/** Partido local mínimo que el provider necesita para consultar resultados. */
export interface ActiveMatch {
  id: string;
  externalId: string;
  startTime: Date;
}

export interface ResultsProvider {
  /** Trae los resultados remotos de los partidos activos dados. */
  fetchResults(activeMatches: ActiveMatch[]): Promise<RemoteResult[]>;
}

/** Token DI para inyectar el provider seleccionado. */
export const RESULTS_PROVIDER = Symbol('RESULTS_PROVIDER');
