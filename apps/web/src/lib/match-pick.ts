import { Result } from '@prode/shared';

/**
 * Normaliza el marcador al editar UN lado. El marcador es todo-o-nada: tocar un
 * lado expresa intención de apostar, así que si el otro está vacío pasa a 0 (el
 * usuario percibe "2 – " como "2-0"). Borrar un lado (dejarlo vacío) no toca el
 * otro: si ambos quedan vacíos no hay marcador (no suma bonus).
 *
 * @param side  lado que el usuario acaba de editar
 * @param value nuevo valor de ESE lado (undefined si lo borró)
 * @param other valor actual del OTRO lado
 */
export function normalizeScoreInput(
  side: 'home' | 'away',
  value: number | undefined,
  other: number | undefined,
): { home?: number; away?: number } {
  // Si se completó este lado y el otro está vacío, el otro pasa a 0.
  const filledOther = value !== undefined && other === undefined ? 0 : other;
  return side === 'home'
    ? { home: value, away: filledOther }
    : { home: filledOther, away: value };
}

/**
 * Normaliza un marcador GUARDADO al cargarlo. Picks viejos podían quedar con un
 * solo lado (el otro null). Como tener un lado cargado implica que se apostó
 * marcador, el lado faltante pasa a 0. Ambos null = sin marcador (undefined).
 * Distingue null (vacío) de 0 (valor cargado).
 */
export function normalizeSavedScore(
  home: number | null,
  away: number | null,
): { home?: number; away?: number } {
  if (home === null && away === null) return { home: undefined, away: undefined };
  return { home: home ?? 0, away: away ?? 0 };
}

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
  // El marcador (bonus exacto) es una apuesta OPCIONAL e independiente del
  // ganador. Si está incompleto, no inventamos goles: forzar un marcador haría
  // que el usuario pudiera sumar el bonus por acertar un resultado que nunca
  // jugó. Solo se ajusta cuando ya hay un marcador completo y contradice al pick.
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
