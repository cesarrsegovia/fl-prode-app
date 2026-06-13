# Cinta de puntos en MatchCard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar una banderola vertical con los puntos sumados (color por calidad del acierto) en el `MatchCard` cuando el partido está finalizado, y corregir el texto desactualizado del bonus de marcador.

**Architecture:** Se extrae un helper puro `pointsFlagTone()` (testeable sin DOM, siguiendo el patrón de `points-breakdown.ts`) que mapea el resultado de `pointsBreakdown` a un "tone" (`win` | `partial` | `miss`). `MatchCard` consume `pointsBreakdown` + `pointsFlagTone` y renderiza la cinta condicionada a `status === FINISHED`. El texto del bonus se vuelve dinámico vía interpolación i18n con `POINTS_EXACT_SCORE`.

**Tech Stack:** Next.js + React, next-intl (i18n), Tailwind (tokens `neon`/`citrus`/`destructive`/`success`), Vitest (tests puros, environment `node`).

---

## File Structure

- `apps/web/src/lib/points-flag.ts` — **Crear.** Helper puro `pointsFlagTone(breakdown)`. Una sola responsabilidad: mapear breakdown → tone.
- `apps/web/src/lib/points-flag.test.ts` — **Crear.** Tests del helper.
- `apps/web/src/components/prode/MatchCard.tsx` — **Modificar.** Render de la cinta + fix del texto de bonus.
- `apps/web/src/messages/es/prode.json` — **Modificar.** Clave `scoreBonus` con interpolación + nuevas claves `pointsFlag`.

---

## Task 1: Helper puro `pointsFlagTone`

**Files:**
- Create: `apps/web/src/lib/points-flag.ts`
- Test: `apps/web/src/lib/points-flag.test.ts`

- [ ] **Step 1: Write the failing test**

`apps/web/src/lib/points-flag.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { pointsFlagTone } from './points-flag';

describe('pointsFlagTone', () => {
  it('marcador exacto (exact > 0) => win', () => {
    expect(
      pointsFlagTone({ winner: 3, exact: 2, captainBonus: 0, total: 5 }),
    ).toBe('win');
  });

  it('solo resultado acertado (winner>0, exact=0) => partial', () => {
    expect(
      pointsFlagTone({ winner: 3, exact: 0, captainBonus: 0, total: 3 }),
    ).toBe('partial');
  });

  it('solo resultado con capitán (total 6, exact 0) => partial', () => {
    expect(
      pointsFlagTone({ winner: 3, exact: 0, captainBonus: 3, total: 6 }),
    ).toBe('partial');
  });

  it('exacto con capitán (total 10) => win', () => {
    expect(
      pointsFlagTone({ winner: 3, exact: 2, captainBonus: 5, total: 10 }),
    ).toBe('win');
  });

  it('nada acertado (total 0) => miss', () => {
    expect(
      pointsFlagTone({ winner: 0, exact: 0, captainBonus: 0, total: 0 }),
    ).toBe('miss');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @prode/web exec vitest run src/lib/points-flag.test.ts`
Expected: FAIL — "Cannot find module './points-flag'" / `pointsFlagTone is not a function`.

(Si `pnpm --filter` no resuelve, alternativa: `cd apps/web && npx vitest run src/lib/points-flag.test.ts`.)

- [ ] **Step 3: Write minimal implementation**

`apps/web/src/lib/points-flag.ts`:

```ts
import type { PointsBreakdownResult } from './points-breakdown';

/** Tono visual de la cinta de puntos según la CALIDAD del acierto, no el monto. */
export type PointsFlagTone = 'win' | 'partial' | 'miss';

export function pointsFlagTone(b: PointsBreakdownResult): PointsFlagTone {
  if (b.exact > 0) return 'win';
  if (b.winner > 0) return 'partial';
  return 'miss';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @prode/web exec vitest run src/lib/points-flag.test.ts`
Expected: PASS (5 passing).

- [ ] **Step 5: Commit** (el usuario commitea; ver nota al final)

---

## Task 2: i18n — texto de bonus dinámico + claves de la cinta

**Files:**
- Modify: `apps/web/src/messages/es/prode.json` (bloque `match`, ~líneas 88-108)

- [ ] **Step 1: Editar las claves**

En `apps/web/src/messages/es/prode.json`, dentro del objeto `"match": { … }`:

Reemplazar:

```json
    "scoreBonus": "Bonus marcador (+3 pts)",
```

por:

```json
    "scoreBonus": "Bonus marcador (+{points} pts)",
    "pointsFlag": {
      "pts": "pts",
      "aria": "Sumaste {points} puntos con este pronóstico"
    },
```

- [ ] **Step 2: Verificar paridad de mensajes**

Run: `pnpm --filter @prode/web exec vitest run src/i18n/messages-parity.test.ts`
Expected: PASS — no debe romperse la paridad de locales. Si el test falla porque
otro locale (ej. `en`) no tiene las claves nuevas, agregar las mismas claves
(`scoreBonus` con `{points}`, `pointsFlag.pts`, `pointsFlag.aria`) en el archivo
de ese locale con su traducción correspondiente.

- [ ] **Step 3: Commit** (el usuario commitea)

---

## Task 3: Render de la cinta + fix del texto de bonus en `MatchCard`

**Files:**
- Modify: `apps/web/src/components/prode/MatchCard.tsx`

- [ ] **Step 1: Agregar imports**

En el bloque de imports de `MatchCard.tsx`, añadir (junto a los imports de
`@prode/shared` y libs locales):

```tsx
import { MatchStatus, Result, POINTS_EXACT_SCORE } from '@prode/shared';
import { pointsBreakdown } from '@/lib/points-breakdown';
import { pointsFlagTone } from '@/lib/points-flag';
```

Nota: la línea actual `import { MatchStatus, Result } from '@prode/shared';`
debe quedar fusionada para incluir `POINTS_EXACT_SCORE` (no dupliques el import).

- [ ] **Step 2: Calcular el breakdown dentro del componente**

Dentro de `MatchCard`, después de `const isLocked = …` (≈ línea 70), agregar:

```tsx
  const finished = match.status === MatchStatus.FINISHED;
  const flagBreakdown =
    finished && pick?.result
      ? pointsBreakdown(
          {
            result: pick.result,
            homeScoreGuess: pick.homeScoreGuess ?? null,
            awayScoreGuess: pick.awayScoreGuess ?? null,
            isCaptain: pick.isCaptain ?? false,
          },
          {
            homeScore: match.homeScore ?? null,
            awayScore: match.awayScore ?? null,
            status: match.status,
          },
        )
      : null;
  const flagTone = flagBreakdown ? pointsFlagTone(flagBreakdown) : null;
```

- [ ] **Step 3: Hacer el contenedor raíz `relative` y renderizar la cinta**

En el `return`, el `<div>` raíz (≈ línea 132) ya tiene `cn('rounded-xl overflow-hidden border-l-4 …')`.
**Quitar `overflow-hidden`** (recortaría la cinta) y añadir `relative`. Queda:

```tsx
    <div
      className={cn(
        'rounded-xl border-l-4 transition-all bg-surface-1 relative',
        pick?.isCaptain ? 'border-neon glow-neon' : 'border-line/40',
        isLocked && 'opacity-60',
      )}
    >
```

Luego, **como primer hijo dentro de ese div raíz** (antes del `<div className="p-4 sm:p-5">`), insertar la cinta:

```tsx
      {flagBreakdown && flagTone && (
        <div
          aria-label={t('pointsFlag.aria', { points: flagBreakdown.total })}
          className={cn(
            'absolute top-1/2 -translate-y-1/2 right-0 translate-x-1/2',
            'flex flex-col items-center justify-center rounded-lg px-3 py-2 shadow-lg',
            'border',
            flagTone === 'win' && 'bg-success/20 border-success/60 text-success',
            flagTone === 'partial' && 'bg-citrus/20 border-citrus/60 text-citrus',
            flagTone === 'miss' &&
              'bg-destructive/20 border-destructive/60 text-destructive',
          )}
        >
          <span className="font-display font-extrabold text-2xl leading-none tabular-nums">
            {flagBreakdown.total}
          </span>
          <span className="font-display font-bold text-[10px] uppercase tracking-[0.18em] leading-none mt-0.5">
            {t('pointsFlag.pts')}
          </span>
        </div>
      )}
```

- [ ] **Step 4: Fix del texto de bonus**

En el bloque del `scoreBonus` (≈ línea 232), reemplazar:

```tsx
              {t('scoreBonus')}
```

por:

```tsx
              {t('scoreBonus', { points: POINTS_EXACT_SCORE })}
```

- [ ] **Step 5: Type-check y build del front**

Run: `pnpm --filter @prode/web exec tsc --noEmit`
Expected: sin errores de tipo en `MatchCard.tsx` ni en los nuevos archivos.

- [ ] **Step 6: Correr toda la suite del front**

Run: `pnpm --filter @prode/web test`
Expected: PASS (incluye `points-flag.test.ts` y `messages-parity.test.ts`).

- [ ] **Step 7: Commit** (el usuario commitea)

---

## Verificación visual (manual)

Después de implementar, levantar el front y abrir un fixture con al menos un
partido `FINISHED` que tenga pronóstico cargado. Confirmar:

- Cinta visible solo en partidos finalizados con pick; ausente en abiertos/live.
- Color: marcador exacto → verde; solo resultado → ámbar; fallo → rojo.
- La cinta no recorta ni desplaza las banderas/L-E-V; sin overflow horizontal en mobile.
- En un partido abierto, el indicador inferior dice "Bonus marcador (+2 pts)".

---

## Nota sobre commits

El usuario maneja sus propios commits (ver memoria `user-handles-own-git-pushes`).
Los "Step: Commit" quedan como puntos de corte lógicos; **no ejecutar `git commit`**
— avisar al usuario al cerrar cada tarea para que él commitee.

---

## Self-Review

- **Cobertura del spec:** cinta condicionada a FINISHED + pick (Task 3 Step 2-3) ✓; total real calculado (usa `flagBreakdown.total`) ✓; color por componentes exact/winner/cero (Task 1 helper + Task 3 clases) ✓; fix bonus dinámico con `POINTS_EXACT_SCORE` (Task 2 + Task 3 Step 4) ✓; i18n y aria-label (Task 2, Task 3 Step 3) ✓; no toca MatchRow ni constantes ✓.
- **Placeholders:** ninguno; todo el código está escrito.
- **Consistencia de tipos:** `PointsBreakdownResult` importado de `points-breakdown.ts` (campos `winner/exact/total`), `pointsFlagTone` devuelve `'win'|'partial'|'miss'` usado idéntico en Task 3. `pointsBreakdown` recibe `homeScoreGuess: number | null` — por eso se pasa `pick.homeScoreGuess ?? null`.
