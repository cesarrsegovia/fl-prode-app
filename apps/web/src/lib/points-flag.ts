import type { PointsBreakdownResult } from './points-breakdown';

/** Tono visual de la cinta de puntos según la CALIDAD del acierto, no el monto. */
export type PointsFlagTone = 'win' | 'partial' | 'miss';

export function pointsFlagTone(b: PointsBreakdownResult): PointsFlagTone {
  if (b.exact > 0) return 'win';
  if (b.winner > 0) return 'partial';
  return 'miss';
}
