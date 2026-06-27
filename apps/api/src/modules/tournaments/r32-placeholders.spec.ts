import { parseR32Placeholder } from './r32-placeholders';

describe('parseR32Placeholder', () => {
  it('parsea ganador de grupo (posición 1)', () => {
    expect(parseR32Placeholder('1° Grupo C')).toEqual({
      kind: 'TOP',
      position: 1,
      group: 'C',
    });
  });

  it('parsea subcampeón de grupo (posición 2)', () => {
    expect(parseR32Placeholder('2° Grupo B')).toEqual({
      kind: 'TOP',
      position: 2,
      group: 'B',
    });
  });

  it('parsea tercero con sus grupos candidatos', () => {
    expect(parseR32Placeholder('3° (A/B/C/D/F)')).toEqual({
      kind: 'THIRD',
      candidates: ['A', 'B', 'C', 'D', 'F'],
    });
  });

  it('tolera espacios alrededor del paréntesis del tercero', () => {
    expect(parseR32Placeholder('3° (E/H/I/J/K)')).toEqual({
      kind: 'THIRD',
      candidates: ['E', 'H', 'I', 'J', 'K'],
    });
  });

  it('ignora espacios sobrantes en los bordes', () => {
    expect(parseR32Placeholder('  1° Grupo A  ')).toEqual({
      kind: 'TOP',
      position: 1,
      group: 'A',
    });
  });

  it('trata cualquier otro texto como STATIC', () => {
    expect(parseR32Placeholder('Ganador R32-3')).toEqual({ kind: 'STATIC' });
    expect(parseR32Placeholder('Argentina')).toEqual({ kind: 'STATIC' });
    expect(parseR32Placeholder('3° Grupo A')).toEqual({ kind: 'STATIC' }); // formato no soportado
    expect(parseR32Placeholder('')).toEqual({ kind: 'STATIC' });
  });
});
