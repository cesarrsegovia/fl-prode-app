import { MatchStatus } from '@prisma/client';

const CANCELLED_NAMES = new Set([
  'STATUS_POSTPONED',
  'STATUS_CANCELED',
  'STATUS_CANCELLED',
  'STATUS_ABANDONED',
  'STATUS_FORFEIT',
  'STATUS_SUSPENDED',
]);

/**
 * Mapea el estado de ESPN (status.type.state + status.type.name + completed)
 * al enum MatchStatus.
 */
export function statusFromEspn(
  state: string,
  name: string,
  completed: boolean,
): MatchStatus {
  if (CANCELLED_NAMES.has(name)) return MatchStatus.CANCELLED;
  if (completed || state === 'post') return MatchStatus.FINISHED;
  if (state === 'in') return MatchStatus.LIVE;
  return MatchStatus.PENDING;
}
