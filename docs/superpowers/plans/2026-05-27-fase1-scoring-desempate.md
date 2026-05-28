# Fase 1 — Scoring + Desempate (backend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alinear el scoring a 3+2=5, agregar predicciones especiales a 15 pts, y agregar sub-stats de desempate (acertados / exactos / suma de goles / fecha de 1ª predicción) al ranking — todo en el backend.

**Architecture:** La lógica de puntos y el orden del ranking se extraen a **funciones puras** (`scoring.ts`, `ranking-order.ts`) unit-testeables sin base de datos. El servicio `ResultadosService` las consume y persiste contadores denormalizados en `GroupScore` dentro del mismo flujo de cálculo. El ranking expone los sub-stats y ordena por la cascada de desempate.

**Tech Stack:** NestJS 11, Prisma 6 (PostgreSQL), `@prode/shared` (workspace), pnpm + turbo, Jest + ts-jest (a instalar en la Tarea 1).

**Spec:** `docs/superpowers/specs/2026-05-27-paridad-prode-lemon-design.md` (Módulos 1 y 2).

---

## File Structure

- `apps/api/package.json` — agregar deps de test + bloque `jest`.
- `apps/api/src/modules/resultados/scoring.ts` — **(nuevo)** funciones puras de cálculo de puntos y stats por predicción.
- `apps/api/src/modules/resultados/scoring.spec.ts` — **(nuevo)** tests de `scoring.ts`.
- `apps/api/src/modules/ranking/ranking-order.ts` — **(nuevo)** comparador puro + `orderBy` de Prisma.
- `apps/api/src/modules/ranking/ranking-order.spec.ts` — **(nuevo)** tests del comparador.
- `packages/shared/src/constants/index.ts` — cambiar `POINTS_EXACT_SCORE`, agregar `POINTS_CHAMPION`, `POINTS_TOP_SCORER`.
- `apps/api/prisma/schema.prisma` — `GroupScore`: +4 campos.
- `apps/api/src/modules/resultados/resultados.service.ts` — usar `scoring.ts`, persistir contadores.
- `apps/api/src/modules/ranking/ranking.service.ts` — exponer sub-stats + nuevo orden.

---

## Task 1: Montar el harness de Jest en apps/api

No existe ningún test ni jest instalado. Esta tarea deja `pnpm --filter @prode/api test` funcionando.

**Files:**
- Modify: `apps/api/package.json`
- Test: `apps/api/src/smoke.spec.ts` (temporal)

- [ ] **Step 1: Instalar dependencias de test**

Run:
```bash
pnpm --filter @prode/api add -D jest@^29 ts-jest@^29 @types/jest@^29
```
Expected: instala jest, ts-jest, @types/jest en `apps/api/devDependencies`.

- [ ] **Step 2: Agregar el bloque `jest` a `apps/api/package.json`**

Agregar esta key al nivel raíz del JSON (después de `"prisma": { ... }`):
```json
"jest": {
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": "src",
  "testRegex": ".*\\.spec\\.ts$",
  "transform": { "^.+\\.(t|j)s$": ["ts-jest", { "isolatedModules": true }] },
  "moduleNameMapper": {
    "^@prode/shared$": "<rootDir>/../../../packages/shared/src/index.ts"
  },
  "testEnvironment": "node"
}
```
(El `moduleNameMapper` permite importar `@prode/shared` desde el código fuente sin tener que compilar el paquete primero.)

- [ ] **Step 3: Escribir un smoke test temporal**

Create `apps/api/src/smoke.spec.ts`:
```ts
describe('jest harness', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 4: Correr el smoke test**

Run: `pnpm --filter @prode/api test`
Expected: PASS — 1 test passed.

- [ ] **Step 5: Borrar el smoke test y commitear el harness**

```bash
rm apps/api/src/smoke.spec.ts
git add apps/api/package.json pnpm-lock.yaml
git commit -m "test(api): set up jest harness"
```

---

## Task 2: Constantes de scoring + función pura `scoring.ts`

**Files:**
- Modify: `packages/shared/src/constants/index.ts`
- Create: `apps/api/src/modules/resultados/scoring.ts`
- Test: `apps/api/src/modules/resultados/scoring.spec.ts`

- [ ] **Step 1: Actualizar constantes en `@prode/shared`**

En `packages/shared/src/constants/index.ts`, cambiar y agregar (dejar `POINTS_CORRECT_RESULT` y `CAPTAIN_MULTIPLIER` como están):
```ts
export const POINTS_CORRECT_RESULT = 3;
export const POINTS_EXACT_SCORE = 2; // antes 3 — alineado a Prode Lemon (3+2=5)
export const CAPTAIN_MULTIPLIER = 2;
export const POINTS_CHAMPION = 15;
export const POINTS_TOP_SCORER = 15;
```

- [ ] **Step 2: Escribir el test de la función pura (falla)**

Create `apps/api/src/modules/resultados/scoring.spec.ts`:
```ts
import { Result } from '@prisma/client';
import { computePredictionOutcome, resultFromScore } from './scoring';

describe('resultFromScore', () => {
  it('mapea local/empate/visitante', () => {
    expect(resultFromScore(2, 0)).toBe(Result.HOME);
    expect(resultFromScore(0, 2)).toBe(Result.AWAY);
    expect(resultFromScore(1, 1)).toBe(Result.DRAW);
  });
});

describe('computePredictionOutcome', () => {
  const base = { homeScoreGuess: null as number | null, awayScoreGuess: null as number | null, isCaptain: false };

  it('acierta solo el ganador: 3 pts', () => {
    const out = computePredictionOutcome(
      { ...base, result: Result.HOME, homeScoreGuess: 1, awayScoreGuess: 0 },
      { homeScore: 2, awayScore: 0 },
    );
    expect(out).toEqual({ points: 3, correctWinner: 1, exactScore: 0, exactGoals: 0 });
  });

  it('acierta resultado exacto: 5 pts y suma goles', () => {
    const out = computePredictionOutcome(
      { ...base, result: Result.HOME, homeScoreGuess: 2, awayScoreGuess: 1 },
      { homeScore: 2, awayScore: 1 },
    );
    expect(out).toEqual({ points: 5, correctWinner: 1, exactScore: 1, exactGoals: 3 });
  });

  it('capitán duplica los puntos del exacto: 10 pts', () => {
    const out = computePredictionOutcome(
      { ...base, result: Result.HOME, homeScoreGuess: 2, awayScoreGuess: 1, isCaptain: true },
      { homeScore: 2, awayScore: 1 },
    );
    expect(out.points).toBe(10);
    expect(out.exactGoals).toBe(3); // los contadores NO se multiplican
  });

  it('falla el ganador: 0 pts', () => {
    const out = computePredictionOutcome(
      { ...base, result: Result.HOME, homeScoreGuess: 1, awayScoreGuess: 0 },
      { homeScore: 0, awayScore: 1 },
    );
    expect(out).toEqual({ points: 0, correctWinner: 0, exactScore: 0, exactGoals: 0 });
  });

  it('empate correcto no exacto: 3 pts', () => {
    const out = computePredictionOutcome(
      { ...base, result: Result.DRAW, homeScoreGuess: 1, awayScoreGuess: 1 },
      { homeScore: 2, awayScore: 2 },
    );
    expect(out).toEqual({ points: 3, correctWinner: 1, exactScore: 0, exactGoals: 0 });
  });
});
```

- [ ] **Step 3: Correr el test (debe fallar)**

Run: `pnpm --filter @prode/api test scoring`
Expected: FAIL — "Cannot find module './scoring'".

- [ ] **Step 4: Implementar `scoring.ts`**

Create `apps/api/src/modules/resultados/scoring.ts`:
```ts
import { Result } from '@prisma/client';
import { POINTS_CORRECT_RESULT, POINTS_EXACT_SCORE, CAPTAIN_MULTIPLIER } from '@prode/shared';

export interface ScorablePrediction {
  result: Result;
  homeScoreGuess: number | null;
  awayScoreGuess: number | null;
  isCaptain: boolean;
}

export interface FinalScore {
  homeScore: number;
  awayScore: number;
}

export interface PredictionOutcome {
  points: number;
  correctWinner: number; // 0 | 1
  exactScore: number; // 0 | 1
  exactGoals: number; // homeScore + awayScore si exacto, si no 0
}

export function resultFromScore(homeScore: number, awayScore: number): Result {
  if (homeScore > awayScore) return Result.HOME;
  if (homeScore < awayScore) return Result.AWAY;
  return Result.DRAW;
}

export function computePredictionOutcome(
  pred: ScorablePrediction,
  final: FinalScore,
): PredictionOutcome {
  const actual = resultFromScore(final.homeScore, final.awayScore);
  let points = 0;
  let correctWinner = 0;
  let exactScore = 0;
  let exactGoals = 0;

  if (pred.result === actual) {
    points += POINTS_CORRECT_RESULT;
    correctWinner = 1;
    if (pred.homeScoreGuess === final.homeScore && pred.awayScoreGuess === final.awayScore) {
      points += POINTS_EXACT_SCORE;
      exactScore = 1;
      exactGoals = final.homeScore + final.awayScore;
    }
  }
  if (pred.isCaptain) points *= CAPTAIN_MULTIPLIER;

  return { points, correctWinner, exactScore, exactGoals };
}
```

- [ ] **Step 5: Correr el test (debe pasar)**

Run: `pnpm --filter @prode/api test scoring`
Expected: PASS — 6 tests passed.

- [ ] **Step 6: Rebuild de `@prode/shared` (el runtime importa desde dist)**

Run: `pnpm --filter @prode/shared build`
Expected: compila sin errores; `packages/shared/dist/index.js` actualizado con `POINTS_EXACT_SCORE = 2`.

- [ ] **Step 7: Commit**

```bash
git add packages/shared/src/constants/index.ts apps/api/src/modules/resultados/scoring.ts apps/api/src/modules/resultados/scoring.spec.ts
git commit -m "feat(scoring): puntos exactos a 2 (total 5) + funcion pura de scoring"
```

---

## Task 3: Migración de `GroupScore` (contadores de desempate)

**Files:**
- Modify: `apps/api/prisma/schema.prisma:335-347` (modelo `GroupScore`)

- [ ] **Step 1: Agregar campos al modelo `GroupScore`**

En `apps/api/prisma/schema.prisma`, dentro de `model GroupScore`, agregar después de `streak`:
```prisma
model GroupScore {
  id           String @id @default(cuid())
  groupId      String
  userId       String
  tournamentId String
  total        Int    @default(0)
  streak       Int    @default(0)
  correctWinners    Int       @default(0)
  exactScores       Int       @default(0)
  exactGoalsSum     Int       @default(0)
  firstPredictionAt DateTime?

  group      Group      @relation(fields: [groupId], references: [id])
  tournament Tournament @relation(fields: [tournamentId], references: [id])

  @@unique([groupId, userId, tournamentId])
}
```

- [ ] **Step 2: Crear y aplicar la migración**

Run: `pnpm --filter @prode/api exec prisma migrate dev --name group_score_tiebreak_counters`
Expected: crea la migración en `apps/api/prisma/migrations/...` y regenera el Prisma Client. Sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations
git commit -m "feat(db): contadores de desempate en GroupScore"
```

---

## Task 4: Comparador puro de ranking `ranking-order.ts`

**Files:**
- Create: `apps/api/src/modules/ranking/ranking-order.ts`
- Test: `apps/api/src/modules/ranking/ranking-order.spec.ts`

- [ ] **Step 1: Escribir el test (falla)**

Create `apps/api/src/modules/ranking/ranking-order.spec.ts`:
```ts
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
```

- [ ] **Step 2: Correr el test (debe fallar)**

Run: `pnpm --filter @prode/api test ranking-order`
Expected: FAIL — "Cannot find module './ranking-order'".

- [ ] **Step 3: Implementar `ranking-order.ts`**

Create `apps/api/src/modules/ranking/ranking-order.ts`:
```ts
import { Prisma } from '@prisma/client';

export interface RankableScore {
  total: number;
  correctWinners: number;
  exactScores: number;
  exactGoalsSum: number;
  firstPredictionAt: Date | null;
}

// Orden para queries findMany sobre GroupScore (mismo criterio que compareScoreRows).
export const GROUP_SCORE_ORDER_BY: Prisma.GroupScoreOrderByWithRelationInput[] = [
  { total: 'desc' },
  { correctWinners: 'desc' },
  { exactScores: 'desc' },
  { exactGoalsSum: 'desc' },
  { firstPredictionAt: 'asc' }, // Postgres ordena nulls al final en asc
];

export function compareScoreRows(a: RankableScore, b: RankableScore): number {
  if (b.total !== a.total) return b.total - a.total;
  if (b.correctWinners !== a.correctWinners) return b.correctWinners - a.correctWinners;
  if (b.exactScores !== a.exactScores) return b.exactScores - a.exactScores;
  if (b.exactGoalsSum !== a.exactGoalsSum) return b.exactGoalsSum - a.exactGoalsSum;
  const at = a.firstPredictionAt ? a.firstPredictionAt.getTime() : Infinity;
  const bt = b.firstPredictionAt ? b.firstPredictionAt.getTime() : Infinity;
  return at - bt;
}
```

- [ ] **Step 4: Correr el test (debe pasar)**

Run: `pnpm --filter @prode/api test ranking-order`
Expected: PASS — 5 tests passed.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/ranking/ranking-order.ts apps/api/src/modules/ranking/ranking-order.spec.ts
git commit -m "feat(ranking): comparador puro de desempate"
```

---

## Task 5: Integrar scoring + contadores en `ResultadosService`

**Files:**
- Modify: `apps/api/src/modules/resultados/resultados.service.ts`

- [ ] **Step 1: Importar la función pura y reemplazar el cálculo inline**

En `apps/api/src/modules/resultados/resultados.service.ts`, reemplazar el import de constantes:
```ts
// ELIMINAR este import:
import { POINTS_CORRECT_RESULT, POINTS_EXACT_SCORE, CAPTAIN_MULTIPLIER } from '@prode/shared';
// AGREGAR:
import { computePredictionOutcome } from './scoring';
```

- [ ] **Step 2: Reemplazar el cuerpo del loop de cálculo**

Dentro de `calculatePoints`, reemplazar el bloque `for (const pred of finished) { ... }` por:
```ts
    for (const pred of finished) {
      const { homeScore, awayScore } = pred.match;
      const outcome = computePredictionOutcome(pred, {
        homeScore: homeScore!,
        awayScore: awayScore!,
      });

      await this.prisma.prediction.update({
        where: { id: pred.id },
        data: { pointsEarned: outcome.points },
      });

      await this.updateGroupScores(
        pred.userId,
        {
          points: outcome.points,
          correctWinners: outcome.correctWinner,
          exactScores: outcome.exactScore,
          exactGoalsSum: outcome.exactGoals,
        },
        pred.match.tournamentId,
        pred.createdAt,
      );
      pointsByUser.set(pred.userId, (pointsByUser.get(pred.userId) ?? 0) + outcome.points);
    }
```

- [ ] **Step 3: Reescribir `updateGroupScores` para persistir los contadores**

Reemplazar el método `updateGroupScores` completo por:
```ts
  private async updateGroupScores(
    userId: string,
    delta: { points: number; correctWinners: number; exactScores: number; exactGoalsSum: number },
    tournamentId: string,
    predictionCreatedAt: Date,
  ) {
    const memberships = await this.prisma.groupMember.findMany({ where: { userId } });
    for (const membership of memberships) {
      const existing = await this.prisma.groupScore.findUnique({
        where: {
          groupId_userId_tournamentId: {
            groupId: membership.groupId,
            userId,
            tournamentId,
          },
        },
      });
      if (existing) {
        const newStreak = delta.points > 0 ? existing.streak + 1 : 0;
        const firstPredictionAt =
          !existing.firstPredictionAt || predictionCreatedAt < existing.firstPredictionAt
            ? predictionCreatedAt
            : existing.firstPredictionAt;
        await this.prisma.groupScore.update({
          where: { id: existing.id },
          data: {
            total: existing.total + delta.points,
            streak: newStreak,
            correctWinners: existing.correctWinners + delta.correctWinners,
            exactScores: existing.exactScores + delta.exactScores,
            exactGoalsSum: existing.exactGoalsSum + delta.exactGoalsSum,
            firstPredictionAt,
          },
        });
      } else {
        await this.prisma.groupScore.create({
          data: {
            userId,
            groupId: membership.groupId,
            tournamentId,
            total: delta.points,
            streak: delta.points > 0 ? 1 : 0,
            correctWinners: delta.correctWinners,
            exactScores: delta.exactScores,
            exactGoalsSum: delta.exactGoalsSum,
            firstPredictionAt: predictionCreatedAt,
          },
        });
      }
    }
  }
```

- [ ] **Step 4: Actualizar el orden de `snapshotPositions`**

En `snapshotPositions`, reemplazar el `orderBy` del `findMany` para que use la misma cascada de desempate:
```ts
    const scores = await this.prisma.groupScore.findMany({
      where: { groupId: { in: groupIds }, tournamentId },
      orderBy: [
        { total: 'desc' },
        { correctWinners: 'desc' },
        { exactScores: 'desc' },
        { exactGoalsSum: 'desc' },
        { firstPredictionAt: 'asc' },
      ],
      select: { groupId: true, userId: true },
    });
```

- [ ] **Step 5: Verificar compilación y typecheck**

Run: `pnpm --filter @prode/api exec tsc --noEmit`
Expected: sin errores de tipo. (Confirma que `computePredictionOutcome` recibe el shape correcto de `pred` y que los nuevos campos de `GroupScore` existen en el Client regenerado.)

- [ ] **Step 6: Verificar que la suite de tests sigue verde**

Run: `pnpm --filter @prode/api test`
Expected: PASS — scoring + ranking-order (11 tests).

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/resultados/resultados.service.ts
git commit -m "feat(scoring): persistir contadores de desempate al calcular puntos"
```

---

## Task 6: Exponer sub-stats y nuevo orden en `RankingService`

**Files:**
- Modify: `apps/api/src/modules/ranking/ranking.service.ts`

- [ ] **Step 1: Importar el orden compartido**

En `apps/api/src/modules/ranking/ranking.service.ts`, agregar:
```ts
import { GROUP_SCORE_ORDER_BY } from './ranking-order';
```

- [ ] **Step 2: Actualizar `getGroupRanking` (orden + sub-stats en la respuesta)**

Reemplazar el `findMany` y el `return scores.map(...)` por:
```ts
    const scores = await this.prisma.groupScore.findMany({
      where,
      orderBy: GROUP_SCORE_ORDER_BY,
    });

    if (!scores.length) return [];

    const userIds = scores.map((s) => s.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, avatarUrl: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    return scores.map((s, idx) => ({
      position: idx + 1,
      userId: s.userId,
      username: userMap.get(s.userId)?.username,
      avatarUrl: userMap.get(s.userId)?.avatarUrl,
      total: s.total,
      streak: s.streak,
      correctWinners: s.correctWinners,
      exactScores: s.exactScores,
      exactGoalsSum: s.exactGoalsSum,
      positionChange: 0,
    }));
```

- [ ] **Step 3: Actualizar `getGlobalRanking` (sumar contadores + orden por cascada)**

Reemplazar el `groupBy` y el `return scores.map(...)` por:
```ts
    const scores = await this.prisma.groupScore.groupBy({
      by: ['userId'],
      where,
      _sum: { total: true, correctWinners: true, exactScores: true, exactGoalsSum: true },
      _min: { firstPredictionAt: true },
      orderBy: [
        { _sum: { total: 'desc' } },
        { _sum: { correctWinners: 'desc' } },
        { _sum: { exactScores: 'desc' } },
        { _sum: { exactGoalsSum: 'desc' } },
        { _min: { firstPredictionAt: 'asc' } },
      ],
      take: 100,
    });

    if (!scores.length) return [];

    const userIds = scores.map((s) => s.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, avatarUrl: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    return scores.map((s, idx) => ({
      position: idx + 1,
      userId: s.userId,
      username: userMap.get(s.userId)?.username,
      avatarUrl: userMap.get(s.userId)?.avatarUrl,
      total: s._sum.total ?? 0,
      streak: 0,
      correctWinners: s._sum.correctWinners ?? 0,
      exactScores: s._sum.exactScores ?? 0,
      exactGoalsSum: s._sum.exactGoalsSum ?? 0,
      positionChange: 0,
    }));
```

- [ ] **Step 4: Verificar typecheck**

Run: `pnpm --filter @prode/api exec tsc --noEmit`
Expected: sin errores (confirma que `groupBy` acepta el `orderBy` por agregados y que los campos existen).

- [ ] **Step 5: Verificación funcional manual**

Run: `pnpm --filter @prode/api dev` (en otra terminal) y consultar el endpoint de ranking de grupo y global.
Expected: la respuesta JSON ahora incluye `correctWinners`, `exactScores`, `exactGoalsSum` por entrada. (Con datos en cero hoy, todos los sub-stats vienen en 0 — correcto.)

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/ranking/ranking.service.ts
git commit -m "feat(ranking): exponer sub-stats y ordenar por cascada de desempate"
```

---

## Notas para el ejecutor

- El render de los sub-stats en `RankingTable` (íconos ✓ 🎯 ⚽ por fila) es **frontend** → va en el **Plan 3** (fase frontend), que consumirá los campos que esta fase expone.
- No hay datos puntuados hoy (Mundial 2026 `Próximo`), por lo que no se requiere script de backfill. Si en el futuro hubiera datos previos al cambio, recomputar `GroupScore` desde `Prediction` recorriendo partidos finalizados con `computePredictionOutcome`.
- El cambio de `POINTS_EXACT_SCORE` requiere el rebuild de `@prode/shared` (Tarea 2, Step 6) para que el runtime de la API tome el nuevo valor; los tests lo toman del source vía `moduleNameMapper`.
