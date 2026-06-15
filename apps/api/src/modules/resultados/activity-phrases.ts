/**
 * Notificaciones de actividad i18n: el backend NO arma el texto final, sino que
 * elige una CLAVE de traducción + sus parámetros. El front traduce esa clave a
 * los 4 idiomas. Igualmente devolvemos un `fallback` en español que se guarda en
 * Notification.message por compatibilidad (y por si el front no reconoce la key).
 *
 * La variante (`.0/.1/.2`) se elige de forma determinista a partir de una semilla
 * estable (id de predicción / fixture+user), no de Math.random(): el mismo evento
 * produce siempre la misma frase y es testeable.
 */

export interface ActivityNotification {
  /** Clave i18n bajo el namespace `notifications` del front. */
  key: string;
  /** Parámetros para interpolar en la traducción. */
  params: Record<string, string | number>;
  /** Texto ya renderizado en español (fallback / legacy). */
  fallback: string;
}

export interface MatchResultPhraseInput {
  homeTeamName: string;
  awayTeamName: string;
  points: number;
  /** Acertó el marcador exacto. */
  exactScore: boolean;
  /** Acertó el ganador (o empate) pero no el marcador exacto. */
  correctWinner: boolean;
  /** Semilla estable para elegir variante (ej. el id de la predicción). */
  seed: string;
}

export interface DailySummaryPhraseInput {
  points: number;
  /** Posición global del usuario tras la jornada (1-based), o null si no rankea. */
  position: number | null;
  seed: string;
}

/** Cantidad de variantes por categoría (debe coincidir con las del front). */
const VARIANTS = {
  matchExact: 3,
  matchWinner: 3,
  matchMiss: 3,
  dailyPoints: 3,
  dailyPointsNoRank: 2,
  dailyZero: 2,
  dailyZeroNoRank: 2,
} as const;

/** Hash estable simple (djb2) → índice no negativo para elegir variante. */
function pickIndex(seed: string, length: number): number {
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 33) ^ seed.charCodeAt(i);
  }
  return Math.abs(hash) % length;
}

// Fallbacks en español, indexados igual que las variantes del front.
const ES_MATCH_EXACT = (m: string, p: number) => [
  `¡Resultado exacto en ${m}! Sumaste ${p} puntos, seguí así 🎯`,
  `¡Clavaste el marcador de ${m}! +${p} puntos para vos 🔥`,
  `¡Bordaste ${m}! Acertaste el resultado exacto y sumaste ${p} puntos.`,
];
const ES_MATCH_WINNER = (m: string, p: number) => [
  `Finalizó ${m}. Le acertaste al ganador y sumaste ${p} puntos.`,
  `¡Bien ahí! Acertaste el resultado de ${m}: +${p} puntos.`,
  `Terminó ${m} y sumaste ${p} puntos por acertar el ganador.`,
];
const ES_MATCH_MISS = (m: string) => [
  `Finalizó ${m}. Esta vez no sumaste puntos, ¡a la próxima!`,
  `Terminó ${m} y no acertaste. Se viene la revancha 💪`,
  `${m} ya terminó. No sumaste en esta, pero queda mucho por jugar.`,
];
const ES_DAILY_POINTS = (p: number, pos: number) => [
  `¡Hoy sumaste ${p} puntos! Te ubicás en la posición #${pos} del ranking.`,
  `Buen día: +${p} puntos. Vas #${pos} en el ranking global.`,
  `Cerraste la jornada con ${p} puntos y estás #${pos} en el ranking.`,
];
const ES_DAILY_POINTS_NORANK = (p: number) => [
  `¡Hoy sumaste ${p} puntos! Seguí pronosticando para entrar al ranking.`,
  `Buen día: +${p} puntos. ¡A escalar en el ranking!`,
];
const ES_DAILY_ZERO = (pos: number) => [
  `Hoy no sumaste puntos. Estás en la posición #${pos} del ranking.`,
  `Jornada sin puntos para vos hoy. Seguís #${pos} en el ranking.`,
];
const ES_DAILY_ZERO_NORANK = () => [
  `Hoy no sumaste puntos. ¡Pronosticá la próxima fecha para escalar!`,
  `Jornada sin puntos. La próxima es tu oportunidad de remontar.`,
];

/** Notificación para el resultado de un partido finalizado. */
export function matchResultPhrase(
  input: MatchResultPhraseInput,
): ActivityNotification {
  const { homeTeamName, awayTeamName, points, exactScore, correctWinner, seed } =
    input;
  const match = `${homeTeamName} - ${awayTeamName}`;
  const params = { home: homeTeamName, away: awayTeamName, points };

  if (exactScore) {
    const i = pickIndex(seed, VARIANTS.matchExact);
    return {
      key: `matchResult.exact.${i}`,
      params,
      fallback: ES_MATCH_EXACT(match, points)[i],
    };
  }
  if (correctWinner) {
    const i = pickIndex(seed, VARIANTS.matchWinner);
    return {
      key: `matchResult.winner.${i}`,
      params,
      fallback: ES_MATCH_WINNER(match, points)[i],
    };
  }
  const i = pickIndex(seed, VARIANTS.matchMiss);
  return {
    key: `matchResult.miss.${i}`,
    params,
    fallback: ES_MATCH_MISS(match)[i],
  };
}

/** Notificación de cierre de jornada con el total del día y la posición global. */
export function dailySummaryPhrase(
  input: DailySummaryPhraseInput,
): ActivityNotification {
  const { points, position, seed } = input;
  const hasRank = position != null;

  if (points <= 0) {
    if (hasRank) {
      const i = pickIndex(seed, VARIANTS.dailyZero);
      return {
        key: `dailySummary.zero.${i}`,
        params: { position },
        fallback: ES_DAILY_ZERO(position)[i],
      };
    }
    const i = pickIndex(seed, VARIANTS.dailyZeroNoRank);
    return {
      key: `dailySummary.zeroNoRank.${i}`,
      params: {},
      fallback: ES_DAILY_ZERO_NORANK()[i],
    };
  }

  if (hasRank) {
    const i = pickIndex(seed, VARIANTS.dailyPoints);
    return {
      key: `dailySummary.points.${i}`,
      params: { points, position },
      fallback: ES_DAILY_POINTS(points, position)[i],
    };
  }
  const i = pickIndex(seed, VARIANTS.dailyPointsNoRank);
  return {
    key: `dailySummary.pointsNoRank.${i}`,
    params: { points },
    fallback: ES_DAILY_POINTS_NORANK(points)[i],
  };
}
