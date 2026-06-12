# Ver el prode de un amigo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vista de solo-lectura del prode completo de un miembro del grupo (campeón, goleador, clasificados R32, resultados por fecha con desglose de puntos), accesible desde la lista de miembros.

**Architecture:** Backend agrega endpoints `:userId` espejo de los `/me` existentes, con un guard que valida pertenencia compartida a un grupo. Los picks de torneo (campeón/goleador/R32) son siempre visibles; el historial de partidos oculta los partidos aún no cerrados (cierre por partido = `startTime − 1h`). El desglose de puntos se deriva en el front con un helper puro. Frontend agrega una ruta nueva bajo el grupo.

**Tech Stack:** NestJS + Prisma (api), Next.js App Router + next-intl (web), Vitest (web), Jest (api), `@prode/shared` para constantes y deadlines.

---

## File Structure

- `packages/shared/src/deadlines.ts` — ya tiene `matchLeadDeadline`; se reutiliza.
- `apps/api/src/modules/grupos/grupos.service.ts` — agregar `assertSharesGroup`.
- `apps/api/src/modules/tournaments/tournaments.controller.ts` — 3 endpoints `:userId`.
- `apps/api/src/modules/usuarios/usuarios.controller.ts` + `usuarios.service.ts` — endpoint historial por `:userId` con filtro de visibilidad.
- `apps/api/src/modules/matches/matches.service.ts:79` — fix cierre por partido.
- `apps/web/src/lib/points-breakdown.ts` (+ `.test.ts`) — helper puro del desglose.
- `apps/web/src/components/prode/PointsBreakdown.tsx` — presentación del desglose.
- `apps/web/src/lib/endpoints.ts` — métodos cliente nuevos.
- `apps/web/src/app/(main)/grupos/[id]/miembro/[userId]/page.tsx` — la vista.
- `apps/web/src/app/(main)/grupos/[id]/page.tsx` — link "ver prode" en `MembersList`.
- `apps/web/src/app/(main)/mis-pronosticos/page.tsx` — usar `PointsBreakdown`.
- messages `es/grupos.json`, `es/mis-pronosticos.json` (+ paridad de/en/fr).

---

## Task 1: Helper puro del desglose de puntos (web)

**Files:**
- Create: `apps/web/src/lib/points-breakdown.ts`
- Test: `apps/web/src/lib/points-breakdown.test.ts`

Constantes de `@prode/shared`: `POINTS_CORRECT_RESULT = 3`, `POINTS_EXACT_SCORE = 2`, `CAPTAIN_MULTIPLIER = 2`.

Regla: si el `result` pronosticado coincide con el resultado real del partido → `winner = 3`. Si además el marcador pronosticado coincide exacto → `exact = 2`. Si fue capitán, el subtotal `(winner + exact)` se multiplica ×2, y `captainBonus = subtotal` (lo que se suma de más). `total = (winner + exact) * (isCaptain ? 2 : 1)`. Si no acertó el ganador → todo 0.

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it } from 'vitest';
import { Result } from '@prode/shared';
import { pointsBreakdown } from './points-breakdown';

const match = (homeScore: number, awayScore: number) => ({
  homeScore,
  awayScore,
  status: 'FINISHED' as const,
});

describe('pointsBreakdown', () => {
  it('solo ganador acertado suma 3', () => {
    const r = pointsBreakdown(
      { result: Result.HOME, homeScoreGuess: 3, awayScoreGuess: 0, isCaptain: false },
      match(2, 0),
    );
    expect(r).toEqual({ winner: 3, exact: 0, captainBonus: 0, total: 3 });
  });

  it('ganador + marcador exacto suma 5', () => {
    const r = pointsBreakdown(
      { result: Result.HOME, homeScoreGuess: 2, awayScoreGuess: 0, isCaptain: false },
      match(2, 0),
    );
    expect(r).toEqual({ winner: 3, exact: 2, captainBonus: 0, total: 5 });
  });

  it('empate exacto suma 5', () => {
    const r = pointsBreakdown(
      { result: Result.DRAW, homeScoreGuess: 1, awayScoreGuess: 1, isCaptain: false },
      match(1, 1),
    );
    expect(r).toEqual({ winner: 3, exact: 2, captainBonus: 0, total: 5 });
  });

  it('ganador fallado suma 0', () => {
    const r = pointsBreakdown(
      { result: Result.HOME, homeScoreGuess: 1, awayScoreGuess: 0, isCaptain: false },
      match(0, 1),
    );
    expect(r).toEqual({ winner: 0, exact: 0, captainBonus: 0, total: 0 });
  });

  it('capitán duplica: ganador+exacto = 10', () => {
    const r = pointsBreakdown(
      { result: Result.HOME, homeScoreGuess: 2, awayScoreGuess: 0, isCaptain: true },
      match(2, 0),
    );
    expect(r).toEqual({ winner: 3, exact: 2, captainBonus: 5, total: 10 });
  });

  it('no exacto pero ganador acertado con capitán = 6', () => {
    const r = pointsBreakdown(
      { result: Result.HOME, homeScoreGuess: 3, awayScoreGuess: 1, isCaptain: true },
      match(2, 0),
    );
    expect(r).toEqual({ winner: 3, exact: 0, captainBonus: 3, total: 6 });
  });

  it('partido sin resultado devuelve null', () => {
    const r = pointsBreakdown(
      { result: Result.HOME, homeScoreGuess: 2, awayScoreGuess: 0, isCaptain: false },
      { homeScore: null, awayScore: null, status: 'PENDING' as const },
    );
    expect(r).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (desde `apps/web`): `npx vitest run src/lib/points-breakdown.test.ts`
Expected: FAIL — "Cannot find module './points-breakdown'".

- [ ] **Step 3: Write minimal implementation**

```typescript
import {
  CAPTAIN_MULTIPLIER,
  POINTS_CORRECT_RESULT,
  POINTS_EXACT_SCORE,
  Result,
} from '@prode/shared';

export interface PredictionParts {
  result: Result;
  homeScoreGuess: number | null;
  awayScoreGuess: number | null;
  isCaptain: boolean;
}

export interface MatchResultParts {
  homeScore: number | null;
  awayScore: number | null;
  status: 'PENDING' | 'LIVE' | 'FINISHED' | 'CANCELLED';
}

export interface PointsBreakdownResult {
  winner: number;
  exact: number;
  captainBonus: number;
  total: number;
}

function realResult(m: MatchResultParts): Result | null {
  if (m.homeScore === null || m.awayScore === null) return null;
  if (m.homeScore > m.awayScore) return Result.HOME;
  if (m.homeScore < m.awayScore) return Result.AWAY;
  return Result.DRAW;
}

export function pointsBreakdown(
  pred: PredictionParts,
  match: MatchResultParts,
): PointsBreakdownResult | null {
  const real = realResult(match);
  if (real === null) return null;

  const winner = pred.result === real ? POINTS_CORRECT_RESULT : 0;
  const exact =
    winner > 0 &&
    pred.homeScoreGuess === match.homeScore &&
    pred.awayScoreGuess === match.awayScore
      ? POINTS_EXACT_SCORE
      : 0;
  const subtotal = winner + exact;
  const total = subtotal * (pred.isCaptain ? CAPTAIN_MULTIPLIER : 1);
  const captainBonus = total - subtotal;
  return { winner, exact, captainBonus, total };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/points-breakdown.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/points-breakdown.ts apps/web/src/lib/points-breakdown.test.ts
git commit -m "feat(web): helper puro pointsBreakdown para desglose de puntos por partido"
```

---

## Task 2: Componente `<PointsBreakdown />` (web)

**Files:**
- Create: `apps/web/src/components/prode/PointsBreakdown.tsx`

Presentación del desglose; usa el helper de Task 1. Solo renderiza si el partido está finalizado (helper devuelve no-null). Muestra ganador (+3), exacto (+2) y, si hubo capitán, ×2. Usa claves i18n `mis-pronosticos.breakdown.*` (Task 6 las agrega; el componente las consume).

- [ ] **Step 1: Write the component**

```tsx
'use client';

import { useTranslations } from 'next-intl';
import {
  pointsBreakdown,
  type MatchResultParts,
  type PredictionParts,
} from '@/lib/points-breakdown';
import { cn } from '@/lib/utils';

export function PointsBreakdown({
  pred,
  match,
}: {
  pred: PredictionParts;
  match: MatchResultParts;
}) {
  const t = useTranslations('mis-pronosticos.breakdown');
  const b = pointsBreakdown(pred, match);
  if (!b) return null;

  return (
    <div className="flex flex-col items-end gap-0.5 text-[10px] font-display font-bold uppercase tracking-[0.12em]">
      <span
        className={cn(
          'tabular-nums text-sm',
          b.total > 0 ? 'text-neon' : 'text-ink-dim',
        )}
      >
        {t('total', { points: b.total })}
      </span>
      {b.total > 0 && (
        <span className="text-ink-muted normal-case tracking-normal">
          {t('winner', { points: b.winner })}
          {b.exact > 0 && ` · ${t('exact', { points: b.exact })}`}
          {b.captainBonus > 0 && ` · ${t('captain')}`}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it typechecks**

Run (desde `apps/web`): `npx tsc --noEmit`
Expected: sin errores nuevos (las claves i18n se resuelven en runtime; tsc no las valida). Si hay error de import de tipos, ajustar el import.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/prode/PointsBreakdown.tsx
git commit -m "feat(web): componente PointsBreakdown"
```

---

## Task 3: Guard `assertSharesGroup` (api)

**Files:**
- Modify: `apps/api/src/modules/grupos/grupos.service.ts`

Método que verifica que `requesterId` y `targetUserId` sean ambos miembros de `groupId`; lanza `ForbiddenException` si alguno no lo es. Reutilizable por los controllers de tournaments y usuarios.

- [ ] **Step 1: Add the method**

En `grupos.service.ts`, agregar (importar `ForbiddenException` de `@nestjs/common` si falta):

```typescript
/**
 * Valida que tanto el solicitante como el usuario objetivo pertenezcan al
 * mismo grupo. Usado para autorizar la lectura del prode de un compañero.
 */
async assertSharesGroup(
  requesterId: string,
  targetUserId: string,
  groupId: string,
): Promise<void> {
  const [requester, target] = await Promise.all([
    this.prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: requesterId, groupId } },
      select: { id: true },
    }),
    this.prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: targetUserId, groupId } },
      select: { id: true },
    }),
  ]);
  if (!requester || !target) {
    throw new ForbiddenException('No comparten este grupo');
  }
}
```

- [ ] **Step 2: Verify build**

Run (desde `apps/api`): `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/grupos/grupos.service.ts
git commit -m "feat(api): assertSharesGroup para autorizar lectura cruzada en grupos"
```

---

## Task 4: Endpoints de picks de torneo por `:userId` (api)

**Files:**
- Modify: `apps/api/src/modules/tournaments/tournaments.controller.ts`

Reutilizan `getMyBracketPick(id, userId)`, `getMyTopScorerPick(id, userId)`, `getMyR32Picks(id, userId)` ya existentes; agregan el guard de grupo. El `groupId` viaja como query param. Inyectar `GruposService` en el controller (importarlo y agregarlo al módulo si no está; verificar `tournaments.module.ts` imports — si `GruposModule` no exporta `GruposService`, agregar `exports: [GruposService]` en `grupos.module.ts` e importar `GruposModule` en `tournaments.module.ts`).

- [ ] **Step 1: Inyectar GruposService**

En `tournaments.controller.ts`, agregar import `import { GruposService } from '../grupos/grupos.service';` y en el constructor: `private readonly grupos: GruposService`. En `tournaments.module.ts`, agregar `GruposModule` a `imports`. En `grupos.module.ts`, asegurar `exports: [GruposService]`.

- [ ] **Step 2: Agregar los 3 endpoints**

Después de `myBracketPick` (línea ~76), `myR32Picks` (~114) y `myTopScorerPick` (~146), agregar respectivamente:

```typescript
@UseGuards(AuthGuard('jwt'))
@Get(':id/bracket-pick/user/:userId')
async userBracketPick(
  @Param('id') id: string,
  @Param('userId') userId: string,
  @Query('groupId') groupId: string,
  @CurrentUser() user: { userId: string },
) {
  await this.grupos.assertSharesGroup(user.userId, userId, groupId);
  return this.service.getMyBracketPick(id, userId);
}

@UseGuards(AuthGuard('jwt'))
@Get(':id/r32-picks/user/:userId')
async userR32Picks(
  @Param('id') id: string,
  @Param('userId') userId: string,
  @Query('groupId') groupId: string,
  @CurrentUser() user: { userId: string },
) {
  await this.grupos.assertSharesGroup(user.userId, userId, groupId);
  return this.service.getMyR32Picks(id, userId);
}

@UseGuards(AuthGuard('jwt'))
@Get(':id/top-scorer-pick/user/:userId')
async userTopScorerPick(
  @Param('id') id: string,
  @Param('userId') userId: string,
  @Query('groupId') groupId: string,
  @CurrentUser() user: { userId: string },
) {
  await this.grupos.assertSharesGroup(user.userId, userId, groupId);
  return this.service.getMyTopScorerPick(id, userId);
}
```

Verificar que `Query` esté importado de `@nestjs/common` en el controller.

- [ ] **Step 3: Verify build**

Run (desde `apps/api`): `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/tournaments/tournaments.controller.ts apps/api/src/modules/tournaments/tournaments.module.ts apps/api/src/modules/grupos/grupos.module.ts
git commit -m "feat(api): endpoints de picks de torneo por userId con guard de grupo"
```

---

## Task 5: Historial de partidos por `:userId` con filtro de visibilidad (api)

**Files:**
- Modify: `apps/api/src/modules/usuarios/usuarios.service.ts`
- Modify: `apps/api/src/modules/usuarios/usuarios.controller.ts`
- Modify: `apps/api/src/modules/matches/matches.service.ts:79` (fix cierre por partido)

El service nuevo filtra los partidos cuyo `startTime − 1h > now` (aún no cerrados). Usa `matchLeadDeadline` de `@prode/shared`. El controller valida pertenencia compartida (groupId por query).

- [ ] **Step 1: Agregar método de service con filtro**

En `usuarios.service.ts`, agregar (importar `matchLeadDeadline` de `@prode/shared`):

```typescript
/**
 * Historial de picks de partido de otro usuario, ocultando los partidos que
 * aún no cerraron (cierre por partido = startTime − 1h). Misma forma que
 * getPredictionsHistory para reusar el render en el front.
 */
async getVisiblePredictionsHistory(
  userId: string,
  opts: { take?: number; cursor?: string } = {},
) {
  const take = Math.min(opts.take ?? 30, 100);
  const now = new Date();
  const cursor = opts.cursor ? { id: opts.cursor } : undefined;
  const items = await this.prisma.prediction.findMany({
    where: {
      userId,
      match: { startTime: { lte: new Date(now.getTime() + 60 * 60 * 1000) } },
    },
    orderBy: { createdAt: 'desc' },
    take: take + 1,
    ...(cursor && { cursor, skip: 1 }),
    include: {
      match: { include: { homeTeam: true, awayTeam: true } },
      fixture: { select: { id: true, round: true, name: true } },
    },
  });
  const hasMore = items.length > take;
  const rows = hasMore ? items.slice(0, take) : items;
  return {
    items: rows,
    nextCursor: hasMore ? rows[rows.length - 1].id : null,
  };
}
```

Nota: el `where` ya excluye en BD los partidos cuyo cierre (`startTime − 1h`) es futuro — equivale a `startTime > now + 1h`, que se expresa como `startTime <= now + 1h` para los visibles.

- [ ] **Step 2: Agregar endpoint en el controller**

En `usuarios.controller.ts`, inyectar `GruposService` (import + constructor; el módulo `UsuariosModule` debe importar `GruposModule`). Agregar:

```typescript
@UseGuards(AuthGuard('jwt'))
@Get(':id/predictions')
async userPredictions(
  @Param('id') id: string,
  @Query('groupId') groupId: string,
  @CurrentUser() user: { userId: string },
  @Query('cursor') cursor?: string,
  @Query('take') take?: string,
) {
  await this.grupos.assertSharesGroup(user.userId, id, groupId);
  return this.usuariosService.getVisiblePredictionsHistory(id, {
    cursor,
    take: take ? Number(take) : undefined,
  });
}
```

Colocar este método **antes** de `@Get(':id')` (orden de rutas Nest: las más específicas primero). Verificar `Query` importado.

- [ ] **Step 3: Fix cierre por partido en matches.service.ts**

En `matches.service.ts`, reemplazar la línea 79:

```typescript
const closed = match.fixture.closeAt <= new Date();
```

por (importar `matchLeadDeadline` de `@prode/shared`, y asegurar que el `include` de la línea 73-76 traiga `startTime` — el `findUnique` ya trae todos los campos del match salvo que haya `select`; verificar que no haya `select` que lo excluya):

```typescript
const closed = matchLeadDeadline(match.startTime) <= new Date();
```

- [ ] **Step 4: Verify build**

Run (desde `apps/api`): `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/usuarios/ apps/api/src/modules/matches/matches.service.ts
git commit -m "feat(api): historial de partidos por userId con visibilidad por cierre de partido; fix cierre por partido en groupPicks"
```

---

## Task 6: i18n — claves nuevas (web)

**Files:**
- Modify: `apps/web/src/messages/es/mis-pronosticos.json`
- Modify: `apps/web/src/messages/es/grupos.json`
- Modify: `de/`, `en/`, `fr/` equivalentes (paridad)

- [ ] **Step 1: Agregar claves en es/mis-pronosticos.json**

Dentro del objeto raíz, agregar:

```json
"breakdown": {
  "total": "+{points} pts",
  "winner": "Ganador +{points}",
  "exact": "Exacto +{points}",
  "captain": "Capitán ×2"
}
```

- [ ] **Step 2: Agregar claves en es/grupos.json (sección members)**

Dentro de `members`, agregar:

```json
"viewProde": "Ver prode"
```

Y crear una sección nueva `memberProde` en el raíz de `grupos.json`:

```json
"memberProde": {
  "eyebrow": "Su prode",
  "champion": "Campeón",
  "topScorer": "Goleador",
  "qualifiers": "Clasificados a 16vos",
  "results": "Resultados por fecha",
  "none": "Sin elegir",
  "noResults": "Todavía no hay partidos cerrados para mostrar",
  "back": "← Volver al grupo",
  "loadError": "No se pudo cargar el prode"
}
```

- [ ] **Step 3: Replicar en de/en/fr**

Agregar las mismas claves traducidas en `de`, `en`, `fr` para `mis-pronosticos.json` y `grupos.json`. (en) ejemplo: `"total": "+{points} pts"`, `"winner": "Winner +{points}"`, `"exact": "Exact +{points}"`, `"captain": "Captain ×2"`; `members.viewProde`: "View prode"; `memberProde.eyebrow`: "Their prode", etc. Traducir de/fr análogamente.

- [ ] **Step 4: Verify paridad de mensajes**

Run (desde `apps/web`): `npx vitest run src/i18n/messages-parity.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/messages/
git commit -m "i18n: claves para desglose de puntos y vista del prode de un amigo"
```

---

## Task 7: Cliente — métodos de endpoints (web)

**Files:**
- Modify: `apps/web/src/lib/endpoints.ts`

- [ ] **Step 1: Agregar métodos `user` a los objetos existentes**

En `bracketPick` agregar:
```typescript
ofUser: (tournamentId: string, userId: string, groupId: string) =>
  apiClient
    .get<BracketPickResponse | null>(
      `/tournaments/${tournamentId}/bracket-pick/user/${userId}`,
      { params: { groupId } },
    )
    .then((r) => r.data),
```

En `topScorerPick` agregar:
```typescript
ofUser: (tournamentId: string, userId: string, groupId: string) =>
  apiClient
    .get<TopScorerPickResponse | null>(
      `/tournaments/${tournamentId}/top-scorer-pick/user/${userId}`,
      { params: { groupId } },
    )
    .then((r) => r.data),
```

En `r32Picks` agregar:
```typescript
ofUser: (tournamentId: string, userId: string, groupId: string) =>
  apiClient
    .get<R32PickResponse[]>(
      `/tournaments/${tournamentId}/r32-picks/user/${userId}`,
      { params: { groupId } },
    )
    .then((r) => r.data),
```

En `stats` agregar:
```typescript
userHistory: (userId: string, groupId: string, cursor?: string, take = 30) =>
  apiClient
    .get<{ items: PredictionHistoryItem[]; nextCursor: string | null }>(
      `/users/${userId}/predictions`,
      { params: { groupId, cursor, take } },
    )
    .then((r) => r.data),
```

- [ ] **Step 2: Verify build**

Run (desde `apps/web`): `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/endpoints.ts
git commit -m "feat(web): métodos cliente para el prode de un usuario en un grupo"
```

---

## Task 8: Vista del prode del miembro (web)

**Files:**
- Create: `apps/web/src/app/(main)/grupos/[id]/miembro/[userId]/page.tsx`

Carga torneo activo + los 4 datos, los muestra apilados. Usa `PointsBreakdown` en cada partido finalizado. Reusa `TeamFlag`, `UserAvatar`, `Card`. Maneja loading (Skeleton), error y vacío (`memberProde.none` / `noResults`).

- [ ] **Step 1: Crear la página**

```tsx
'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Crown, Target } from 'lucide-react';
import { Result } from '@prode/shared';
import {
  bracketPick,
  topScorerPick,
  r32Picks,
  stats,
  type BracketPickResponse,
  type TopScorerPickResponse,
  type R32PickResponse,
  type PredictionHistoryItem,
} from '@/lib/endpoints';
import { apiClient } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TeamFlag } from '@/components/torneo/TeamFlag';
import { PointsBreakdown } from '@/components/prode/PointsBreakdown';
import { useRoundName } from '@/lib/round-name';

interface TournamentSummary {
  id: string;
  name: string;
}
interface UserDto {
  id: string;
  username: string | null;
}

export default function MemberProdePage({
  params,
}: {
  params: Promise<{ id: string; userId: string }>;
}) {
  const { id: groupId, userId } = use(params);
  const t = useTranslations('grupos.memberProde');
  const roundName = useRoundName();

  const [user, setUser] = useState<UserDto | null>(null);
  const [champ, setChamp] = useState<BracketPickResponse | null>(null);
  const [scorer, setScorer] = useState<TopScorerPickResponse | null>(null);
  const [r32, setR32] = useState<R32PickResponse[]>([]);
  const [history, setHistory] = useState<PredictionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const u = await apiClient.get<UserDto>(`/users/${userId}`).then((r) => r.data);
        setUser(u);
        const tournament = await apiClient
          .get<TournamentSummary>('/tournaments/active')
          .then((r) => r.data)
          .catch(() => null);
        if (tournament) {
          const [c, s, q] = await Promise.all([
            bracketPick.ofUser(tournament.id, userId, groupId).catch(() => null),
            topScorerPick.ofUser(tournament.id, userId, groupId).catch(() => null),
            r32Picks.ofUser(tournament.id, userId, groupId).catch(() => []),
          ]);
          setChamp(c);
          setScorer(s);
          setR32(q);
        }
        const h = await stats.userHistory(userId, groupId).catch(() => ({ items: [], nextCursor: null }));
        setHistory(h.items);
      } catch (e) {
        const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
        setError(msg ?? t('loadError'));
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, groupId]);

  if (loading) {
    return (
      <main className="pt-24 pb-24 px-4 max-w-3xl mx-auto">
        <Skeleton className="h-64 w-full" />
      </main>
    );
  }
  if (error) {
    return (
      <main className="pt-24 pb-24 px-4 max-w-3xl mx-auto">
        <p className="text-sm text-destructive font-bold">{error}</p>
        <Link href={`/grupos/${groupId}`} className="text-xs text-neon mt-4 inline-block">
          {t('back')}
        </Link>
      </main>
    );
  }

  const finished = history.filter((p) => p.match.status === 'FINISHED');

  return (
    <main className="pt-24 pb-24 px-4 max-w-3xl mx-auto">
      <header className="mb-8">
        <p className="font-display text-xs uppercase tracking-[0.3em] text-neon mb-2">
          {t('eyebrow')}
        </p>
        <h1 className="font-display font-extrabold text-foreground tracking-[-0.03em] text-[clamp(2rem,6vw,3.5rem)]">
          {user?.username ?? userId}
        </h1>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        <Card className="bg-surface-1 border-line">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="size-4 text-neon" />
              <p className="text-[10px] font-display font-bold uppercase tracking-[0.2em] text-ink-muted">
                {t('champion')}
              </p>
            </div>
            <p className="font-display font-extrabold text-lg text-foreground">
              {champ?.champTeam.name ?? t('none')}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-surface-1 border-line">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Target className="size-4 text-neon" />
              <p className="text-[10px] font-display font-bold uppercase tracking-[0.2em] text-ink-muted">
                {t('topScorer')}
              </p>
            </div>
            <p className="font-display font-extrabold text-lg text-foreground">
              {scorer?.player.name ?? t('none')}
            </p>
          </CardContent>
        </Card>
      </div>

      {r32.length > 0 && (
        <section className="mb-8">
          <h2 className="font-display font-extrabold text-lg text-foreground mb-3">
            {t('qualifiers')}
          </h2>
          <div className="flex flex-wrap gap-2">
            {r32.map((p) => (
              <div key={p.id} className="flex items-center gap-2 bg-surface-1 rounded-lg px-3 py-2">
                <TeamFlag size="sm" src={p.team.flagUrl} alt={p.team.name} />
                <span className="text-xs font-display font-bold text-foreground">
                  {p.team.shortName ?? p.team.name}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-display font-extrabold text-lg text-foreground mb-3">
          {t('results')}
        </h2>
        {finished.length === 0 ? (
          <p className="text-sm text-ink-muted">{t('noResults')}</p>
        ) : (
          <div className="space-y-3">
            {finished.map((p) => (
              <Card key={p.id} className="bg-surface-1 border-line">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <TeamFlag size="sm" src={p.match.homeTeam?.flagUrl ?? null} alt={p.match.homeTeamName} />
                      <span className="font-display font-semibold text-sm text-foreground truncate">
                        {p.match.homeTeamName} {p.match.homeScore}–{p.match.awayScore} {p.match.awayTeamName}
                      </span>
                      <TeamFlag size="sm" src={p.match.awayTeam?.flagUrl ?? null} alt={p.match.awayTeamName} />
                    </div>
                    <p className="text-[10px] uppercase tracking-[0.18em] font-display font-bold text-ink-dim">
                      {roundName(p.fixture.round)} · {p.result}
                      {p.homeScoreGuess !== null && p.awayScoreGuess !== null && ` (${p.homeScoreGuess}-${p.awayScoreGuess})`}
                    </p>
                  </div>
                  <PointsBreakdown
                    pred={{
                      result: p.result as Result,
                      homeScoreGuess: p.homeScoreGuess,
                      awayScoreGuess: p.awayScoreGuess,
                      isCaptain: p.isCaptain,
                    }}
                    match={{
                      homeScore: p.match.homeScore,
                      awayScore: p.match.awayScore,
                      status: p.match.status,
                    }}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Link href={`/grupos/${groupId}`} className="text-xs font-display font-bold uppercase tracking-[0.18em] text-ink-muted hover:text-neon mt-8 inline-block">
        {t('back')}
      </Link>
    </main>
  );
}
```

- [ ] **Step 2: Verify build**

Run (desde `apps/web`): `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/src/app/(main)/grupos/[id]/miembro/[userId]/page.tsx"
git commit -m "feat(web): vista de solo-lectura del prode de un miembro del grupo"
```

---

## Task 9: Link "Ver prode" en MembersList (web)

**Files:**
- Modify: `apps/web/src/app/(main)/grupos/[id]/page.tsx` (componente `MembersList`, ~337-394)

Agregar un link a la vista del miembro. `MembersList` necesita el `groupId`; el componente `GroupDetailPage` ya tiene `id` disponible — pasarlo como prop.

- [ ] **Step 1: Pasar groupId a MembersList**

En la llamada (línea ~256): `<MembersList members={group.members} myUserId={myUserId} groupId={id} />`.
En la firma del componente, agregar `groupId: string` a las props.
Importar `Link` from `next/link` (verificar que ya esté importado en el archivo — lo está).

- [ ] **Step 2: Agregar el link en cada `<li>`**

Antes del badge ADMIN (o después), para miembros que no soy yo, agregar:

```tsx
{!isMe && (
  <Link
    href={`/grupos/${groupId}/miembro/${m.userId}`}
    className="text-[10px] font-display font-bold uppercase tracking-widest text-neon hover:underline shrink-0"
  >
    {t('viewProde')}
  </Link>
)}
```

(`t` aquí es `useTranslations('grupos.members')`, donde se agregó `viewProde` en Task 6.)

- [ ] **Step 3: Verify build + tests**

Run (desde `apps/web`): `npx tsc --noEmit && npx vitest run`
Expected: typecheck limpio, todos los tests verdes.

- [ ] **Step 4: Commit**

```bash
git add "apps/web/src/app/(main)/grupos/[id]/page.tsx"
git commit -m "feat(web): acceso 'ver prode' por miembro en la lista del grupo"
```

---

## Task 10: Usar PointsBreakdown en mis-pronosticos (web)

**Files:**
- Modify: `apps/web/src/app/(main)/mis-pronosticos/page.tsx`

Reemplazar el bloque de puntos inline del `HistoryRow` (líneas ~99-120) por `<PointsBreakdown />` para unificar la presentación entre mi vista y la del amigo.

- [ ] **Step 1: Importar y reemplazar**

Agregar import: `import { PointsBreakdown } from '@/components/prode/PointsBreakdown';`
Reemplazar el bloque `{finished && (<div className="flex items-center gap-2 shrink-0">...</div>)}` por:

```tsx
{finished && (
  <PointsBreakdown
    pred={{
      result: p.result as Result,
      homeScoreGuess: p.homeScoreGuess,
      awayScoreGuess: p.awayScoreGuess,
      isCaptain: p.isCaptain,
    }}
    match={{
      homeScore: p.match.homeScore,
      awayScore: p.match.awayScore,
      status: p.match.status,
    }}
  />
)}
```

(Quedan sin uso `CheckCircle2`, `XCircle`, `cn`, `actualResult` si ya no se usan en otro lado del archivo — eliminarlos solo si el typecheck marca import sin uso; `actualResult` aún se usa en el filtro, conservarlo.)

- [ ] **Step 2: Verify build + tests**

Run (desde `apps/web`): `npx tsc --noEmit && npx vitest run`
Expected: typecheck limpio, tests verdes.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/src/app/(main)/mis-pronosticos/page.tsx"
git commit -m "refactor(web): unificar desglose de puntos con PointsBreakdown en mis-pronosticos"
```

---

## Self-Review

**Spec coverage:**
- Campeón/goleador/R32 siempre visibles → Task 4 (sin filtro de deadline). ✓
- Picks de partido ocultos hasta cierre por partido → Task 5 (filtro `startTime ≤ now+1h`). ✓
- Cierre por partido (1h antes) → Task 5 step 3 (fix matches.service.ts). ✓
- Desglose de puntos en mi vista y la del amigo → Task 1/2 + Task 8 + Task 10. ✓
- Acceso desde lista de miembros → Task 9. ✓
- Guard de co-membresía → Task 3, usado en Task 4 y 5. ✓
- Fuera de alcance (vista propia unificada, ranking, comentarios) → no hay tareas, correcto. ✓

**Type consistency:** `pointsBreakdown(pred, match)` con `PredictionParts`/`MatchResultParts` se usa idéntico en Task 2, 8, 10. `ofUser(tournamentId, userId, groupId)` y `userHistory(userId, groupId, ...)` consistentes entre Task 7 y 8. `assertSharesGroup(requesterId, targetUserId, groupId)` consistente entre Task 3, 4, 5.

**Placeholders:** ninguno — todo el código está completo.
