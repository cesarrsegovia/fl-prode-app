import { matchResultPhrase, dailySummaryPhrase } from './activity-phrases';

describe('matchResultPhrase', () => {
  const base = {
    homeTeamName: 'Bélgica',
    awayTeamName: 'Egipto',
    seed: 'pred-1',
  };

  it('expone equipos y puntos en params', () => {
    const n = matchResultPhrase({
      ...base,
      points: 3,
      exactScore: false,
      correctWinner: true,
    });
    expect(n.params).toMatchObject({ home: 'Bélgica', away: 'Egipto', points: 3 });
  });

  it('usa una key de resultado exacto', () => {
    const n = matchResultPhrase({
      ...base,
      points: 5,
      exactScore: true,
      correctWinner: true,
    });
    expect(n.key).toMatch(/^matchResult\.exact\.\d+$/);
    expect(n.fallback.toLowerCase()).toContain('exacto');
    expect(n.fallback).toContain('5');
  });

  it('usa una key de ganador cuando no es exacto', () => {
    const n = matchResultPhrase({
      ...base,
      points: 3,
      exactScore: false,
      correctWinner: true,
    });
    expect(n.key).toMatch(/^matchResult\.winner\.\d+$/);
  });

  it('usa una key de "sin puntos" cuando no acertó', () => {
    const n = matchResultPhrase({
      ...base,
      points: 0,
      exactScore: false,
      correctWinner: false,
    });
    expect(n.key).toMatch(/^matchResult\.miss\.\d+$/);
    expect(n.fallback).toContain('Bélgica');
  });

  it('es determinista: misma semilla → misma key y fallback', () => {
    const make = () =>
      matchResultPhrase({
        ...base,
        points: 3,
        exactScore: false,
        correctWinner: true,
      });
    expect(make()).toEqual(make());
  });

  it('varía la frase según la semilla', () => {
    const keys = new Set(
      ['a', 'b', 'c', 'd', 'e', 'f'].map(
        (seed) =>
          matchResultPhrase({
            ...base,
            seed,
            points: 3,
            exactScore: false,
            correctWinner: true,
          }).key,
      ),
    );
    expect(keys.size).toBeGreaterThan(1);
  });
});

describe('dailySummaryPhrase', () => {
  it('incluye puntos y posición cuando sumó', () => {
    const n = dailySummaryPhrase({ points: 8, position: 3, seed: 'u1' });
    expect(n.key).toMatch(/^dailySummary\.points\.\d+$/);
    expect(n.params).toMatchObject({ points: 8, position: 3 });
    expect(n.fallback).toContain('8');
    expect(n.fallback).toContain('#3');
  });

  it('usa key zero con posición cuando no sumó', () => {
    const n = dailySummaryPhrase({ points: 0, position: 12, seed: 'u1' });
    expect(n.key).toMatch(/^dailySummary\.zero\.\d+$/);
    expect(n.params).toMatchObject({ position: 12 });
  });

  it('usa key sin ranking cuando no hay posición', () => {
    const n = dailySummaryPhrase({ points: 5, position: null, seed: 'u1' });
    expect(n.key).toMatch(/^dailySummary\.pointsNoRank\.\d+$/);
    expect(n.params).toMatchObject({ points: 5 });
    expect(n.fallback).not.toContain('#');
  });

  it('es determinista', () => {
    const make = () => dailySummaryPhrase({ points: 8, position: 3, seed: 'u1' });
    expect(make()).toEqual(make());
  });
});
