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

/** Predicción de un partido de eliminación: agrega a quién hace avanzar. */
export interface KnockoutPrediction extends ScorablePrediction {
  /** Solo si result=DRAW: HOME/AWAY que el usuario hace avanzar por penales. */
  penaltyWinner: Result | null;
}

/** Resultado final de un partido de eliminación, incluyendo penales. */
export interface KnockoutFinalScore extends FinalScore {
  /** Goles de la tanda de penales; null si no hubo penales. */
  homePens: number | null;
  awayPens: number | null;
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

export interface ScoreDelta {
  points: number;
  correctWinners: number;
  exactScores: number;
  exactGoalsSum: number;
  /** nº de predicciones acertadas (>0 pts). Base del streak set-based. */
  positiveCount: number;
  /** createdAt más antigua entre las predicciones del batch para ese usuario. */
  firstPredictionAt: Date;
}

/** Una predicción ya puntuada, lista para agregar. */
export interface ScoredPredictionInput {
  userId: string;
  predictionId: string;
  createdAt: Date;
  outcome: PredictionOutcome;
}

export interface AggregatedDeltas {
  /** Delta agregado por usuario, para upsert en UserScore/GroupScore. */
  deltaByUser: Map<string, ScoreDelta>;
  /** predictionId agrupados por su pointsEarned, para updateMany batcheados. */
  predIdsByPoints: Map<number, string[]>;
}

/**
 * Agrega las predicciones ya puntuadas en deltas por usuario y buckets por
 * puntos. Lógica PURA (sin DB) extraída de calculatePoints para poder testearla
 * de forma aislada — es el núcleo del scoring set-based.
 */
export function aggregateScoredPredictions(
  scored: ScoredPredictionInput[],
): AggregatedDeltas {
  const deltaByUser = new Map<string, ScoreDelta>();
  const predIdsByPoints = new Map<number, string[]>();

  for (const { userId, predictionId, createdAt, outcome } of scored) {
    const bucket = predIdsByPoints.get(outcome.points) ?? [];
    bucket.push(predictionId);
    predIdsByPoints.set(outcome.points, bucket);

    const acc = deltaByUser.get(userId) ?? {
      points: 0,
      correctWinners: 0,
      exactScores: 0,
      exactGoalsSum: 0,
      positiveCount: 0,
      firstPredictionAt: createdAt,
    };
    acc.points += outcome.points;
    acc.correctWinners += outcome.correctWinner;
    acc.exactScores += outcome.exactScore;
    acc.exactGoalsSum += outcome.exactGoals;
    if (outcome.points > 0) acc.positiveCount += 1;
    if (createdAt < acc.firstPredictionAt) acc.firstPredictionAt = createdAt;
    deltaByUser.set(userId, acc);
  }

  return { deltaByUser, predIdsByPoints };
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

/**
 * Puntúa un partido de ELIMINACIÓN. Se compara contra el marcador final que
 * reporta el proveedor (incluye alargue; ESPN no separa 90' de 120').
 *
 * Dos componentes sumables:
 *  - Quién avanza (POINTS_CORRECT_RESULT): acierta el equipo que pasa de ronda.
 *      · Si predijo ganador (HOME/AWAY): solo si el marcador final NO es empate
 *        y ese equipo ganó (avanzó en juego). Si el partido fue a penales
 *        (empate en el marcador), NO acierta aunque su equipo gane la tanda.
 *      · Si predijo empate (DRAW): solo si el marcador final ES empate (hubo
 *        penales) y penaltyWinner == quien ganó la tanda.
 *  - Resultado exacto (POINTS_EXACT_SCORE): marcador predicho == marcador final.
 *    Es independiente de "quién avanza" (puede acertarse el marcador del empate
 *    aunque falle la tanda).
 *
 * `correctWinner`/`exactScore` se reutilizan como contadores de desempate
 * (aciertos de "quién avanza" y de marcador exacto).
 */
export function computeKnockoutOutcome(
  pred: KnockoutPrediction,
  final: KnockoutFinalScore,
): PredictionOutcome {
  const actual = resultFromScore(final.homeScore, final.awayScore);
  let points = 0;
  let correctWinner = 0;
  let exactScore = 0;
  let exactGoals = 0;

  // ¿Acertó quién avanza?
  let advances = false;
  if (actual === Result.DRAW) {
    // Fue a penales: avanza quien ganó la tanda.
    const penWinner =
      final.homePens !== null &&
      final.awayPens !== null &&
      final.homePens !== final.awayPens
        ? final.homePens > final.awayPens
          ? Result.HOME
          : Result.AWAY
        : null;
    advances =
      pred.result === Result.DRAW &&
      pred.penaltyWinner !== null &&
      penWinner !== null &&
      pred.penaltyWinner === penWinner;
  } else {
    // Hubo ganador en juego (90'/alargue): avanza quien ganó el marcador.
    advances = pred.result === actual;
  }

  if (advances) {
    points += POINTS_CORRECT_RESULT;
    correctWinner = 1;
  }

  // Resultado exacto (independiente de quién avanza).
  if (
    pred.homeScoreGuess === final.homeScore &&
    pred.awayScoreGuess === final.awayScore
  ) {
    points += POINTS_EXACT_SCORE;
    exactScore = 1;
    exactGoals = final.homeScore + final.awayScore;
  }

  if (pred.isCaptain) points *= CAPTAIN_MULTIPLIER;

  return { points, correctWinner, exactScore, exactGoals };
}
