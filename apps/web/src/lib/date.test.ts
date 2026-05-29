import { describe, expect, it } from 'vitest';
import { formatDeadline, formatMatchDate, MATCH_DATE_FORMAT, DEADLINE_FORMAT } from './date';

describe('formatDeadline', () => {
  it('devuelve — para fechas nulas o inválidas', () => {
    expect(formatDeadline(null, 'es')).toBe('—');
    expect(formatDeadline('no-es-fecha', 'es')).toBe('—');
  });

  it('formatea día y mes corto en el locale dado', () => {
    const out = formatDeadline('2026-06-11T12:00:00Z', 'es');
    expect(out).toMatch(/11/);
    expect(out.toLowerCase()).toMatch(/jun/);
  });
});

describe('formatMatchDate', () => {
  it('devuelve — para entradas inválidas', () => {
    expect(formatMatchDate(null, 'es')).toBe('—');
  });

  it('incluye día numérico y hora', () => {
    const out = formatMatchDate('2026-06-11T18:30:00Z', 'es');
    expect(out).toMatch(/11/);
  });
});

describe('presets', () => {
  it('exponen opciones Intl reutilizables', () => {
    expect(DEADLINE_FORMAT).toMatchObject({ day: 'numeric', month: 'short' });
    expect(MATCH_DATE_FORMAT).toMatchObject({ day: '2-digit', month: 'short' });
  });
});
