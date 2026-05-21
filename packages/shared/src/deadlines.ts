import { MatchStage } from './types/fixture.types';

export const KNOCKOUT_LEAD_MS = 60 * 60 * 1000;

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

export function knockoutMatchDeadline(matchStartTime: Date): Date {
  return new Date(matchStartTime.getTime() - KNOCKOUT_LEAD_MS);
}

export function groupFixtureDeadline(earliestMatchStart: Date): Date {
  return endOfPreviousDayUtc(earliestMatchStart);
}

export function championPickDeadline(tournamentStart: Date): Date {
  return endOfPreviousDayUtc(tournamentStart);
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
  const startTime = new Date(input.startTime);
  const fixtureCloseAt = new Date(input.fixtureCloseAt);
  if (isKnockoutStage(input.stage)) {
    return knockoutMatchDeadline(startTime);
  }
  return fixtureCloseAt;
}

export function isMatchPredictionClosed(
  input: MatchDeadlineInput,
  now: Date = new Date(),
): boolean {
  return matchPredictionDeadline(input).getTime() <= now.getTime();
}
