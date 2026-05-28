import { Prisma } from '@prisma/client';

export interface RankableScore {
  total: number;
  correctWinners: number;
  exactScores: number;
  exactGoalsSum: number;
  firstPredictionAt: Date | null;
}

export const GROUP_SCORE_ORDER_BY: Prisma.GroupScoreOrderByWithRelationInput[] = [
  { total: 'desc' },
  { correctWinners: 'desc' },
  { exactScores: 'desc' },
  { exactGoalsSum: 'desc' },
  { firstPredictionAt: 'asc' },
];

export function compareScoreRows(a: RankableScore, b: RankableScore): number {
  if (b.total !== a.total) return b.total - a.total;
  if (b.correctWinners !== a.correctWinners) return b.correctWinners - a.correctWinners;
  if (b.exactScores !== a.exactScores) return b.exactScores - a.exactScores;
  if (b.exactGoalsSum !== a.exactGoalsSum) return b.exactGoalsSum - a.exactGoalsSum;
  const at = a.firstPredictionAt ? a.firstPredictionAt.getTime() : Infinity;
  const bt = b.firstPredictionAt ? b.firstPredictionAt.getTime() : Infinity;
  return at - bt;
}
