import { resolveTopScorerPoints } from './top-scorer';

describe('resolveTopScorerPoints', () => {
  it('otorga 15 pts cuando el pick coincide con el goleador', () => {
    expect(resolveTopScorerPoints('player-1', 'player-1')).toBe(15);
  });

  it('otorga 0 cuando el pick no coincide', () => {
    expect(resolveTopScorerPoints('player-1', 'player-2')).toBe(0);
  });

  it('otorga 0 cuando no hay goleador ganador definido', () => {
    expect(resolveTopScorerPoints('player-1', null)).toBe(0);
  });
});
