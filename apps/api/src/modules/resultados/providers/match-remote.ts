import type { RemoteResult } from './results-provider';

/** Partido local con lo mínimo para vincularlo a un resultado remoto. */
export interface MatchableLocal {
  id: string;
  externalId: string;
  startTime: Date;
  homeAbbr: string | null;
  awayAbbr: string | null;
}

/**
 * Encuentra el partido local correspondiente a un resultado remoto.
 *
 * Estrategia en dos pasos:
 * 1. Por externalId exacto — funciona con providers cuyos IDs son reales
 *    (API-Football).
 * 2. Fallback por abreviaturas de equipo + horario de inicio exacto — para
 *    providers cuyo event id NO coincide con el externalId sembrado (ESPN).
 *
 * Devuelve el match local, o null si ninguno corresponde.
 */
export function matchRemoteToLocal<T extends MatchableLocal>(
  locals: T[],
  remote: RemoteResult,
): T | null {
  const byId = locals.find((l) => l.externalId === remote.externalId);
  if (byId) return byId;

  const rHome = remote.homeAbbr?.trim().toLowerCase();
  const rAway = remote.awayAbbr?.trim().toLowerCase();
  const rStart = remote.startTime ? new Date(remote.startTime).getTime() : null;
  if (!rHome || !rAway || rStart === null || Number.isNaN(rStart)) return null;

  const byTeams = locals.find(
    (l) =>
      l.homeAbbr?.trim().toLowerCase() === rHome &&
      l.awayAbbr?.trim().toLowerCase() === rAway &&
      l.startTime.getTime() === rStart,
  );
  return byTeams ?? null;
}
