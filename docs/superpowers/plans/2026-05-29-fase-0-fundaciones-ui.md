# Fase 0 — Fundaciones UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear los cimientos compartidos (tokens unificados, safe-areas, primitivos accesibles, hooks y utilidades) para que las fases de dominio posteriores migren cada página en una sola pasada.

**Architecture:** No se tocan páginas de feature. Se unifican tokens en `globals.css`, se arregla el `Button`, se agregan utilidades de safe-area y reglas globales de a11y, y se crean primitivos en `components/ui` sobre `@base-ui/react` (ya instalado). Navbar, BottomNav y LanguageSwitcher se recablean como **uso de referencia** de los nuevos primitivos/utilidades. Lógica pura con TDD (vitest); primitivos visuales verificados con TypeScript + lint + revisión visual.

**Tech Stack:** Next.js 15 (App Router) + React 19 + Tailwind CSS v4 + TypeScript + `@base-ui/react` 1.3 + next-intl + vitest. Branch: `ui/responsive-design-overhaul`.

**Idioma:** Toda la comunicación con el usuario en español. Comentarios de código y commits en español (sigue convención del repo).

---

## Convenciones de testing

- **Lógica pura** (`lib/avatar`, `lib/date`, `lib/navigation`): TDD con vitest en `environment: 'node'` (default). Archivos `*.test.ts` ya están incluidos por `vitest.config.ts` (`include: ['src/**/*.test.ts']`).
- **Hook `useFetch`**: TDD con `renderHook` de `@testing-library/react` + `jsdom` (se instalan en Task 1). El archivo de test lleva `// @vitest-environment jsdom` en la primera línea.
- **Primitivos visuales** (`DropdownMenu`, `PillTabs`, `PercentBar`, `AsyncSection`, `UserAvatar`): sin test unitario; se verifican con `pnpm build` (typecheck), `pnpm lint`, y revisión visual en navegador al final (Task 17).

**Comandos (ejecutar desde `apps/web`):**
- Un test puntual: `pnpm exec vitest run <ruta>`
- Todos los tests: `pnpm test`
- Lint: `pnpm lint`
- Build/typecheck: `pnpm build`

---

## File Structure

**Crear:**
- `apps/web/src/lib/avatar.ts` — `getInitials`, `diceBearAvatar` (puras)
- `apps/web/src/lib/avatar.test.ts`
- `apps/web/src/lib/date.ts` — `formatDeadline`, `formatMatchDate`, presets de opciones Intl
- `apps/web/src/lib/date.test.ts`
- `apps/web/src/lib/navigation.ts` — `NAV_ITEMS`, `isNavItemActive`
- `apps/web/src/lib/navigation.test.ts`
- `apps/web/src/hooks/useFetch.ts` — hook genérico loading/error/data/refetch
- `apps/web/src/hooks/useFetch.test.ts`
- `apps/web/src/components/ui/dropdown-menu.tsx` — menú accesible sobre `@base-ui/react/menu`
- `apps/web/src/components/ui/pill-tabs.tsx` — tabs tipo píldora con scroll-x y ARIA
- `apps/web/src/components/ui/percent-bar.tsx` — barra de progreso con `role="progressbar"`
- `apps/web/src/components/ui/async-section.tsx` — wrapper loading/error/empty
- `apps/web/src/components/ui/user-avatar.tsx` — Avatar con dicebear + fallback

**Modificar:**
- `apps/web/package.json` — devDeps de testing
- `apps/web/src/app/globals.css` — tokens de marca unificados, medallas, safe-area utils, prefers-reduced-motion, legacy `@deprecated`
- `apps/web/src/components/ui/button.tsx` — glow dorado, variante `secondary` a tokens nuevos
- `apps/web/src/app/layout.tsx` — `viewport-fit=cover`, skip-link, `id="main-content"`, padding safe-area
- `apps/web/src/components/layout/Navbar.tsx` — usar `lib/navigation`, `lib/avatar`, `DropdownMenu`, `aria-label`, `aria-current`
- `apps/web/src/components/layout/BottomNav.tsx` — usar `lib/navigation`, `aria-label`, `aria-current`, safe-area
- `apps/web/src/components/layout/LanguageSwitcher.tsx` — usar `DropdownMenu`
- `apps/web/src/messages/{es,en,de,fr}/nav.json` — key `skipToContent`

---

## Task 1: Infraestructura de test para hooks

**Files:**
- Modify: `apps/web/package.json`

- [ ] **Step 1: Instalar dependencias de testing de componentes/hooks**

Run (desde la raíz del repo):
```bash
pnpm --filter @prode/web add -D @testing-library/react@^16 jsdom@^25
```
Expected: se agregan a `devDependencies` de `apps/web/package.json` y se actualiza el lockfile.

- [ ] **Step 2: Verificar que vitest sigue corriendo los tests existentes**

Run (desde `apps/web`):
```bash
pnpm test
```
Expected: PASS — `src/i18n/locale-match.test.ts` y `src/i18n/messages-parity.test.ts` siguen verdes.

- [ ] **Step 3: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml
git commit -m "chore(web): agregar @testing-library/react y jsdom para tests de hooks"
```

---

## Task 2: `lib/avatar.ts` — utilidades de avatar (TDD)

**Files:**
- Create: `apps/web/src/lib/avatar.ts`
- Test: `apps/web/src/lib/avatar.test.ts`

Extrae la lógica hoy duplicada en `Navbar.tsx:17-28`.

- [ ] **Step 1: Escribir el test que falla**

```ts
// apps/web/src/lib/avatar.test.ts
import { describe, expect, it } from 'vitest';
import { getInitials, diceBearAvatar } from './avatar';

describe('getInitials', () => {
  it('devuelve ?? cuando no hay nombre', () => {
    expect(getInitials()).toBe('??');
    expect(getInitials(null)).toBe('??');
    expect(getInitials('   ')).toBe('??');
  });

  it('toma las dos primeras letras de un nombre de una sola palabra', () => {
    expect(getInitials('Messi')).toBe('ME');
  });

  it('combina la inicial del primer y último nombre', () => {
    expect(getInitials('Lionel Andrés Messi')).toBe('LM');
  });

  it('colapsa espacios múltiples', () => {
    expect(getInitials('  Ana   Gómez ')).toBe('AG');
  });
});

describe('diceBearAvatar', () => {
  it('genera una URL de dicebear con el seed normalizado', () => {
    const url = diceBearAvatar('Cesar Segovia');
    expect(url).toContain('https://api.dicebear.com/9.x/personas/svg');
    expect(url).toContain('seed=cesar%20segovia');
  });

  it('usa un seed por defecto cuando el input está vacío', () => {
    expect(diceBearAvatar('')).toContain('seed=prode');
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `pnpm exec vitest run src/lib/avatar.test.ts`
Expected: FAIL — "Failed to resolve import './avatar'".

- [ ] **Step 3: Implementación mínima**

```ts
// apps/web/src/lib/avatar.ts

/** Iniciales de un nombre para fallback de avatar. */
export function getInitials(name?: string | null): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Retrato ilustrado de DiceBear "personas" (gratis, sin auth).
 * Fondo dorado de marca.
 */
export function diceBearAvatar(seed: string): string {
  const safe = encodeURIComponent(seed.trim().toLowerCase() || 'prode');
  return `https://api.dicebear.com/9.x/personas/svg?seed=${safe}&backgroundColor=e9ac36,c79a2e,f4d69c&radius=50`;
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `pnpm exec vitest run src/lib/avatar.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/avatar.ts apps/web/src/lib/avatar.test.ts
git commit -m "feat(web): extraer lib/avatar (getInitials, diceBearAvatar)"
```

---

## Task 3: `lib/date.ts` — formato de fechas centralizado (TDD)

**Files:**
- Create: `apps/web/src/lib/date.ts`
- Test: `apps/web/src/lib/date.test.ts`

Funciones puras con `Intl.DateTimeFormat` (no hooks) para ser testeables y reutilizables. Los componentes que usen `useFormatter` de next-intl pueden pasar los presets `MATCH_DATE_FORMAT` / `DEADLINE_FORMAT`.

- [ ] **Step 1: Escribir el test que falla**

```ts
// apps/web/src/lib/date.test.ts
import { describe, expect, it } from 'vitest';
import { formatDeadline, formatMatchDate, MATCH_DATE_FORMAT, DEADLINE_FORMAT } from './date';

describe('formatDeadline', () => {
  it('devuelve — para fechas nulas o inválidas', () => {
    expect(formatDeadline(null, 'es')).toBe('—');
    expect(formatDeadline('no-es-fecha', 'es')).toBe('—');
  });

  it('formatea día y mes corto en el locale dado', () => {
    // 2026-06-11 mediodía UTC para evitar cruce de día por timezone
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
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `pnpm exec vitest run src/lib/date.test.ts`
Expected: FAIL — "Failed to resolve import './date'".

- [ ] **Step 3: Implementación mínima**

```ts
// apps/web/src/lib/date.ts

/** Opciones para deadlines cortos (ej. "11 jun"). */
export const DEADLINE_FORMAT: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
};

/** Opciones para fecha+hora de partido (ej. "mar 11 jun, 18:30"). */
export const MATCH_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
};

function toDate(input: Date | string | null | undefined): Date | null {
  if (input == null) return null;
  const d = input instanceof Date ? input : new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

function format(
  input: Date | string | null | undefined,
  options: Intl.DateTimeFormatOptions,
  locale?: string,
): string {
  const d = toDate(input);
  if (!d) return '—';
  try {
    return new Intl.DateTimeFormat(locale, options).format(d);
  } catch {
    return '—';
  }
}

export function formatDeadline(
  input: Date | string | null | undefined,
  locale?: string,
): string {
  return format(input, DEADLINE_FORMAT, locale);
}

export function formatMatchDate(
  input: Date | string | null | undefined,
  locale?: string,
): string {
  return format(input, MATCH_DATE_FORMAT, locale);
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `pnpm exec vitest run src/lib/date.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/date.ts apps/web/src/lib/date.test.ts
git commit -m "feat(web): centralizar formato de fechas en lib/date"
```

---

## Task 4: `lib/navigation.ts` — fuente única de navegación (TDD)

**Files:**
- Create: `apps/web/src/lib/navigation.ts`
- Test: `apps/web/src/lib/navigation.test.ts`

Unifica `NAV_LINKS` de `Navbar.tsx:30-36` y `BottomNav.tsx:16-22` (hoy con orden y labels divergentes). Mantiene los iconos para el BottomNav.

- [ ] **Step 1: Escribir el test que falla**

```ts
// apps/web/src/lib/navigation.test.ts
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
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `pnpm exec vitest run src/lib/navigation.test.ts`
Expected: FAIL — "Failed to resolve import './navigation'".

- [ ] **Step 3: Implementación mínima**

```ts
// apps/web/src/lib/navigation.ts
import {
  Home,
  ClipboardList,
  Trophy,
  Users,
  ListChecks,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  /** Clave dentro de messages `nav.links.*`. */
  labelKey: string;
  icon: LucideIcon;
  /** Prefijos extra de ruta que también marcan este item como activo. */
  matchPrefixes: string[];
  /** Si matchea también la raíz "/". */
  matchRoot?: boolean;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/home', labelKey: 'home', icon: Home, matchPrefixes: ['/home'], matchRoot: true },
  { href: '/prode', labelKey: 'prode', icon: ClipboardList, matchPrefixes: ['/prode'] },
  { href: '/mundial', labelKey: 'worldCup', icon: Trophy, matchPrefixes: ['/mundial', '/torneo'] },
  { href: '/grupos', labelKey: 'groups', icon: Users, matchPrefixes: ['/grupos'] },
  { href: '/ranking', labelKey: 'ranking', icon: ListChecks, matchPrefixes: ['/ranking'] },
] as const;

export const ADMIN_NAV_ITEM = {
  href: '/admin',
  labelKey: 'admin',
  matchPrefixes: ['/admin'],
} as const;

export function isNavItemActive(
  item: { matchPrefixes: string[]; matchRoot?: boolean },
  pathname: string,
): boolean {
  if (item.matchRoot && pathname === '/') return true;
  return item.matchPrefixes.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  );
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `pnpm exec vitest run src/lib/navigation.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/navigation.ts apps/web/src/lib/navigation.test.ts
git commit -m "feat(web): fuente única de navegación en lib/navigation"
```

---

## Task 5: `useFetch` — hook genérico de carga (TDD con jsdom)

**Files:**
- Create: `apps/web/src/hooks/useFetch.ts`
- Test: `apps/web/src/hooks/useFetch.test.ts`

Unifica el patrón `useState`+`useEffect`+`.catch`+`.finally` repetido en 7 páginas. Expone `{ data, isLoading, error, refetch }`.

- [ ] **Step 1: Escribir el test que falla**

```ts
// apps/web/src/hooks/useFetch.test.ts
// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useFetch } from './useFetch';

describe('useFetch', () => {
  it('arranca cargando y luego entrega data', async () => {
    const fetcher = vi.fn().mockResolvedValue({ value: 42 });
    const { result } = renderHook(() => useFetch(fetcher));

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual({ value: 42 });
    expect(result.current.error).toBeNull();
  });

  it('captura errores y los expone', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useFetch(fetcher));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.data).toBeNull();
  });

  it('refetch vuelve a llamar al fetcher', async () => {
    const fetcher = vi.fn().mockResolvedValue('ok');
    const { result } = renderHook(() => useFetch(fetcher));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    result.current.refetch();
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `pnpm exec vitest run src/hooks/useFetch.test.ts`
Expected: FAIL — "Failed to resolve import './useFetch'".

- [ ] **Step 3: Implementación mínima**

```ts
// apps/web/src/hooks/useFetch.ts
'use client';

import { useCallback, useEffect, useState } from 'react';

export interface UseFetchResult<T> {
  data: T | null;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

/**
 * Hook genérico de carga. `fetcher` debe ser estable (envolverlo en
 * useCallback en el consumidor si depende de props/estado).
 */
export function useFetch<T>(fetcher: () => Promise<T>): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    fetcher()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetcher]);

  const [reloadToken, setReloadToken] = useState(0);
  const refetch = useCallback(() => setReloadToken((n) => n + 1), []);

  useEffect(() => {
    const cleanup = load();
    return cleanup;
  }, [load, reloadToken]);

  return { data, isLoading, error, refetch };
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `pnpm exec vitest run src/hooks/useFetch.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/useFetch.ts apps/web/src/hooks/useFetch.test.ts
git commit -m "feat(web): hook genérico useFetch (loading/error/data/refetch)"
```

---

## Task 6: Tokens de marca unificados en `globals.css`

**Files:**
- Modify: `apps/web/src/app/globals.css`

Unifica los 3 dorados hardcodeados a un único origen RGB, agrega tokens de medalla, utilidades de safe-area, `prefers-reduced-motion`, y marca el bloque legacy como `@deprecated`.

- [ ] **Step 1: Agregar el token RGB de marca y de medallas en `:root`**

En `:root`, después de `--accent-gold: #f4d69c;` (línea ~22), agregar:

```css
  /* Marca en componentes RGB para alphas (rgb(var(--brand-rgb) / α)) */
  --brand-rgb:     233 172 54;   /* = #e9ac36 */

  /* ----- Medallas (ranking top 3) ----- */
  --medal-gold:    #f4c430;
  --medal-silver:  #c0c0c0;
  --medal-bronze:  #cd7f32;
```

- [ ] **Step 2: Marcar el bloque legacy como deprecado**

Justo antes del comentario `/* ----- Legacy aliases (compat con componentes existentes) ----- */` (línea ~77), reemplazar ese comentario por:

```css
  /* ===== @deprecated — Tokens legacy (Material). NO usar en código nuevo. =====
     Equivalencias para migración (Fases 1–6):
       surface-container-lowest  → surface  (--bg)
       surface-container-low     → surface-1
       surface-container / -high → surface-2
       surface-container-highest → surface-3
       on-surface / on-surface-variant → ink / ink-muted
       primary-container / primary-fixed-dim → neon / accent-gold
       outline-variant           → line
       text-white  (literal)     → text-foreground
       text-black  (literal)     → text-primary-foreground
       text-red-400 (literal)    → text-destructive
     Se elimina al cerrar las fases de dominio. ===== */
```

- [ ] **Step 3: Unificar los glows dorados al token RGB**

Reemplazar el bloque de glows en `@theme inline` (líneas ~178-182):

```css
  /* Glows reutilizables — derivados del dorado de marca */
  --shadow-glow:        0 0 24px rgb(var(--brand-rgb) / 0.35);
  --shadow-neon:        var(--shadow-glow);
  --shadow-neon-sm:     0 0 8px rgb(var(--brand-rgb) / 0.30);
  --shadow-neon-strong: 0 0 44px rgb(var(--brand-rgb) / 0.50);
  --shadow-elev:        0 14px 36px rgb(0 0 0 / 0.48);
```

- [ ] **Step 4: Exponer tokens de medalla como utilidades Tailwind**

En `@theme inline`, después de `--color-brand-700: var(--brand-700);` (línea ~130), agregar:

```css
  --color-medal-gold:   var(--medal-gold);
  --color-medal-silver: var(--medal-silver);
  --color-medal-bronze: var(--medal-bronze);
```

- [ ] **Step 5: Unificar `::selection` y `.text-neon-glow` al token RGB**

Reemplazar en la regla `::selection` (línea ~237):
```css
  ::selection {
    background: rgb(var(--brand-rgb) / 0.42);
    color: var(--chalk);
  }
```
Reemplazar en `.text-neon-glow` (línea ~277):
```css
  .text-neon-glow {
    color: var(--neon);
    text-shadow: 0 0 24px rgb(var(--brand-rgb) / 0.55);
  }
```

- [ ] **Step 6: Agregar utilidades de safe-area y reduced-motion**

Dentro de `@layer utilities { ... }`, antes del cierre, agregar:

```css
  /* Safe-area (notch / home indicator iOS) */
  .pb-safe {
    padding-bottom: env(safe-area-inset-bottom);
  }
  .pb-nav {
    padding-bottom: calc(4rem + env(safe-area-inset-bottom));
  }
```

Y al final del archivo (fuera de cualquier `@layer`), agregar:

```css
/* Respeta la preferencia del sistema de movimiento reducido */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 7: Verificar build**

Run (desde `apps/web`): `pnpm build`
Expected: compila sin errores de CSS; las páginas ya migradas (home/perfil/notificaciones) intactas.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/app/globals.css
git commit -m "feat(web): unificar dorado de marca, tokens de medalla, safe-area y reduced-motion; deprecar legacy"
```

---

## Task 7: Arreglar el `Button` (glow dorado + variante secondary)

**Files:**
- Modify: `apps/web/src/components/ui/button.tsx:13,16-17`

- [ ] **Step 1: Reemplazar el glow verde de la variante `default`**

En `button.tsx:13`, reemplazar la línea de la variante `default`:
```
        default: "bg-primary-gradient shadow-[0_0_5px_rgba(69,252,155,0.2)] hover:shadow-[0_0_8px_rgba(69,252,155,0.4)] [a]:hover:opacity-90",
```
por (glow dorado vía token):
```
        default: "bg-primary-gradient shadow-[var(--shadow-neon-sm)] hover:shadow-[var(--shadow-neon)] [a]:hover:opacity-90",
```

- [ ] **Step 2: Migrar la variante `secondary` a tokens nuevos**

En `button.tsx:16-17`, reemplazar:
```
        secondary:
          "border border-outline-variant/20 bg-transparent text-primary hover:bg-surface-container-low aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
```
por:
```
        secondary:
          "border border-line bg-transparent text-neon hover:bg-surface-1 aria-expanded:bg-surface-2 aria-expanded:text-foreground",
```

- [ ] **Step 3: Verificar typecheck/build**

Run (desde `apps/web`): `pnpm build`
Expected: compila sin errores.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/ui/button.tsx
git commit -m "fix(web): glow dorado del Button y variante secondary con tokens nuevos"
```

---

## Task 8: Safe-areas en viewport, layout y BottomNav

**Files:**
- Modify: `apps/web/src/app/layout.tsx`
- Modify: `apps/web/src/components/layout/BottomNav.tsx:39`

- [ ] **Step 1: Exportar viewport con `viewport-fit=cover`**

En `layout.tsx`, después del import de `Metadata` (línea 1), agregar `Viewport` al import de tipos y exportar la config. Cambiar la línea 1:
```ts
import type { Metadata, Viewport } from 'next';
```
Y después de `generateMetadata` (después de la línea ~33), agregar:
```ts
export const viewport: Viewport = {
  viewportFit: 'cover',
};
```

- [ ] **Step 2: Aplicar padding con safe-area al contenedor principal**

En `layout.tsx:58`, reemplazar:
```tsx
              <div className="flex-1 relative z-10 pb-16 md:pb-0">
```
por:
```tsx
              <div className="flex-1 relative z-10 pb-nav md:pb-0">
```

- [ ] **Step 3: Aplicar safe-area al BottomNav**

En `BottomNav.tsx:39`, reemplazar:
```tsx
    <nav className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-background/85 backdrop-blur-xl border-t border-line/40">
```
por:
```tsx
    <nav
      aria-label={t('landmarks.bottom')}
      className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-background/85 backdrop-blur-xl border-t border-line/40 pb-safe"
    >
```
(La key `landmarks.bottom` se agrega en Task 11; este componente se completa en Task 12.)

- [ ] **Step 4: Verificar build**

Run (desde `apps/web`): `pnpm build`
Expected: compila. (Si `t('landmarks.bottom')` aún no existe en messages, next-intl no rompe el build; se agrega la key en Task 11.)

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/layout.tsx apps/web/src/components/layout/BottomNav.tsx
git commit -m "feat(web): soporte de safe-area iOS (viewport-fit, padding nav, bottomnav)"
```

---

## Task 9: Skip-to-content y landmarks accesibles

**Files:**
- Modify: `apps/web/src/messages/{es,en,de,fr}/nav.json`
- Modify: `apps/web/src/app/layout.tsx`

- [ ] **Step 1: Agregar keys de i18n en los 4 idiomas**

En `apps/web/src/messages/es/nav.json`, dentro del objeto raíz, agregar:
```json
  "skipToContent": "Saltar al contenido",
  "landmarks": { "primary": "Navegación principal", "bottom": "Navegación inferior" },
```
En `en/nav.json`:
```json
  "skipToContent": "Skip to content",
  "landmarks": { "primary": "Primary navigation", "bottom": "Bottom navigation" },
```
En `de/nav.json`:
```json
  "skipToContent": "Zum Inhalt springen",
  "landmarks": { "primary": "Hauptnavigation", "bottom": "Untere Navigation" },
```
En `fr/nav.json`:
```json
  "skipToContent": "Aller au contenu",
  "landmarks": { "primary": "Navigation principale", "bottom": "Navigation inférieure" },
```

- [ ] **Step 2: Verificar paridad de mensajes**

Run (desde `apps/web`): `pnpm exec vitest run src/i18n/messages-parity.test.ts`
Expected: PASS — las 4 traducciones tienen las mismas keys.

- [ ] **Step 3: Agregar skip-link e id de contenido en el layout**

En `layout.tsx`, traer el traductor de `nav` y renderizar el skip-link como primer hijo del `<body>`. Cambiar la firma del componente para obtener `t`:

Después de `const locale = await getLocale();` (línea 40), agregar:
```ts
  const tNav = await getTranslations('nav');
```
Asegurar que `getTranslations` esté importado (ya lo está en línea 5).

Reemplazar el bloque `<body>...</body>` (líneas 53-66) por:
```tsx
      <body className="min-h-screen flex flex-col relative">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-100 focus:rounded-lg focus:bg-neon focus:px-4 focus:py-2 focus:font-display focus:font-bold focus:text-primary-foreground"
        >
          {tNav('skipToContent')}
        </a>
        <NextIntlClientProvider>
          <AuthProvider>
            <RealtimeProvider>
              <Navbar />
              <div id="main-content" tabIndex={-1} className="flex-1 relative z-10 pb-nav md:pb-0 outline-none">
                {children}
              </div>
              <Footer />
              <BottomNav />
            </RealtimeProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
```
(Nota: el contenedor se mantiene como `<div>` —no `<main>`— porque las páginas internas ya declaran su propio `<main>`; un `<main>` anidado sería HTML inválido. Se le da `id="main-content"` + `tabIndex={-1}` para que el skip-link pueda enfocarlo.)

- [ ] **Step 4: Verificar build**

Run (desde `apps/web`): `pnpm build`
Expected: compila sin errores.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/messages apps/web/src/app/layout.tsx
git commit -m "feat(web): skip-to-content link y keys de landmarks i18n"
```

---

## Task 10: Primitivo `DropdownMenu` accesible

**Files:**
- Create: `apps/web/src/components/ui/dropdown-menu.tsx`

Sobre `@base-ui/react/menu` (maneja `aria-expanded`, `role="menu"`, Escape, foco y click-outside nativamente).

- [ ] **Step 1: Crear el componente**

```tsx
// apps/web/src/components/ui/dropdown-menu.tsx
'use client';

import { Menu } from '@base-ui/react/menu';
import { cn } from '@/lib/utils';

function DropdownMenu(props: Menu.Root.Props) {
  return <Menu.Root {...props} />;
}

function DropdownMenuTrigger({ className, ...props }: Menu.Trigger.Props) {
  return <Menu.Trigger className={cn('outline-none', className)} {...props} />;
}

function DropdownMenuContent({
  className,
  align = 'end',
  sideOffset = 8,
  ...props
}: Menu.Popup.Props & { align?: 'start' | 'center' | 'end'; sideOffset?: number }) {
  return (
    <Menu.Portal>
      <Menu.Positioner align={align} sideOffset={sideOffset} className="z-50">
        <Menu.Popup
          className={cn(
            'min-w-56 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-line bg-surface-2 shadow-elev',
            'origin-(--transform-origin) transition-[transform,opacity] data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0',
            className,
          )}
          {...props}
        />
      </Menu.Positioner>
    </Menu.Portal>
  );
}

function DropdownMenuItem({ className, ...props }: Menu.Item.Props) {
  return (
    <Menu.Item
      className={cn(
        'block w-full cursor-pointer px-4 py-3 text-left text-sm font-display font-semibold text-foreground transition-colors outline-none',
        'data-highlighted:bg-surface-3 data-highlighted:text-foreground',
        'border-t border-line first:border-t-0',
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuSeparator({ className, ...props }: Menu.Separator.Props) {
  return <Menu.Separator className={cn('my-0 h-px bg-line', className)} {...props} />;
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
};
```

- [ ] **Step 2: Verificar typecheck/build**

Run (desde `apps/web`): `pnpm build`
Expected: compila. Si algún subcomponente de `@base-ui/react/menu` tiene otro nombre (p. ej. `Menu.Popup` vs `Menu.Content`), ajustar según el `index.d.ts` de `node_modules/@base-ui/react/menu` (las "parts" disponibles son: `root, trigger, portal, positioner, popup, item, separator, group, group-label`).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/dropdown-menu.tsx
git commit -m "feat(web): primitivo DropdownMenu accesible sobre base-ui"
```

---

## Task 11: Recablear Navbar (navegación, avatar, menú accesible, landmark)

**Files:**
- Modify: `apps/web/src/components/layout/Navbar.tsx`

Uso de referencia de `lib/navigation`, `lib/avatar` y `DropdownMenu`.

- [ ] **Step 1: Reemplazar helpers locales e imports**

En `Navbar.tsx`, eliminar `getInitials` (líneas 17-22) y `diceBearAvatar` (líneas 24-28) y el array `NAV_LINKS` (líneas 30-36). Agregar imports:
```ts
import { getInitials, diceBearAvatar } from '@/lib/avatar';
import { NAV_ITEMS, ADMIN_NAV_ITEM, isNavItemActive } from '@/lib/navigation';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
```

- [ ] **Step 2: Derivar la lista de navegación e incluir admin**

Reemplazar el bloque `const navLinks = isAdmin ? [...] : NAV_LINKS;` (líneas 45-54) por:
```ts
  const navItems = isAdmin ? [...NAV_ITEMS, ADMIN_NAV_ITEM] : NAV_ITEMS;
```

- [ ] **Step 3: Agregar `aria-label` al landmark y `aria-current` a los links**

En el `<nav>` (línea 57), agregar `aria-label={t('landmarks.primary')}`.

Reemplazar el `.map` de desktop (líneas 67-84) por:
```tsx
        <div className="hidden md:flex gap-6">
          {navItems.map((link) => {
            const active = isNavItemActive(link, pathname);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'font-display font-semibold text-sm tracking-tight transition-colors',
                  active ? 'text-neon' : 'text-ink-muted hover:text-foreground',
                )}
              >
                {t(`links.${link.labelKey}`)}
              </Link>
            );
          })}
        </div>
```

- [ ] **Step 4: Alinear padding horizontal con las páginas**

En el `<nav>` (línea 57), cambiar `px-6` por `px-4 md:px-6`.

- [ ] **Step 5: Reescribir el menú de usuario con `DropdownMenu`**

En `AuthedActions`, eliminar el estado `menuOpen`, el `menuRef` y el `useEffect` de click-outside (líneas 141-153). Reemplazar el bloque del botón + dropdown (líneas 181-233) por:
```tsx
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={name}
          className="flex items-center gap-2 pr-1 py-1 rounded-full hover:bg-surface-1 transition-colors"
        >
          <Avatar size="default">
            <AvatarImage src={avatarSrc} alt={name} />
            <AvatarFallback className="bg-neon text-primary-foreground font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden md:block text-sm font-display font-semibold text-foreground pr-2">
            {name}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {userId && (
            <DropdownMenuItem render={<Link href={`/perfil/${userId}`} />}>
              {t('menu.profile')}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem render={<Link href="/mis-pronosticos" />}>
            {t('menu.myPredictions')}
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/notificaciones" />}>
            {t('menu.notifications')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/' })}>
            {t('menu.logout')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
```
(Nota: `@base-ui` usa la prop `render` para componer con `Link`. Si la versión instalada usa `render={(props) => <Link {...props} />}`, ajustar a esa forma según el `.d.ts`.)

Eliminar también los imports ya no usados (`useEffect`, `useRef` si quedan sin uso; mantener `useState` solo si lo usa el FAQ).

- [ ] **Step 6: Verificar build y lint**

Run (desde `apps/web`): `pnpm build && pnpm lint`
Expected: compila sin errores ni warnings de imports sin usar.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/layout/Navbar.tsx
git commit -m "refactor(web): Navbar usa lib/navigation, lib/avatar y DropdownMenu accesible"
```

---

## Task 12: Recablear BottomNav (navegación única + a11y)

**Files:**
- Modify: `apps/web/src/components/layout/BottomNav.tsx`

- [ ] **Step 1: Reemplazar el array local por la fuente única**

En `BottomNav.tsx`, eliminar el array `NAV` (líneas 16-22) y los imports de iconos de lucide (líneas 5-11). Agregar:
```ts
import { NAV_ITEMS, isNavItemActive } from '@/lib/navigation';
```

- [ ] **Step 2: Usar `NAV_ITEMS` y agregar `aria-current`**

Reemplazar el `.map` (líneas 41-59) por:
```tsx
        {NAV_ITEMS.map((item) => {
          const active = isNavItemActive(item, pathname);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-1 py-2.5',
                  active ? 'text-neon' : 'text-ink-muted',
                )}
              >
                <Icon className="size-5" />
                <span className="text-[10px] font-display font-bold uppercase tracking-widest">
                  {t(`links.${item.labelKey}`)}
                </span>
              </Link>
            </li>
          );
        })}
```
(El `aria-label={t('landmarks.bottom')}` y `pb-safe` ya se agregaron en Task 8.)

- [ ] **Step 3: Verificar build y lint**

Run (desde `apps/web`): `pnpm build && pnpm lint`
Expected: compila sin imports sin usar.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/layout/BottomNav.tsx
git commit -m "refactor(web): BottomNav usa lib/navigation y aria-current"
```

---

## Task 13: Recablear LanguageSwitcher con `DropdownMenu`

**Files:**
- Modify: `apps/web/src/components/layout/LanguageSwitcher.tsx`

- [ ] **Step 1: Reemplazar el dropdown manual por el primitivo**

Reescribir el cuerpo del componente (manteniendo la lógica de `onSelect`/`startTransition`). Eliminar `useState`/`useRef`/`useEffect` de open/click-outside (líneas 19, 21, 23-32). Imports nuevos:
```ts
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
```
Reemplazar el `return (...)` (líneas 43-76) por:
```tsx
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isPending}
        aria-label={t('language.label')}
        className="flex items-center gap-1.5 size-9 md:size-auto md:px-2.5 rounded-full justify-center text-ink-muted hover:text-neon hover:bg-surface-1 transition-colors disabled:opacity-50"
      >
        <Globe className="size-5" />
        <span className="hidden md:block text-xs font-display font-bold uppercase tracking-widest">
          {current}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-44">
        {locales.map((l) => (
          <DropdownMenuItem
            key={l}
            onClick={() => onSelect(l)}
            className={l === current ? 'text-neon' : 'text-foreground'}
          >
            {localeLabels[l]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
```

- [ ] **Step 2: Verificar build y lint**

Run (desde `apps/web`): `pnpm build && pnpm lint`
Expected: compila sin imports sin usar (`cn` puede quedar sin uso → quitarlo si lint lo marca).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/layout/LanguageSwitcher.tsx
git commit -m "refactor(web): LanguageSwitcher usa DropdownMenu accesible"
```

---

## Task 14: Primitivo `PillTabs`

**Files:**
- Create: `apps/web/src/components/ui/pill-tabs.tsx`

Tabs tipo píldora con scroll horizontal y ARIA, controlado por `value`/`onValueChange`. Reemplaza las tabs custom de ranking/grupos/admin en fases de dominio.

- [ ] **Step 1: Crear el componente**

```tsx
// apps/web/src/components/ui/pill-tabs.tsx
'use client';

import { cn } from '@/lib/utils';

export interface PillTab<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface PillTabsProps<T extends string> {
  tabs: PillTab<T>[];
  value: T;
  onValueChange: (value: T) => void;
  className?: string;
  'aria-label'?: string;
}

export function PillTabs<T extends string>({
  tabs,
  value,
  onValueChange,
  className,
  'aria-label': ariaLabel,
}: PillTabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn('flex gap-2 overflow-x-auto no-scrollbar', className)}
    >
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onValueChange(tab.value)}
            className={cn(
              'shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-xs font-display font-black uppercase tracking-widest transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon',
              active
                ? 'bg-neon text-primary-foreground'
                : 'bg-surface-1 text-ink-muted hover:text-foreground',
            )}
          >
            {tab.label}
            {typeof tab.count === 'number' && (
              <span
                className={cn(
                  'ml-1.5 tabular-nums',
                  active ? 'text-primary-foreground/70' : 'text-ink-dim',
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Agregar la utilidad `no-scrollbar` en globals.css**

En `@layer utilities` de `globals.css`, agregar:
```css
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
```

- [ ] **Step 3: Verificar build**

Run (desde `apps/web`): `pnpm build`
Expected: compila sin errores.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/ui/pill-tabs.tsx apps/web/src/app/globals.css
git commit -m "feat(web): primitivo PillTabs con scroll-x y ARIA"
```

---

## Task 15: Primitivo `PercentBar`

**Files:**
- Create: `apps/web/src/components/ui/percent-bar.tsx`

Reemplaza las 3 copias de barra de porcentaje (VsFriends, MatchGroupStats, partido/page) en fases de dominio.

- [ ] **Step 1: Crear el componente**

```tsx
// apps/web/src/components/ui/percent-bar.tsx
import { cn } from '@/lib/utils';

type Tone = 'neon' | 'citrus' | 'grass';

const TONE_CLASS: Record<Tone, string> = {
  neon: 'bg-neon',
  citrus: 'bg-citrus',
  grass: 'bg-grass',
};

interface PercentBarProps {
  /** Valor actual. */
  value: number;
  /** Máximo (default 100). */
  max?: number;
  tone?: Tone;
  /** Etiqueta accesible (ej. "Local: 60%"). */
  label?: string;
  className?: string;
}

export function PercentBar({
  value,
  max = 100,
  tone = 'neon',
  label,
  className,
}: PercentBarProps) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-surface-2', className)}
    >
      <div
        className={cn('h-full rounded-full transition-[width]', TONE_CLASS[tone])}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verificar build**

Run (desde `apps/web`): `pnpm build`
Expected: compila sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/percent-bar.tsx
git commit -m "feat(web): primitivo PercentBar con role=progressbar"
```

---

## Task 16: Primitivo `AsyncSection`

**Files:**
- Create: `apps/web/src/components/ui/async-section.tsx`

Unifica el patrón loading/error/empty repetido en 7 páginas. Usa `Empty` de `ui/empty` como fallback por defecto.

- [ ] **Step 1: Crear el componente**

```tsx
// apps/web/src/components/ui/async-section.tsx
import type { ReactNode } from 'react';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty';

interface AsyncSectionProps {
  isLoading: boolean;
  error?: unknown;
  isEmpty?: boolean;
  /** UI de carga (skeletons). */
  skeleton: ReactNode;
  /** Mensaje cuando no hay datos. */
  emptyTitle?: string;
  emptyDescription?: string;
  empty?: ReactNode;
  /** Mensaje cuando hay error. */
  errorTitle?: string;
  errorFallback?: ReactNode;
  children: ReactNode;
}

export function AsyncSection({
  isLoading,
  error,
  isEmpty,
  skeleton,
  emptyTitle,
  emptyDescription,
  empty,
  errorTitle,
  errorFallback,
  children,
}: AsyncSectionProps) {
  if (isLoading) return <>{skeleton}</>;

  if (error) {
    if (errorFallback) return <>{errorFallback}</>;
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle className="text-destructive">{errorTitle ?? 'Error'}</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }

  if (isEmpty) {
    if (empty) return <>{empty}</>;
    return (
      <Empty>
        <EmptyHeader>
          {emptyTitle && <EmptyTitle>{emptyTitle}</EmptyTitle>}
          {emptyDescription && <EmptyDescription>{emptyDescription}</EmptyDescription>}
        </EmptyHeader>
      </Empty>
    );
  }

  return <>{children}</>;
}
```

- [ ] **Step 2: Verificar build**

Run (desde `apps/web`): `pnpm build`
Expected: compila sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/async-section.tsx
git commit -m "feat(web): primitivo AsyncSection (loading/error/empty unificado)"
```

---

## Task 17: Primitivo `UserAvatar` + verificación visual final

**Files:**
- Create: `apps/web/src/components/ui/user-avatar.tsx`

Encapsula `Avatar` + `AvatarImage` (con fallback nativo de base-ui ante error de carga) + iniciales. Reemplaza los `<img>` nativos de RankingTable/ActivityFeed/grupos en fases de dominio.

- [ ] **Step 1: Crear el componente**

```tsx
// apps/web/src/components/ui/user-avatar.tsx
'use client';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getInitials, diceBearAvatar } from '@/lib/avatar';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function UserAvatar({ name, email, image, size = 'default', className }: UserAvatarProps) {
  const displayName = name ?? email ?? '';
  const src = image || diceBearAvatar(email || name || 'prode');
  return (
    <Avatar size={size} className={className}>
      <AvatarImage src={src} alt={displayName} />
      <AvatarFallback className={cn('bg-neon text-primary-foreground font-bold')}>
        {getInitials(displayName)}
      </AvatarFallback>
    </Avatar>
  );
}
```

- [ ] **Step 2: Verificar build, lint y toda la suite de tests**

Run (desde `apps/web`):
```bash
pnpm build && pnpm lint && pnpm test
```
Expected: build OK, lint sin warnings, todos los tests verdes (avatar, date, navigation, useFetch, i18n).

- [ ] **Step 3: Verificación visual en navegador**

Run (desde la raíz): `pnpm dev`
Verificar manualmente en el navegador (DevTools, viewport 360px y desktop):
- Navbar: menú de usuario abre/cierra, se cierra con Escape, navegable con teclado; idioma idem; `aria-current` en link activo.
- BottomNav: en móvil respeta el home indicator (probar con DevTools device iPhone); 5 ítems sin solaparse a 360px.
- Skip-link: al presionar Tab al cargar, aparece "Saltar al contenido" y enfoca el contenido.
- Botón primario (Home → "Cargar predicciones"): glow dorado, no verde.
- Páginas ya migradas (home/perfil/notificaciones) sin regresiones visuales.

Documentar cualquier ajuste necesario y corregirlo antes del commit.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/ui/user-avatar.tsx
git commit -m "feat(web): primitivo UserAvatar con fallback de iniciales"
```

---

## Cierre de la Fase 0

Al terminar todas las tareas:
- `lib/avatar`, `lib/date`, `lib/navigation`, `useFetch` creados y con tests verdes.
- `DropdownMenu`, `PillTabs`, `PercentBar`, `AsyncSection`, `UserAvatar` creados y verificados.
- Tokens de marca unificados, glow del Button dorado, safe-areas aplicadas, skip-link y reduced-motion presentes.
- Navbar, BottomNav y LanguageSwitcher recableados como uso de referencia (sin migrar páginas de feature).
- Bloque legacy de tokens marcado `@deprecated` (no eliminado).

**Siguiente:** Fase 1 (Prode) — primer dominio en migrarse usando estos cimientos.
