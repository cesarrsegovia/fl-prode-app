import {
  CAPTAIN_MULTIPLIER,
  POINTS_CORRECT_RESULT,
  POINTS_EXACT_SCORE,
  Result,
} from '@prode/shared';

export interface PredictionParts {
  result: Result;
  homeScoreGuess: number | null;
  awayScoreGuess: number | null;
  isCaptain: boolean;
}

export interface MatchResultParts {
  homeScore: number | null;
  awayScore: number | null;
  status: 'PENDING' | 'LIVE' | 'FINISHED' | 'CANCELLED';
}

export interface PointsBreakdownResult {
  winner: number;
  exact: number;
  captainBonus: number;
  total: number;
}

function realResult(m: MatchResultParts): Result | null {
  if (m.homeScore === null || m.awayScore === null) return null;
  if (m.homeScore > m.awayScore) return Result.HOME;
  if (m.homeScore < m.awayScore) return Result.AWAY;
  return Result.DRAW;
}

export function pointsBreakdown(
  pred: PredictionParts,
  match: MatchResultParts,
): PointsBreakdownResult | null {
  const real = realResult(match);
  if (real === null) return null;

  const winner = pred.result === real ? POINTS_CORRECT_RESULT : 0;
  const exact =
    winner > 0 &&
    pred.homeScoreGuess === match.homeScore &&
    pred.awayScoreGuess === match.awayScore
      ? POINTS_EXACT_SCORE
      : 0;
  const subtotal = winner + exact;
  const total = subtotal * (pred.isCaptain ? CAPTAIN_MULTIPLIER : 1);
  const captainBonus = total - subtotal;
  return { winner, exact, captainBonus, total };
}
