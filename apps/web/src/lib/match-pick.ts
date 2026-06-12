import { Result } from '@prode/shared';

/**
 * Deriva el ganador (L/E/V) a partir de un marcador. Devuelve undefined si el
 * marcador está incompleto, para no forzar un resultado sin datos.
 */
export function resultFromScore(
  home?: number,
  away?: number,
): Result | undefined {
  if (home === undefined || away === undefined) return undefined;
  if (home > away) return Result.HOME;
  if (home < away) return Result.AWAY;
  return Result.DRAW;
}

/**
 * Ajusta el marcador lo mínimo posible para que sea coherente con el resultado
 * elegido. Si el marcador está incompleto, no inventa goles (solo se selecciona
 * el resultado sin tocar el marcador).
 */
export function scoreForResult(
  result: Result,
  home?: number,
  away?: number,
): { home?: number; away?: number } {
  if (home === undefined || away === undefined) return { home, away };

  switch (result) {
    case Result.HOME:
      return home > away ? { home, away } : { home: away + 1, away };
    case Result.AWAY:
      return away > home ? { home, away } : { home, away: home + 1 };
    case Result.DRAW: {
      const max = Math.max(home, away);
      return { home: max, away: max };
    }
  }
}
