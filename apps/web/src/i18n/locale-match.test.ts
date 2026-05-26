import { describe, expect, it } from 'vitest';
import { matchLocale } from './locale-match';

describe('matchLocale — cookie-based locale resolution', () => {
  it('prefers a valid cookie over everything else', () => {
    expect(matchLocale('fr-FR,fr;q=0.9', 'de')).toBe('de');
  });

  it('ignores an invalid cookie and falls back to Accept-Language', () => {
    expect(matchLocale('es-AR,es;q=0.9', 'xx')).toBe('es');
  });

  it('matches a regional variant to its base language', () => {
    expect(matchLocale('es-419', null)).toBe('es');
    expect(matchLocale('de-CH', null)).toBe('de');
  });

  it('respects q-weights when picking the best language', () => {
    expect(matchLocale('de;q=0.3, fr;q=0.9, en;q=0.5', null)).toBe('fr');
  });

  it('defaults to en when nothing matches', () => {
    expect(matchLocale('ja-JP,ja;q=0.9', null)).toBe('en');
    expect(matchLocale(null, null)).toBe('en');
  });

  it('falls through unsupported high-priority langs to a supported one', () => {
    expect(matchLocale('ja;q=1.0, fr;q=0.8', null)).toBe('fr');
  });
});
