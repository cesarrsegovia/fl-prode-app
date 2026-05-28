import { Result } from '@prisma/client';
import { POINTS_CORRECT_RESULT, POINTS_EXACT_SCORE, CAPTAIN_MULTIPLIER } from '@prode/shared';

export interface ScorablePrediction {
  result: Result;
  homeScoreGuess: number | null;
  awayScoreGuess: number | null;
  isCaptain: boolean;
}

export interface FinalScore {
  homeScore: number;
  awayScore: number;
}

export interface PredictionOutcome {
  points: number;
  correctWinner: number; // 0 | 1
  exactScore: number; // 0 | 1
  exactGoals: number; // homeScore + awayScore si exacto, si no 0
}

export function resultFromScore(homeScore: number, awayScore: number): Result {
  if (homeScore > awayScore) return Result.HOME;
  if (homeScore < awayScore) return Result.AWAY;
  return Result.DRAW;
}

export function computePredictionOutcome(
  pred: ScorablePrediction,
  final: FinalScore,
): PredictionOutcome {
  const actual = resultFromScore(final.homeScore, final.awayScore);
  let points = 0;
  let correctWinner = 0;
  let exactScore = 0;
  let exactGoals = 0;

  if (pred.result === actual) {
    points += POINTS_CORRECT_RESULT;
    correctWinner = 1;
    if (pred.homeScoreGuess === final.homeScore && pred.awayScoreGuess === final.awayScore) {
      points += POINTS_EXACT_SCORE;
      exactScore = 1;
      exactGoals = final.homeScore + final.awayScore;
    }
  }
  if (pred.isCaptain) points *= CAPTAIN_MULTIPLIER;

  return { points, correctWinner, exactScore, exactGoals };
}
