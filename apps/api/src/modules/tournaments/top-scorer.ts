import { POINTS_TOP_SCORER } from '@prode/shared';

export function resolveTopScorerPoints(
  pickedPlayerId: string,
  winningPlayerId: string | null,
): number {
  if (!winningPlayerId) return 0;
  return pickedPlayerId === winningPlayerId ? POINTS_TOP_SCORER : 0;
}
