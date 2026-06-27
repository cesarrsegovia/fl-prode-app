import { resolveChampionPoints } from './champion';
import { POINTS_CHAMPION } from '@prode/shared';

describe('resolveChampionPoints', () => {
  it('da POINTS_CHAMPION si acierta el campeón', () => {
    expect(resolveChampionPoints('t1', 't1')).toBe(POINTS_CHAMPION);
  });
  it('da 0 si falla', () => {
    expect(resolveChampionPoints('t1', 't2')).toBe(0);
  });
  it('da 0 si todavía no hay campeón', () => {
    expect(resolveChampionPoints('t1', null)).toBe(0);
  });
});
