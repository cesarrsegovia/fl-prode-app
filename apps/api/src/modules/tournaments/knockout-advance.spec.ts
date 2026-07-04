import {
  parseAdvancePlaceholder,
  knockoutWinnerSide,
  knockoutLoserSide,
} from './knockout-advance';

describe('parseAdvancePlaceholder', () => {
  it('mapea Ganador R32-N -> wc-r32-NN', () => {
    expect(parseAdvancePlaceholder('Ganador R32-3')).toEqual({
      kind: 'WINNER',
      sourceCode: 'wc-r32-03',
    });
    expect(parseAdvancePlaceholder('Ganador R32-16')).toEqual({
      kind: 'WINNER',
      sourceCode: 'wc-r32-16',
    });
  });

  it('mapea CF -> qf y SF -> sf', () => {
    expect(parseAdvancePlaceholder('Ganador CF-2')).toEqual({
      kind: 'WINNER',
      sourceCode: 'wc-qf-02',
    });
    expect(parseAdvancePlaceholder('Ganador SF-1')).toEqual({
      kind: 'WINNER',
      sourceCode: 'wc-sf-01',
    });
    expect(parseAdvancePlaceholder('Ganador R16-8')).toEqual({
      kind: 'WINNER',
      sourceCode: 'wc-r16-08',
    });
  });

  it('reconoce Perdedor (3er puesto)', () => {
    expect(parseAdvancePlaceholder('Perdedor SF-2')).toEqual({
      kind: 'LOSER',
      sourceCode: 'wc-sf-02',
    });
  });

  it('devuelve null para placeholders no-avance', () => {
    expect(parseAdvancePlaceholder('1° Grupo C')).toBeNull();
    expect(parseAdvancePlaceholder('3° (A/B/C/D/F)')).toBeNull();
    expect(parseAdvancePlaceholder('Argentina')).toBeNull();
    expect(parseAdvancePlaceholder('')).toBeNull();
  });
});

describe('knockoutWinnerSide', () => {
  it('gana el del marcador mayor', () => {
    expect(knockoutWinnerSide(2, 0, null, null)).toBe('HOME');
    expect(knockoutWinnerSide(0, 1, null, null)).toBe('AWAY');
  });

  it('empate -> decide la tanda de penales', () => {
    expect(knockoutWinnerSide(1, 1, 4, 2)).toBe('HOME');
    expect(knockoutWinnerSide(1, 1, 2, 4)).toBe('AWAY');
  });

  it('empate sin penales resueltos -> null', () => {
    expect(knockoutWinnerSide(1, 1, null, null)).toBeNull();
    expect(knockoutWinnerSide(1, 1, 3, 3)).toBeNull();
  });

  it('marcador incompleto -> null', () => {
    expect(knockoutWinnerSide(null, 1, null, null)).toBeNull();
    expect(knockoutWinnerSide(1, null, null, null)).toBeNull();
  });
});

describe('knockoutLoserSide', () => {
  it('es el lado opuesto al ganador', () => {
    expect(knockoutLoserSide('HOME')).toBe('AWAY');
    expect(knockoutLoserSide('AWAY')).toBe('HOME');
  });
  it('null si no hay ganador resuelto', () => {
    expect(knockoutLoserSide(null)).toBeNull();
  });
});
