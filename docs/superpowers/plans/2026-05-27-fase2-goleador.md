# Fase 2 — Goleador (Top Scorer) full-stack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir end-to-end la predicción de Goleador (modelo + API + UI + admin) espejando el flujo del Campeón, con empty state cuando aún no hay jugadores cargados. Si el admin marca el goleador ganador, se otorgan 15 pts a los picks acertados.

**Architecture:** Nuevo modelo `TopScorerPick` (espejo de `BracketPick`) + campos `topScorerPlayerId` y `topScorerDeadline` en `Tournament`. Endpoints REST análogos a `bracket-pick` colgados de `tournaments/:id/top-scorer-pick`. Endpoint nuevo `GET /tournaments/:id/players` para listar jugadores con sus `SquadEntry`. Componente `TopScorerPickCard` modelado sobre `BracketPickCard`. Página admin minimal `/admin/torneos` para marcar el goleador ganador (gatilla scoring). La función de resolución es pura y unit-testeable.

**Tech Stack:** NestJS 11, Prisma 6, Next.js (App Router), `@prode/shared`, Jest (instalado en Fase 1).

**Depende de:** Fase 1 (constantes `POINTS_TOP_SCORER=15`, harness de Jest, contadores en `GroupScore`).

**Spec:** `docs/superpowers/specs/2026-05-27-paridad-prode-lemon-design.md` (Módulo 3).

---

## File Structure

- `apps/api/prisma/schema.prisma` — modelo `TopScorerPick`; campos en `Tournament`.
- `packages/shared/src/deadlines.ts` — agregar `topScorerPickDeadline`.
- `apps/api/src/modules/tournaments/dto/top-scorer-pick.dto.ts` — **(nuevo)**.
- `apps/api/src/modules/tournaments/dto/set-top-scorer.dto.ts` — **(nuevo)** DTO admin.
- `apps/api/src/modules/tournaments/top-scorer.ts` — **(nuevo)** función pura de resolución.
- `apps/api/src/modules/tournaments/top-scorer.spec.ts` — **(nuevo)**.
- `apps/api/src/modules/tournaments/tournaments.service.ts` — métodos para pick + admin set + scoring.
- `apps/api/src/modules/tournaments/tournaments.controller.ts` — 4 rutas nuevas.
- `apps/web/src/lib/endpoints.ts` — cliente `topScorerPick`, `tournamentApi.players`.
- `apps/web/src/lib/server-endpoints.ts` — server fetch de `players`.
- `apps/web/src/components/torneo/TopScorerPickCard.tsx` — **(nuevo)**.
- `apps/web/src/app/(main)/torneo/[id]/page.tsx` — montar la card.
- `apps/web/src/app/admin/torneos/page.tsx` — **(nuevo)** admin para marcar goleador.
- `apps/web/src/messages/{es,en,de}/torneo.json` — keys nuevas para goleador.
- `apps/web/src/messages/{es,en,de}/admin.json` — keys para form admin.

---

## Task 1: Schema — `TopScorerPick` + campos en `Tournament`

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Agregar campos a `Tournament`**

Buscar `model Tournament` y agregar **dentro del bloque** (junto al resto de los campos escalares, antes de las relaciones):
```prisma
  topScorerPlayerId String?
  topScorerDeadline DateTime?
```
Y agregar la relación nominada (junto a `bracketPicks BracketPick[]` u otras relaciones del modelo):
```prisma
  topScorerWinner Player? @relation("TournamentTopScorer", fields: [topScorerPlayerId], references: [id])
  topScorerPicks  TopScorerPick[]
```

- [ ] **Step 2: Agregar la relación inversa en `Player`**

Dentro de `model Player`, después de `squad SquadEntry[]`, agregar:
```prisma
  topScorerOf Tournament[] @relation("TournamentTopScorer")
  picks       TopScorerPick[]
```

- [ ] **Step 3: Agregar el modelo `TopScorerPick`**

Insertar después del modelo `BracketPick`:
```prisma
model TopScorerPick {
  id           String   @id @default(cuid())
  userId       String
  tournamentId String
  playerId     String
  pointsEarned Int?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user       User       @relation(fields: [userId], references: [id])
  tournament Tournament @relation(fields: [tournamentId], references: [id])
  player     Player     @relation(fields: [playerId], references: [id])

  @@unique([userId, tournamentId])
}
```

- [ ] **Step 4: Agregar la relación inversa en `User`**

Dentro de `model User`, junto a `bracketPicks BracketPick[]`, agregar:
```prisma
  topScorerPicks TopScorerPick[]
```

- [ ] **Step 5: Crear y aplicar la migración**

Run: `pnpm --filter @prode/api exec prisma migrate dev --name top_scorer_pick`
Expected: nueva migración aplicada, `TopScorerPick` creada, columnas nuevas en `Tournament`, Prisma Client regenerado.

- [ ] **Step 6: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations
git commit -m "feat(db): modelo TopScorerPick y campos topScorer en Tournament"
```

---

## Task 2: Helper `topScorerPickDeadline` en `@prode/shared`

**Files:**
- Modify: `packages/shared/src/deadlines.ts`

- [ ] **Step 1: Agregar el helper**

Agregar al final de `packages/shared/src/deadlines.ts`:
```ts
// Por defecto, el goleador se cierra antes del inicio del torneo (mismo criterio que el campeón).
// Si Tournament.topScorerDeadline está seteado, ese valor manda.
export function topScorerPickDeadline(tournamentStart: Date): Date {
  return endOfPreviousDayUtc(tournamentStart);
}
```

- [ ] **Step 2: Exportar desde `index.ts` si hace falta**

Verificar `packages/shared/src/index.ts` — si ya re-exporta `championPickDeadline` desde `./deadlines`, no hay que tocar nada. Si exporta cosas puntuales, sumar `topScorerPickDeadline` a la lista.

- [ ] **Step 3: Rebuild de shared**

Run: `pnpm --filter @prode/shared build`
Expected: dist actualizado.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/deadlines.ts packages/shared/src/index.ts
git commit -m "feat(shared): helper topScorerPickDeadline"
```

---

## Task 3: Función pura de resolución del goleador (TDD)

**Files:**
- Create: `apps/api/src/modules/tournaments/top-scorer.ts`
- Test: `apps/api/src/modules/tournaments/top-scorer.spec.ts`

- [ ] **Step 1: Escribir el test (falla)**

Create `apps/api/src/modules/tournaments/top-scorer.spec.ts`:
```ts
import { resolveTopScorerPoints } from './top-scorer';

describe('resolveTopScorerPoints', () => {
  it('otorga 15 pts cuando el pick coincide con el goleador', () => {
    expect(resolveTopScorerPoints('player-1', 'player-1')).toBe(15);
  });

  it('otorga 0 cuando el pick no coincide', () => {
    expect(resolveTopScorerPoints('player-1', 'player-2')).toBe(0);
  });

  it('otorga 0 cuando no hay goleador ganador definido', () => {
    expect(resolveTopScorerPoints('player-1', null)).toBe(0);
  });
});
```

- [ ] **Step 2: Correr el test (debe fallar)**

Run: `pnpm --filter @prode/api test top-scorer`
Expected: FAIL — "Cannot find module './top-scorer'".

- [ ] **Step 3: Implementar `top-scorer.ts`**

Create `apps/api/src/modules/tournaments/top-scorer.ts`:
```ts
import { POINTS_TOP_SCORER } from '@prode/shared';

export function resolveTopScorerPoints(
  pickedPlayerId: string,
  winningPlayerId: string | null,
): number {
  if (!winningPlayerId) return 0;
  return pickedPlayerId === winningPlayerId ? POINTS_TOP_SCORER : 0;
}
```

- [ ] **Step 4: Correr el test (debe pasar)**

Run: `pnpm --filter @prode/api test top-scorer`
Expected: PASS — 3 tests passed.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/tournaments/top-scorer.ts apps/api/src/modules/tournaments/top-scorer.spec.ts
git commit -m "feat(tournaments): funcion pura de resolucion de goleador"
```

---

## Task 4: DTOs

**Files:**
- Create: `apps/api/src/modules/tournaments/dto/top-scorer-pick.dto.ts`
- Create: `apps/api/src/modules/tournaments/dto/set-top-scorer.dto.ts`

- [ ] **Step 1: DTO del usuario**

Create `apps/api/src/modules/tournaments/dto/top-scorer-pick.dto.ts`:
```ts
import { IsString } from 'class-validator';

export class TopScorerPickDto {
  @IsString()
  playerId!: string;
}
```

- [ ] **Step 2: DTO admin**

Create `apps/api/src/modules/tournaments/dto/set-top-scorer.dto.ts`:
```ts
import { IsOptional, IsString } from 'class-validator';

export class SetTopScorerDto {
  @IsString()
  @IsOptional()
  playerId?: string | null; // null = desmarcar
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/tournaments/dto
git commit -m "feat(tournaments): DTOs de top-scorer pick y admin"
```

---

## Task 5: Service — pick + admin set + scoring

**Files:**
- Modify: `apps/api/src/modules/tournaments/tournaments.service.ts`

- [ ] **Step 1: Importes**

Agregar al header del archivo:
```ts
import { topScorerPickDeadline, POINTS_TOP_SCORER } from '@prode/shared';
import { resolveTopScorerPoints } from './top-scorer';
```

- [ ] **Step 2: Listar jugadores del torneo (agrupados por equipo/posición)**

Agregar como método público del service:
```ts
  async getTournamentPlayers(tournamentId: string) {
    const entries = await this.prisma.squadEntry.findMany({
      where: { tournamentId },
      include: {
        player: true,
        team: { select: { id: true, name: true, shortName: true, flagUrl: true } },
      },
    });
    return entries.map((e) => ({
      playerId: e.playerId,
      name: e.player.name,
      position: e.player.position,
      number: e.player.number,
      photoUrl: e.player.photoUrl,
      team: e.team,
    }));
  }
```

- [ ] **Step 3: GET del pick del usuario**

Agregar:
```ts
  async getMyTopScorerPick(tournamentId: string, userId: string) {
    return this.prisma.topScorerPick.findUnique({
      where: { userId_tournamentId: { userId, tournamentId } },
      include: {
        player: {
          select: { id: true, name: true, position: true, photoUrl: true },
        },
      },
    });
  }
```

- [ ] **Step 4: SET del pick del usuario (con deadline)**

Agregar:
```ts
  async setTopScorerPick(tournamentId: string, userId: string, playerId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { id: true, startDate: true, topScorerDeadline: true },
    });
    if (!tournament) throw new BadRequestException('Tournament not found');

    const deadline = tournament.topScorerDeadline ?? topScorerPickDeadline(tournament.startDate);
    if (new Date() > deadline) throw new BadRequestException('Top scorer pick deadline passed');

    const squadEntry = await this.prisma.squadEntry.findFirst({
      where: { tournamentId, playerId },
      select: { id: true },
    });
    if (!squadEntry) {
      throw new BadRequestException('Player not in this tournament squad');
    }

    return this.prisma.topScorerPick.upsert({
      where: { userId_tournamentId: { userId, tournamentId } },
      update: { playerId },
      create: { userId, tournamentId, playerId },
      include: {
        player: { select: { id: true, name: true, position: true, photoUrl: true } },
      },
    });
  }
```
(Asegurar que `BadRequestException` esté importado de `@nestjs/common` — ya debería estar.)

- [ ] **Step 5: Admin marca el goleador ganador y dispara scoring**

Agregar:
```ts
  async setTournamentTopScorer(tournamentId: string, playerId: string | null) {
    await this.prisma.tournament.update({
      where: { id: tournamentId },
      data: { topScorerPlayerId: playerId },
    });
    if (playerId) {
      return this.scoreTopScorerPicks(tournamentId, playerId);
    }
    return { scored: 0, usersAffected: 0 };
  }

  async scoreTopScorerPicks(tournamentId: string, winningPlayerId: string) {
    const picks = await this.prisma.topScorerPick.findMany({
      where: { tournamentId, pointsEarned: null },
    });

    let scored = 0;
    const usersAffected = new Set<string>();

    for (const pick of picks) {
      const points = resolveTopScorerPoints(pick.playerId, winningPlayerId);
      await this.prisma.topScorerPick.update({
        where: { id: pick.id },
        data: { pointsEarned: points },
      });
      if (points > 0) {
        await this.applyExtraPointsToGroupScores(pick.userId, points, tournamentId);
        usersAffected.add(pick.userId);
      }
      scored++;
    }
    return { scored, usersAffected: usersAffected.size };
  }

  /** Suma puntos extra (campeón, goleador) al total del GroupScore sin tocar contadores de desempate por partido. */
  private async applyExtraPointsToGroupScores(
    userId: string,
    points: number,
    tournamentId: string,
  ) {
    if (points <= 0) return;
    const memberships = await this.prisma.groupMember.findMany({ where: { userId } });
    for (const m of memberships) {
      await this.prisma.groupScore.upsert({
        where: {
          groupId_userId_tournamentId: {
            groupId: m.groupId,
            userId,
            tournamentId,
          },
        },
        update: { total: { increment: points } },
        create: {
          userId,
          groupId: m.groupId,
          tournamentId,
          total: points,
          streak: 0,
        },
      });
    }
  }
```
**Nota de diseño:** `applyExtraPointsToGroupScores` no incrementa `correctWinners`/`exactScores`/`exactGoalsSum` porque el goleador no es una predicción por partido; solo afecta el `total`.

- [ ] **Step 6: Verificar typecheck**

Run: `pnpm --filter @prode/api exec tsc --noEmit`
Expected: sin errores.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/tournaments/tournaments.service.ts
git commit -m "feat(tournaments): pick de goleador (user + admin) y scoring"
```

---

## Task 6: Controller — rutas REST

**Files:**
- Modify: `apps/api/src/modules/tournaments/tournaments.controller.ts`

- [ ] **Step 1: Importes**

Agregar:
```ts
import { TopScorerPickDto } from './dto/top-scorer-pick.dto';
import { SetTopScorerDto } from './dto/set-top-scorer.dto';
```
(Reutilizar guards/decoradores existentes; mirar las rutas de `bracket-pick` para saber cuáles usa.)

- [ ] **Step 2: Listar jugadores**

Agregar el handler:
```ts
  @Get(':id/players')
  players(@Param('id') id: string) {
    return this.service.getTournamentPlayers(id);
  }
```

- [ ] **Step 3: GET pick del usuario (mismo guard que `bracket-pick/me`)**

Agregar (copiando los decoradores de `myBracketPick` — `@UseGuards(JwtAuthGuard)` y `@CurrentUser()` o equivalente):
```ts
  @UseGuards(JwtAuthGuard)
  @Get(':id/top-scorer-pick/me')
  myTopScorerPick(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.getMyTopScorerPick(id, user.id);
  }
```
**Si los nombres de los decoradores difieren en tu codebase**, replicalos tal cual estén usados en `myBracketPick` (mismo archivo).

- [ ] **Step 4: POST pick del usuario**

```ts
  @UseGuards(JwtAuthGuard)
  @Post(':id/top-scorer-pick')
  setTopScorerPick(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: TopScorerPickDto,
  ) {
    return this.service.setTopScorerPick(id, user.id, dto.playerId);
  }
```

- [ ] **Step 5: PATCH admin para marcar ganador**

```ts
  @UseGuards(JwtAuthGuard, AdminGuard) // ← usar el mismo AdminGuard que ya tenés en /admin/partidos
  @Patch(':id/top-scorer')
  setWinner(@Param('id') id: string, @Body() dto: SetTopScorerDto) {
    return this.service.setTournamentTopScorer(id, dto.playerId ?? null);
  }
```
**Si tu codebase usa otro nombre de guard de admin**, replicalo del controller de admin de matches.

- [ ] **Step 6: Verificar typecheck + arrancar la API**

Run: `pnpm --filter @prode/api exec tsc --noEmit`
Expected: sin errores.

Run: `pnpm --filter @prode/api dev`
Expected: el server levanta y loguea las nuevas rutas:
- `GET /tournaments/:id/players`
- `GET /tournaments/:id/top-scorer-pick/me`
- `POST /tournaments/:id/top-scorer-pick`
- `PATCH /tournaments/:id/top-scorer`

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/tournaments/tournaments.controller.ts
git commit -m "feat(tournaments): rutas REST para top-scorer y players"
```

---

## Task 7: Cliente API en el frontend

**Files:**
- Modify: `apps/web/src/lib/endpoints.ts`
- Modify: `apps/web/src/lib/server-endpoints.ts`

- [ ] **Step 1: Tipos + cliente para player list y top-scorer pick**

Agregar a `apps/web/src/lib/endpoints.ts` (después del bloque `bracketPick`):
```ts
export interface TournamentPlayerDto {
  playerId: string;
  name: string;
  position: string | null;
  number: number | null;
  photoUrl: string | null;
  team: { id: string; name: string; shortName: string | null; flagUrl: string | null };
}

export interface TopScorerPickResponse {
  id: string;
  playerId: string;
  player: {
    id: string;
    name: string;
    position: string | null;
    photoUrl: string | null;
  };
}

export const topScorerPick = {
  mine: (tournamentId: string) =>
    apiClient
      .get<TopScorerPickResponse | null>(`/tournaments/${tournamentId}/top-scorer-pick/me`)
      .then((r) => r.data),
  set: (tournamentId: string, playerId: string) =>
    apiClient
      .post<TopScorerPickResponse>(`/tournaments/${tournamentId}/top-scorer-pick`, {
        playerId,
      })
      .then((r) => r.data),
};

// extender el objeto `tournamentApi` (o `tournamentClient` según el nombre real) con:
//   players: (tournamentId: string) =>
//     apiClient.get<TournamentPlayerDto[]>(`/tournaments/${tournamentId}/players`).then((r) => r.data),
```
**Si `tournamentApi` está definido en este archivo, agregar `players` al objeto.** Si está en otro archivo (`server-endpoints.ts`), agregar el equivalente server-side abajo.

- [ ] **Step 2: Server fetch para SSR**

Agregar a `apps/web/src/lib/server-endpoints.ts` (junto a los otros `tournamentApi.*`):
```ts
  players: (id: string) =>
    serverGet<TournamentPlayerDto[]>(`/tournaments/${id}/players`),
```
Y exportar el tipo `TournamentPlayerDto` (o re-importarlo de `endpoints.ts`).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/endpoints.ts apps/web/src/lib/server-endpoints.ts
git commit -m "feat(web): cliente API para top-scorer pick y players"
```

---

## Task 8: Componente `TopScorerPickCard`

**Files:**
- Create: `apps/web/src/components/torneo/TopScorerPickCard.tsx`

- [ ] **Step 1: Crear el componente espejando `BracketPickCard`**

Create `apps/web/src/components/torneo/TopScorerPickCard.tsx`:
```tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { topScorerPickDeadline } from '@prode/shared';
import {
  topScorerPick,
  type TopScorerPickResponse,
  type TournamentPlayerDto,
} from '@/lib/endpoints';
import { apiClient } from '@/lib/apiClient'; // si tournamentApi.players no está, usar apiClient directo

interface Props {
  tournamentId: string;
  tournamentStartDate: Date | string;
  topScorerDeadline?: Date | string | null;
}

export function TopScorerPickCard({ tournamentId, tournamentStartDate, topScorerDeadline: deadlineOverride }: Props) {
  const t = useTranslations('torneo.topScorer');
  const [players, setPlayers] = useState<TournamentPlayerDto[]>([]);
  const [current, setCurrent] = useState<TopScorerPickResponse | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      apiClient
        .get<TournamentPlayerDto[]>(`/tournaments/${tournamentId}/players`)
        .then((r) => r.data),
      topScorerPick.mine(tournamentId),
    ])
      .then(([list, mine]) => {
        if (!alive) return;
        setPlayers(list);
        setCurrent(mine);
      })
      .catch((e) => alive && setError(e?.message ?? 'error'))
      .finally(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, [tournamentId]);

  const deadline = useMemo(() => {
    if (deadlineOverride) return new Date(deadlineOverride);
    return topScorerPickDeadline(new Date(tournamentStartDate));
  }, [tournamentStartDate, deadlineOverride]);

  const locked = Date.now() > deadline.getTime();
  const grouped = useMemo(() => groupByTeam(players), [players]);

  async function pick(playerId: string) {
    if (locked || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await topScorerPick.set(tournamentId, playerId);
      setCurrent(res);
    } catch (e: any) {
      setError(e?.message ?? t('saveError'));
    } finally {
      setSubmitting(false);
    }
  }

  if (!loaded) return <div className="rounded-xl border p-4">…</div>;

  if (players.length === 0) {
    return (
      <section className="rounded-xl border p-4 text-center">
        <p className="text-sm text-muted-foreground">{t('eyebrow')}</p>
        <h3 className="mt-1 text-lg font-semibold">{t('titleInitial')}</h3>
        <p className="mt-3 text-sm">{t('emptyPlayers')}</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border p-4">
      <header className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('eyebrow')}</p>
          <h3 className="text-lg font-semibold">
            {current ? t('titleChange') : t('titleInitial')}
          </h3>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        {locked && (
          <span className="rounded-full bg-muted px-2 py-1 text-xs">{t('locked')}</span>
        )}
      </header>

      {current && (
        <div className="mt-3 rounded-lg border border-primary/40 bg-primary/5 p-3">
          <p className="text-xs text-muted-foreground">{t('currentPick')}</p>
          <p className="font-medium">{current.player.name}</p>
          {current.player.position && (
            <p className="text-xs text-muted-foreground">{current.player.position}</p>
          )}
        </div>
      )}

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      <div className="mt-4 space-y-4">
        {grouped.map(({ teamId, teamName, players: list }) => (
          <div key={teamId}>
            <h4 className="mb-1 text-sm font-medium">{teamName}</h4>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {list.map((p) => {
                const selected = current?.playerId === p.playerId;
                return (
                  <li key={p.playerId}>
                    <button
                      type="button"
                      disabled={locked || submitting}
                      onClick={() => pick(p.playerId)}
                      className={`w-full rounded-md border px-2 py-2 text-left text-xs transition ${
                        selected ? 'border-primary bg-primary/10' : 'hover:bg-muted'
                      }`}
                    >
                      <div className="font-medium">{p.name}</div>
                      <div className="text-muted-foreground">
                        {p.position ?? '—'}
                        {p.number !== null ? ` · #${p.number}` : ''}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function groupByTeam(players: TournamentPlayerDto[]) {
  const map = new Map<string, { teamId: string; teamName: string; players: TournamentPlayerDto[] }>();
  for (const p of players) {
    const k = p.team.id;
    if (!map.has(k)) map.set(k, { teamId: k, teamName: p.team.name, players: [] });
    map.get(k)!.players.push(p);
  }
  return Array.from(map.values()).sort((a, b) => a.teamName.localeCompare(b.teamName));
}
```

- [ ] **Step 2: Confirmar el import de `apiClient`**

Si en el codebase el helper se importa de un path distinto (`@/lib/api-client` o similar), ajustar el import. Como referencia usá el archivo `apps/web/src/components/torneo/BracketPickCard.tsx` que ya hace este mismo tipo de llamada.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/torneo/TopScorerPickCard.tsx
git commit -m "feat(web): TopScorerPickCard con empty state"
```

---

## Task 9: Montar la card en la página del torneo

**Files:**
- Modify: `apps/web/src/app/(main)/torneo/[id]/page.tsx`

- [ ] **Step 1: Importar el componente**

Agregar al header:
```ts
import { TopScorerPickCard } from '@/components/torneo/TopScorerPickCard';
```

- [ ] **Step 2: Renderizar junto a `BracketPickCard`**

Buscar el render de `<BracketPickCard ... />` y agregar inmediatamente debajo:
```tsx
<TopScorerPickCard
  tournamentId={id}
  tournamentStartDate={tournament.startDate}
  topScorerDeadline={tournament.topScorerDeadline ?? undefined}
/>
```
**Si el objeto `tournament` no incluye `topScorerDeadline`** en el server-fetch, agregar el campo al `select`/`include` correspondiente en `apps/api/src/modules/tournaments/tournaments.service.ts` (método que sirve el detalle del torneo) y al tipo del frontend. Si el detalle no se filtra por `select`, el campo nuevo aparece automáticamente con la regeneración del Prisma Client.

- [ ] **Step 3: Levantar el server web y verificar**

Run: `pnpm --filter @prode/web dev`
Expected: la página de torneo muestra la card de Campeón y, debajo, la de Goleador. Sin jugadores cargados → empty state "Lista de jugadores próximamente".

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/\(main\)/torneo/[id]/page.tsx
git commit -m "feat(web): mostrar TopScorerPickCard en la pagina de torneo"
```

---

## Task 10: Admin — página para marcar el goleador ganador

**Files:**
- Create: `apps/web/src/app/admin/torneos/page.tsx`

- [ ] **Step 1: Crear la página**

Create `apps/web/src/app/admin/torneos/page.tsx`:
```tsx
'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiClient } from '@/lib/apiClient';
import type { TournamentPlayerDto } from '@/lib/endpoints';

interface TournamentRow {
  id: string;
  name: string;
  startDate: string;
  topScorerPlayerId: string | null;
}

export default function AdminTorneosPage() {
  const t = useTranslations('admin.torneos');
  const [tournaments, setTournaments] = useState<TournamentRow[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [players, setPlayers] = useState<TournamentPlayerDto[]>([]);
  const [playerId, setPlayerId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<TournamentRow[]>('/tournaments?admin=1')
      .then((r) => setTournaments(r.data))
      .catch((e) => setError(e?.message ?? 'error'));
  }, []);

  useEffect(() => {
    if (!selected) return;
    apiClient
      .get<TournamentPlayerDto[]>(`/tournaments/${selected}/players`)
      .then((r) => setPlayers(r.data))
      .catch((e) => setError(e?.message ?? 'error'));
    const row = tournaments.find((x) => x.id === selected);
    setPlayerId(row?.topScorerPlayerId ?? '');
  }, [selected, tournaments]);

  async function save(unset = false) {
    setSaving(true);
    setError(null);
    setInfo(null);
    try {
      const res = await apiClient.patch<{ scored: number; usersAffected: number }>(
        `/tournaments/${selected}/top-scorer`,
        { playerId: unset ? null : playerId || null },
      );
      setInfo(t('saved', { scored: res.data.scored, users: res.data.usersAffected }));
    } catch (e: any) {
      setError(e?.message ?? 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-xl font-semibold">{t('title')}</h1>

      <label className="mt-4 block text-sm">{t('tournamentLabel')}</label>
      <select
        className="mt-1 w-full rounded-md border px-3 py-2"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
      >
        <option value="">—</option>
        {tournaments.map((x) => (
          <option key={x.id} value={x.id}>
            {x.name}
          </option>
        ))}
      </select>

      {selected && (
        <>
          <label className="mt-4 block text-sm">{t('playerLabel')}</label>
          <select
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)}
          >
            <option value="">—</option>
            {players.map((p) => (
              <option key={p.playerId} value={p.playerId}>
                {p.team.name} — {p.name}
              </option>
            ))}
          </select>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={!playerId || saving}
              onClick={() => save(false)}
              className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
            >
              {t('saveCta')}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => save(true)}
              className="rounded-md border px-3 py-2 text-sm"
            >
              {t('clearCta')}
            </button>
          </div>
        </>
      )}

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      {info && <p className="mt-3 text-sm">{info}</p>}
    </div>
  );
}
```
**Si en tu API el listado de torneos para admin tiene otra ruta**, ajustar el `apiClient.get('/tournaments?admin=1')` a la real (mirar cómo lo hace `/admin/partidos`).

- [ ] **Step 2: Verificar manualmente**

Levantar web (`pnpm --filter @prode/web dev`) y API, entrar a `/admin/torneos`, seleccionar torneo + jugador, guardar. La respuesta debe traer `scored` y `usersAffected`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/admin/torneos/page.tsx
git commit -m "feat(admin): pagina para marcar goleador ganador del torneo"
```

---

## Task 11: i18n — keys nuevas

**Files:**
- Modify: `apps/web/src/messages/{es,en,de}/torneo.json`
- Modify: `apps/web/src/messages/{es,en,de}/admin.json`

- [ ] **Step 1: ES — `torneo.json` agregar `topScorer`**

Insertar en `apps/web/src/messages/es/torneo.json` (al lado de `champion`):
```json
"topScorer": {
  "eyebrow": "Predicción de goleador",
  "titleInitial": "¿Quién será el goleador?",
  "titleChange": "¿Cambiás de candidato?",
  "subtitle": "Elegí un jugador antes del inicio del torneo. Bonus al final si acertás.",
  "currentPick": "Tu pick actual",
  "locked": "Predicciones cerradas",
  "saveError": "No se pudo guardar tu predicción",
  "emptyPlayers": "Lista de jugadores próximamente"
}
```

- [ ] **Step 2: EN — equivalente en `apps/web/src/messages/en/torneo.json`**

```json
"topScorer": {
  "eyebrow": "Top scorer prediction",
  "titleInitial": "Who will be top scorer?",
  "titleChange": "Changing your pick?",
  "subtitle": "Pick a player before the tournament starts. Bonus if you nail it.",
  "currentPick": "Your current pick",
  "locked": "Picks closed",
  "saveError": "Could not save your pick",
  "emptyPlayers": "Player list coming soon"
}
```

- [ ] **Step 3: DE — equivalente en `apps/web/src/messages/de/torneo.json`**

```json
"topScorer": {
  "eyebrow": "Torschützenkönig-Tipp",
  "titleInitial": "Wer wird Torschützenkönig?",
  "titleChange": "Tipp ändern?",
  "subtitle": "Wähle einen Spieler vor Turnierbeginn. Bonus, wenn du richtig liegst.",
  "currentPick": "Dein aktueller Tipp",
  "locked": "Tipps geschlossen",
  "saveError": "Tipp konnte nicht gespeichert werden",
  "emptyPlayers": "Spielerliste folgt in Kürze"
}
```

- [ ] **Step 4: `admin.json` — agregar `torneos`**

ES:
```json
"torneos": {
  "title": "Torneos",
  "tournamentLabel": "Torneo",
  "playerLabel": "Goleador ganador",
  "saveCta": "Guardar y puntuar",
  "clearCta": "Quitar marca",
  "saved": "Se calcularon {scored} picks. Usuarios afectados: {users}."
}
```
(Hacer las traducciones equivalentes en `en/admin.json` y `de/admin.json`.)

- [ ] **Step 5: Verificar parity test de i18n**

Si existe `apps/web/src/i18n/messages-parity.test.ts`, correrlo para asegurarse de que las claves coinciden entre locales.
Run (si el archivo está activo): `pnpm --filter @prode/web test messages-parity`

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/messages
git commit -m "i18n: claves de top-scorer y admin/torneos (es/en/de)"
```

---

## Notas para el ejecutor

- Si más adelante querés calcular el goleador automáticamente por goles acumulados, podés agregar `goalsScored` por `Match`/`Player` y reemplazar `setTournamentTopScorer` por un job que infiera el ganador. Hoy queda explícitamente fuera de alcance.
- El render de "Tu Goleador" arriba de la lista de Predicciones se trata en el **Plan 3** (frontend).
- La fórmula de scoring del Campeón se mantiene como está hoy; este plan **no** la toca. Si querés alinearla a 15 pts y agruparla en una resolución similar a la del goleador, se puede hacer en una iteración aparte.
