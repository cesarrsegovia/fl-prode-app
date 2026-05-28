import { compareScoreRows, RankableScore } from './ranking-order';

function row(p: Partial<RankableScore>): RankableScore {
  return {
    total: 0,
    correctWinners: 0,
    exactScores: 0,
    exactGoalsSum: 0,
    firstPredictionAt: null,
    ...p,
  };
}

describe('compareScoreRows', () => {
  it('ordena por total descendente', () => {
    expect(compareScoreRows(row({ total: 10 }), row({ total: 5 }))).toBeLessThan(0);
  });

  it('desempata por ganadores acertados', () => {
    const a = row({ total: 5, correctWinners: 3 });
    const b = row({ total: 5, correctWinners: 1 });
    expect(compareScoreRows(a, b)).toBeLessThan(0);
  });

  it('desempata por exactos cuando acertados empatan', () => {
    const a = row({ total: 5, correctWinners: 2, exactScores: 2 });
    const b = row({ total: 5, correctWinners: 2, exactScores: 1 });
    expect(compareScoreRows(a, b)).toBeLessThan(0);
  });

  it('desempata por suma de goles en exactos', () => {
    const a = row({ total: 5, correctWinners: 2, exactScores: 1, exactGoalsSum: 3 });
    const b = row({ total: 5, correctWinners: 2, exactScores: 1, exactGoalsSum: 1 });
    expect(compareScoreRows(a, b)).toBeLessThan(0);
  });

  it('4º criterio: la predicción más temprana gana; null va último', () => {
    const early = row({ total: 5, firstPredictionAt: new Date('2026-06-01T10:00:00Z') });
    const late = row({ total: 5, firstPredictionAt: new Date('2026-06-02T10:00:00Z') });
    const none = row({ total: 5, firstPredictionAt: null });
    expect(compareScoreRows(early, late)).toBeLessThan(0);
    expect(compareScoreRows(late, none)).toBeLessThan(0);
  });
});
