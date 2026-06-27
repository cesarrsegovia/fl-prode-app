import { POINTS_CHAMPION } from '@prode/shared';

export function resolveChampionPoints(
  pickedTeamId: string,
  winningTeamId: string | null,
): number {
  if (!winningTeamId) return 0;
  return pickedTeamId === winningTeamId ? POINTS_CHAMPION : 0;
}
