import { MatchStatus } from '@prisma/client';

const STATUS_FINISHED = ['FT', 'AET', 'PEN'];
const STATUS_LIVE = ['1H', '2H', 'HT', 'ET', 'BT', 'P', 'LIVE'];
const STATUS_CANCELLED = ['PST', 'CANC', 'ABD', 'AWD', 'WO'];

/** Mapea el "short status" de API-Football a nuestro enum MatchStatus. */
export function statusFromApiFootball(short: string): MatchStatus {
  if (STATUS_FINISHED.includes(short)) return MatchStatus.FINISHED;
  if (STATUS_LIVE.includes(short)) return MatchStatus.LIVE;
  if (STATUS_CANCELLED.includes(short)) return MatchStatus.CANCELLED;
  return MatchStatus.PENDING;
}
