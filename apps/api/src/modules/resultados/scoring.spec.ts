import { Result } from '@prisma/client';
import {
  computePredictionOutcome,
  resultFromScore,
  aggregateScoredPredictions,
  type ScoredPredictionInput,
} from './scoring';

describe('resultFromScore', () => {
  it('mapea local/empate/visitante', () => {
    expect(resultFromScore(2, 0)).toBe(Result.HOME);
    expect(resultFromScore(0, 2)).toBe(Result.AWAY);
    expect(resultFromScore(1, 1)).toBe(Result.DRAW);
  });
});

describe('computePredictionOutcome', () => {
  const base = { homeScoreGuess: null as number | null, awayScoreGuess: null as number | null, isCaptain: false };

  it('acierta solo el ganador: 3 pts', () => {
    const out = computePredictionOutcome(
      { ...base, result: Result.HOME, homeScoreGuess: 1, awayScoreGuess: 0 },
      { homeScore: 2, awayScore: 0 },
    );
    expect(out).toEqual({ points: 3, correctWinner: 1, exactScore: 0, exactGoals: 0 });
  });

  it('acierta resultado exacto: 5 pts y suma goles', () => {
    const out = computePredictionOutcome(
      { ...base, result: Result.HOME, homeScoreGuess: 2, awayScoreGuess: 1 },
      { homeScore: 2, awayScore: 1 },
    );
    expect(out).toEqual({ points: 5, correctWinner: 1, exactScore: 1, exactGoals: 3 });
  });

  it('capitán duplica los puntos del exacto: 10 pts', () => {
    const out = computePredictionOutcome(
      { ...base, result: Result.HOME, homeScoreGuess: 2, awayScoreGuess: 1, isCaptain: true },
      { homeScore: 2, awayScore: 1 },
    );
    expect(out.points).toBe(10);
    expect(out.exactGoals).toBe(3); // los contadores NO se multiplican
  });

  it('falla el ganador: 0 pts', () => {
    const out = computePredictionOutcome(
      { ...base, result: Result.HOME, homeScoreGuess: 1, awayScoreGuess: 0 },
      { homeScore: 0, awayScore: 1 },
    );
    expect(out).toEqual({ points: 0, correctWinner: 0, exactScore: 0, exactGoals: 0 });
  });

  it('empate correcto no exacto: 3 pts', () => {
    const out = computePredictionOutcome(
      { ...base, result: Result.DRAW, homeScoreGuess: 1, awayScoreGuess: 1 },
      { homeScore: 2, awayScore: 2 },
    );
    expect(out).toEqual({ points: 3, correctWinner: 1, exactScore: 0, exactGoals: 0 });
  });
});

describe('aggregateScoredPredictions', () => {
  const at = (iso: string) => new Date(iso);
  const mk = (
    userId: string,
    predictionId: string,
    createdAt: string,
    outcome: { points: number; correctWinner: number; exactScore: number; exactGoals: number },
  ): ScoredPredictionInput => ({ userId, predictionId, createdAt: at(createdAt), outcome });

  it('suma los deltas de varias predicciones del mismo usuario', () => {
    const { deltaByUser } = aggregateScoredPredictions([
      mk('u1', 'p1', '2026-06-01T10:00:00Z', { points: 3, correctWinner: 1, exactScore: 0, exactGoals: 0 }),
      mk('u1', 'p2', '2026-06-02T10:00:00Z', { points: 5, correctWinner: 1, exactScore: 1, exactGoals: 3 }),
    ]);
    const d = deltaByUser.get('u1')!;
    expect(d.points).toBe(8);
    expect(d.correctWinners).toBe(2);
    expect(d.exactScores).toBe(1);
    expect(d.exactGoalsSum).toBe(3);
    expect(d.positiveCount).toBe(2);
  });

  it('separa los deltas por usuario', () => {
    const { deltaByUser } = aggregateScoredPredictions([
      mk('u1', 'p1', '2026-06-01T10:00:00Z', { points: 3, correctWinner: 1, exactScore: 0, exactGoals: 0 }),
      mk('u2', 'p2', '2026-06-01T10:00:00Z', { points: 0, correctWinner: 0, exactScore: 0, exactGoals: 0 }),
    ]);
    expect(deltaByUser.get('u1')!.points).toBe(3);
    expect(deltaByUser.get('u2')!.points).toBe(0);
  });

  it('positiveCount cuenta solo predicciones con puntos > 0', () => {
    const { deltaByUser } = aggregateScoredPredictions([
      mk('u1', 'p1', '2026-06-01T10:00:00Z', { points: 3, correctWinner: 1, exactScore: 0, exactGoals: 0 }),
      mk('u1', 'p2', '2026-06-02T10:00:00Z', { points: 0, correctWinner: 0, exactScore: 0, exactGoals: 0 }),
      mk('u1', 'p3', '2026-06-03T10:00:00Z', { points: 5, correctWinner: 1, exactScore: 1, exactGoals: 3 }),
    ]);
    expect(deltaByUser.get('u1')!.positiveCount).toBe(2);
  });

  it('firstPredictionAt es la fecha más antigua del batch', () => {
    const { deltaByUser } = aggregateScoredPredictions([
      mk('u1', 'p1', '2026-06-05T10:00:00Z', { points: 3, correctWinner: 1, exactScore: 0, exactGoals: 0 }),
      mk('u1', 'p2', '2026-06-01T10:00:00Z', { points: 0, correctWinner: 0, exactScore: 0, exactGoals: 0 }),
    ]);
    expect(deltaByUser.get('u1')!.firstPredictionAt.toISOString()).toBe('2026-06-01T10:00:00.000Z');
  });

  it('agrupa predictionIds por valor de puntos (para updateMany batcheado)', () => {
    const { predIdsByPoints } = aggregateScoredPredictions([
      mk('u1', 'p1', '2026-06-01T10:00:00Z', { points: 3, correctWinner: 1, exactScore: 0, exactGoals: 0 }),
      mk('u2', 'p2', '2026-06-01T10:00:00Z', { points: 3, correctWinner: 1, exactScore: 0, exactGoals: 0 }),
      mk('u3', 'p3', '2026-06-01T10:00:00Z', { points: 0, correctWinner: 0, exactScore: 0, exactGoals: 0 }),
    ]);
    expect(predIdsByPoints.get(3)!.sort()).toEqual(['p1', 'p2']);
    expect(predIdsByPoints.get(0)).toEqual(['p3']);
  });

  it('entrada vacía produce mapas vacíos', () => {
    const { deltaByUser, predIdsByPoints } = aggregateScoredPredictions([]);
    expect(deltaByUser.size).toBe(0);
    expect(predIdsByPoints.size).toBe(0);
  });
});
