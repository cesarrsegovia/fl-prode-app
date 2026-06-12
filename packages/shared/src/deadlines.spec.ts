import { describe, it, expect } from 'vitest';
import {
  championPickDeadline,
  topScorerPickDeadline,
  matchPredictionDeadline,
  isMatchPredictionClosed,
  MATCH_LEAD_MS,
} from './deadlines';
import { MatchStage } from './types/fixture.types';

describe('championPickDeadline', () => {
  it('cierra el día previo al primer partido de la 3ra fecha (== topScorer)', () => {
    const round3 = new Date('2026-06-25T19:00:00.000Z');
    expect(championPickDeadline(round3).toISOString()).toBe(
      topScorerPickDeadline(round3).toISOString(),
    );
    expect(championPickDeadline(round3).toISOString()).toBe('2026-06-24T23:59:59.999Z');
  });
});

describe('matchPredictionDeadline', () => {
  const start = new Date('2026-06-12T19:00:00.000Z');
  const expected = new Date(start.getTime() - MATCH_LEAD_MS).toISOString();

  it('grupos: cierra 1h antes del inicio del partido (ignora fixtureCloseAt)', () => {
    const dl = matchPredictionDeadline({
      stage: MatchStage.GROUP,
      startTime: start,
      fixtureCloseAt: new Date('2026-06-11T00:00:00.000Z'),
    });
    expect(dl.toISOString()).toBe(expected);
  });

  it('eliminatorias: también cierra 1h antes del inicio', () => {
    const dl = matchPredictionDeadline({
      stage: MatchStage.R16,
      startTime: start,
      fixtureCloseAt: start,
    });
    expect(dl.toISOString()).toBe(expected);
  });

  it('isMatchPredictionClosed: abierto a 1h+1min, cerrado a 1h-1min', () => {
    const input = {
      stage: MatchStage.GROUP,
      startTime: start,
      fixtureCloseAt: start,
    };
    const openNow = new Date(start.getTime() - MATCH_LEAD_MS - 60_000);
    const closedNow = new Date(start.getTime() - MATCH_LEAD_MS + 60_000);
    expect(isMatchPredictionClosed(input, openNow)).toBe(false);
    expect(isMatchPredictionClosed(input, closedNow)).toBe(true);
  });
});
