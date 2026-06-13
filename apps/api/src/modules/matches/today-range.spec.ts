import { todayRangeUtc } from './today-range';

describe('todayRangeUtc', () => {
  // Zona de la app: America/Argentina/Buenos_Aires (UTC-3 fijo, sin DST).
  // Medianoche local = 03:00 UTC del mismo día calendario local.

  it('a mediodía UTC devuelve el rango del día local correspondiente', () => {
    const now = new Date('2026-06-13T12:00:00.000Z'); // 09:00 en AR
    const { gte, lt } = todayRangeUtc(now);
    expect(gte.toISOString()).toBe('2026-06-13T03:00:00.000Z');
    expect(lt.toISOString()).toBe('2026-06-14T03:00:00.000Z');
  });

  it('antes de medianoche UTC pero ya mismo día local', () => {
    // 02:00 UTC del 14 = 23:00 del 13 en AR → día local = 13.
    const now = new Date('2026-06-14T02:00:00.000Z');
    const { gte, lt } = todayRangeUtc(now);
    expect(gte.toISOString()).toBe('2026-06-13T03:00:00.000Z');
    expect(lt.toISOString()).toBe('2026-06-14T03:00:00.000Z');
  });

  it('justo después de medianoche local cae en el nuevo día', () => {
    // 03:30 UTC del 14 = 00:30 del 14 en AR → día local = 14.
    const now = new Date('2026-06-14T03:30:00.000Z');
    const { gte, lt } = todayRangeUtc(now);
    expect(gte.toISOString()).toBe('2026-06-14T03:00:00.000Z');
    expect(lt.toISOString()).toBe('2026-06-15T03:00:00.000Z');
  });

  it('el rango cubre exactamente 24 horas', () => {
    const now = new Date('2026-06-13T12:00:00.000Z');
    const { gte, lt } = todayRangeUtc(now);
    expect(lt.getTime() - gte.getTime()).toBe(24 * 60 * 60 * 1000);
  });
});
