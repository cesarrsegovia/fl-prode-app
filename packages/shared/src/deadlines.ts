import { MatchStage } from './types/fixture.types';

// Lead time aplicado a CADA partido: el pick cierra 1h antes del inicio.
// Aplica a fase de grupos y eliminatorias por igual.
export const MATCH_LEAD_MS = 60 * 60 * 1000;
/** @deprecated usar MATCH_LEAD_MS — alias mantenido por compatibilidad. */
export const KNOCKOUT_LEAD_MS = MATCH_LEAD_MS;

const KNOCKOUT_STAGES: ReadonlySet<MatchStage> = new Set([
  MatchStage.R32,
  MatchStage.R16,
  MatchStage.QUARTERFINAL,
  MatchStage.SEMIFINAL,
  MatchStage.THIRD_PLACE,
  MatchStage.FINAL,
]);

export function isKnockoutStage(stage: MatchStage): boolean {
  return KNOCKOUT_STAGES.has(stage);
}

export function endOfPreviousDayUtc(reference: Date): Date {
  const ref = new Date(reference);
  const out = new Date(
    Date.UTC(
      ref.getUTCFullYear(),
      ref.getUTCMonth(),
      ref.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );
  out.setUTCMilliseconds(out.getUTCMilliseconds() - 1);
  return out;
}

/** Cierre por partido: 1h antes del inicio. Vale para grupos y eliminatorias. */
export function matchLeadDeadline(matchStartTime: Date): Date {
  return new Date(matchStartTime.getTime() - MATCH_LEAD_MS);
}

/** @deprecated usar matchLeadDeadline — alias por compatibilidad. */
export function knockoutMatchDeadline(matchStartTime: Date): Date {
  return matchLeadDeadline(matchStartTime);
}

export function groupFixtureDeadline(earliestMatchStart: Date): Date {
  return endOfPreviousDayUtc(earliestMatchStart);
}

// Campeón: se puede elegir hasta el final de la 2da fecha de grupos
// (cierra el día previo al primer partido de la 3ra fecha, igual que el goleador).
export function championPickDeadline(round3FirstMatchStart: Date): Date {
  return endOfPreviousDayUtc(round3FirstMatchStart);
}

// Goleador: se puede elegir hasta el final de la 2da fecha de grupos
// (cierra el día previo al primer partido de la 3ra fecha, igual que R32).
// Si Tournament.topScorerDeadline está seteado, ese valor manda en el service.
export function topScorerPickDeadline(round3FirstMatchStart: Date): Date {
  return endOfPreviousDayUtc(round3FirstMatchStart);
}

export function r32QualifierDeadline(round3FirstMatchStart: Date): Date {
  return endOfPreviousDayUtc(round3FirstMatchStart);
}

export interface MatchDeadlineInput {
  stage: MatchStage;
  startTime: Date | string;
  fixtureCloseAt: Date | string;
}

export function matchPredictionDeadline(input: MatchDeadlineInput): Date {
  // El Mundial ya comenzó: cada partido cierra 1h antes de su inicio,
  // tanto en fase de grupos como en eliminatorias (fixtureCloseAt ya no manda).
  return matchLeadDeadline(new Date(input.startTime));
}

export function isMatchPredictionClosed(
  input: MatchDeadlineInput,
  now: Date = new Date(),
): boolean {
  return matchPredictionDeadline(input).getTime() <= now.getTime();
}
