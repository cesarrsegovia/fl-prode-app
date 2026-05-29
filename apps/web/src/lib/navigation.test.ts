import { describe, expect, it } from 'vitest';
import { NAV_ITEMS, isNavItemActive } from './navigation';

describe('NAV_ITEMS', () => {
  it('define los 5 destinos principales en orden', () => {
    expect(NAV_ITEMS.map((i) => i.href)).toEqual([
      '/home',
      '/prode',
      '/mundial',
      '/grupos',
      '/ranking',
    ]);
  });

  it('cada item tiene labelKey e icon', () => {
    for (const item of NAV_ITEMS) {
      expect(typeof item.labelKey).toBe('string');
      expect(item.icon).toBeDefined();
    }
  });
});

describe('isNavItemActive', () => {
  it('home matchea / y /home', () => {
    const home = NAV_ITEMS.find((i) => i.href === '/home')!;
    expect(isNavItemActive(home, '/')).toBe(true);
    expect(isNavItemActive(home, '/home')).toBe(true);
    expect(isNavItemActive(home, '/prode')).toBe(false);
  });

  it('mundial matchea /mundial y /torneo', () => {
    const wc = NAV_ITEMS.find((i) => i.href === '/mundial')!;
    expect(isNavItemActive(wc, '/torneo/abc')).toBe(true);
    expect(isNavItemActive(wc, '/mundial')).toBe(true);
  });

  it('prode matchea cualquier ruta bajo /prode', () => {
    const prode = NAV_ITEMS.find((i) => i.href === '/prode')!;
    expect(isNavItemActive(prode, '/prode/123')).toBe(true);
  });
});
