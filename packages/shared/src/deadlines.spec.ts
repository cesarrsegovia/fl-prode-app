import { describe, it, expect } from 'vitest';
import { championPickDeadline, topScorerPickDeadline } from './deadlines';

describe('championPickDeadline', () => {
  it('cierra el día previo al primer partido de la 3ra fecha (== topScorer)', () => {
    const round3 = new Date('2026-06-25T19:00:00.000Z');
    expect(championPickDeadline(round3).toISOString()).toBe(
      topScorerPickDeadline(round3).toISOString(),
    );
    expect(championPickDeadline(round3).toISOString()).toBe('2026-06-24T23:59:59.999Z');
  });
});
