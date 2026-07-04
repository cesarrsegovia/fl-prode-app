# Avance automático de llaves eliminatorias — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que los cruces de 8vos/4tos/semis/final se rellenen solos con los resultados de la ronda previa, arreglando el matching roto por `db:map-espn-ids` y cubriendo la carga manual de resultados.

**Architecture:** Nueva columna estable `Match.code` (id de siembra `wc-r32-03`) separa el rol estructural del bracket del `externalId` (id del provider). La propagación existente (`knockout-advance.ts` + `propagateKnockoutResult`) pasa a matchear por `code`. Un endpoint admin idempotente re-asigna `code` en BDs donde ya fue pisado (prod), y `FixturesService.updateMatch` dispara la misma cadena post-FINISHED que el poller.

**Tech Stack:** NestJS, Prisma (Postgres), Jest. Monorepo pnpm; la API vive en `apps/api`.

**Spec:** `docs/superpowers/specs/2026-07-02-knockout-progression-design.md`

**Convenciones del repo:** comentarios y mensajes en español; commits estilo `feat:`/`fix:` cortos; NO pushear (el usuario pushea). Los tests se corren desde `apps/api` con `pnpm test -- <pattern>`.

---

### Task 1: Columna `Match.code` (schema + migración con backfill)

**Files:**
- Modify: `apps/api/prisma/schema.prisma` (model `Match`, líneas 233-270)
- Create: `apps/api/prisma/migrations/20260702120000_match_code/migration.sql`

- [ ] **Step 1: Agregar `code` al modelo `Match` en el schema**

En `schema.prisma`, dentro de `model Match`, debajo de `externalId String? @unique` agregar el campo, y al final del modelo el unique compuesto:

```prisma
model Match {
  id           String     @id @default(cuid())
  externalId   String?    @unique
  // Id estable de siembra (wc-r32-03, wc-qf-01, ...). Identifica el partido
  // dentro del bracket; los placeholders "Ganador R32-3" se resuelven contra
  // él. Ningún script lo pisa (db:map-espn-ids solo toca externalId).
  code         String?
  tournamentId String
  ...resto sin cambios...

  @@unique([tournamentId, code])
}
```

(El `...resto sin cambios...` es literal del archivo actual; solo se insertan la columna con su comentario y la línea `@@unique`.)

- [ ] **Step 2: Crear la migración a mano (convención del repo: carpeta timestampeada)**

`apps/api/prisma/migrations/20260702120000_match_code/migration.sql`:

```sql
-- Match.code: id estable de siembra (wc-r32-03). Separa el rol estructural del
-- bracket del externalId (que db:map-espn-ids pisa con el event id de ESPN).
ALTER TABLE "Match" ADD COLUMN "code" TEXT;

-- Backfill para BDs donde externalId todavía es el de siembra (dev).
-- En prod (externalId ya remapeado a ESPN) esto no matchea nada; ahí se usa
-- el endpoint admin de relink (Task 6/7).
UPDATE "Match" SET "code" = "externalId" WHERE "externalId" LIKE 'wc-%';

CREATE UNIQUE INDEX "Match_tournamentId_code_key" ON "Match"("tournamentId", "code");
```

- [ ] **Step 3: Aplicar migración a la BD dev y regenerar el cliente**

Run (desde `apps/api`): `npx prisma migrate deploy && npx prisma generate`
Expected: `1 migration applied` (20260702120000_match_code) y client regenerado sin errores.

**NO** correr `migrate deploy` contra prod: por convención del proyecto, prod se reconcilia a mano (ver Task 9, runbook).

- [ ] **Step 4: Verificar el backfill en dev**

Run (desde `apps/api`): `npx prisma db execute --stdin <<< "SELECT count(*) FROM \"Match\" WHERE code IS NOT NULL;"` — o vía un query rápido con tsx.
Expected: 104 (72 grupos + 32 KO; en dev todos los externalId siguen siendo `wc-*`).

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/20260702120000_match_code/
git commit -m "feat: columna estable Match.code para el bracket"
```

---

### Task 2: `knockout-advance.ts` — renombrar `sourceExternalId` → `sourceCode`

El parseo no cambia de lógica; solo se renombra el campo para que refleje que ahora se compara contra `Match.code`, no contra `externalId`.

**Files:**
- Modify: `apps/api/src/modules/tournaments/knockout-advance.ts`
- Modify: `apps/api/src/modules/tournaments/knockout-advance.spec.ts`

- [ ] **Step 1: Actualizar el spec primero (TDD del renombre)**

En `knockout-advance.spec.ts`, reemplazar toda ocurrencia de `sourceExternalId` por `sourceCode`.

- [ ] **Step 2: Correr el spec y verificar que falla**

Run (desde `apps/api`): `pnpm test -- knockout-advance`
Expected: FAIL — TypeScript/asserts por la propiedad renombrada.

- [ ] **Step 3: Renombrar en el código**

En `knockout-advance.ts`:
- En el docstring del archivo (líneas 10-11), cambiar «Cada placeholder se resuelve al `externalId` del partido de origen» por «Cada placeholder se resuelve al `code` del partido de origen».
- En `AdvanceRef`: `sourceExternalId` → `sourceCode` y su comentario a `/** code del partido de origen, p. ej. "wc-r32-03". */`.
- En `parseAdvancePlaceholder` (línea 44): `sourceExternalId:` → `sourceCode:`.

- [ ] **Step 4: Correr el spec y verificar que pasa**

Run: `pnpm test -- knockout-advance`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/tournaments/knockout-advance.ts apps/api/src/modules/tournaments/knockout-advance.spec.ts
git commit -m "refactor: AdvanceRef.sourceCode (matching por Match.code)"
```

---

### Task 3: Propagación por `code` en `TournamentsService`

**Files:**
- Modify: `apps/api/src/modules/tournaments/tournaments.service.ts:526-663` (`propagateKnockoutResult`, `propagateAllKnockoutResults`)

- [ ] **Step 1: Cambiar `propagateKnockoutResult` para matchear por `code`**

En la firma (línea ~528), reemplazar el campo `externalId` del parámetro `finished` por `code`:

```ts
async propagateKnockoutResult(
    tournamentId: string,
    finished: {
      code: string | null;
      homeTeamId: string | null;
      awayTeamId: string | null;
      homeScore: number | null;
      awayScore: number | null;
      homePens: number | null;
      awayPens: number | null;
    },
  ): Promise<{ updated: number }> {
    if (!finished.code) return { updated: 0 };
```

Y en `resolveSide` (línea ~591):

```ts
      if (!ref || ref.sourceCode !== finished.code) return null;
```

Actualizar también el docstring del método: los placeholders se resuelven contra `code`, no `externalId`.

- [ ] **Step 2: Cambiar `propagateAllKnockoutResults` para cargar `code`**

En el `select` del `findMany` (línea ~646), reemplazar `externalId: true` por `code: true`. El loop no cambia (pasa `m` entero).

- [ ] **Step 3: Compilar para detectar callers rotos**

Run (desde `apps/api`): `npx tsc --noEmit`
Expected: error en `resultados.service.ts` (`handleKnockoutFinished` pasa `externalId`) — se arregla en Task 4. Si aparece cualquier otro caller, anotarlo y arreglarlo con el mismo criterio (pasar `code`).

- [ ] **Step 4: Commit (junto con Task 4 si se prefiere no commitear en rojo — ver Task 4 Step 5)**

No commitear todavía: el build queda en rojo hasta Task 4.

---

### Task 4: El poller pasa `code` a la propagación

**Files:**
- Modify: `apps/api/src/modules/resultados/providers/results-provider.ts:32-42` (`ActiveMatchWithTeams`)
- Modify: `apps/api/src/modules/resultados/resultados.service.ts:52-118` (`fetchAndUpdateResults`) y `126-142` (`handleKnockoutFinished`)

- [ ] **Step 1: Agregar `code` a `ActiveMatchWithTeams`**

En `results-provider.ts`, dentro de `ActiveMatchWithTeams` (después de `awayTeamId`, junto al comentario «Solo para propagación de eliminación»):

```ts
  /** Solo para propagación de eliminación. */
  homeTeamId: string | null;
  awayTeamId: string | null;
  /** Id estable de siembra (Match.code); la propagación matchea por él. */
  code: string | null;
```

(Ajustar a la forma exacta del interface actual: se agrega solo la propiedad `code`.)

- [ ] **Step 2: Cargar y mapear `code` en `fetchAndUpdateResults`**

En el `select` del `findMany` (líneas 58-72) agregar `code: true`. En el mapeo a `locals` (líneas 76-90) agregar `code: m.code,`.

- [ ] **Step 3: Pasar `code` en `handleKnockoutFinished`**

En la llamada a `propagateKnockoutResult` (línea ~134), reemplazar `externalId: local.externalId,` por `code: local.code,`.

- [ ] **Step 4: Compilar y correr la suite**

Run (desde `apps/api`): `npx tsc --noEmit && pnpm test`
Expected: build limpio, tests PASS (si algún spec construye `ActiveMatchWithTeams` literal, agregarle `code: null`).

- [ ] **Step 5: Commit (Tasks 3+4 juntas: un cambio atómico)**

```bash
git add apps/api/src/modules/tournaments/tournaments.service.ts apps/api/src/modules/resultados/
git commit -m "fix: propagación de llaves matchea por Match.code (no externalId)"
```

---

### Task 5: El seeder setea `code`

**Files:**
- Modify: `apps/api/src/modules/importer/worldcup-seeder.service.ts:324-341` (`upsertMatches`)
- Modify: `apps/api/prisma/map-espn-ids.ts:1-7` (solo docstring)

- [ ] **Step 1: Setear `code` en el upsert de matches del seeder**

En `worldcup-seeder.service.ts`, en el objeto `fields` de `upsertMatches` (línea ~324), agregar `code`:

```ts
        const fields: Prisma.MatchUncheckedUpdateInput = {
          tournamentId,
          fixtureId,
          stage: MatchStage[m.stage],
          groupId,
          venueId,
          homeTeamId,
          awayTeamId,
          homeTeamName: home,
          awayTeamName: away,
          startTime: new Date(m.startTime),
          code: m.externalId,
        };
```

(`fields` se usa en `update` y `create` del upsert, así que cubre ambos.)

- [ ] **Step 2: Documentar en `map-espn-ids.ts` que `code` es intocable**

Al final del docstring del archivo (línea 6), agregar:

```ts
 * Solo escribe Match.externalId; NUNCA toca Match.code (el id estable de
 * siembra que usa la propagación del bracket).
```

- [ ] **Step 3: Compilar**

Run: `npx tsc --noEmit`
Expected: limpio.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/importer/worldcup-seeder.service.ts apps/api/prisma/map-espn-ids.ts
git commit -m "feat: seeder setea Match.code; map-espn-ids documenta que no lo toca"
```

---

### Task 6: Matcher puro de relink (`bracket-relink.ts`) — TDD

Función pura que, dado el JSON de siembra y los partidos KO de la BD, decide qué `code` va a qué match. Estricta: aborta ante ambigüedad en vez de asignar mal.

**Files:**
- Create: `apps/api/src/modules/tournaments/bracket-relink.ts`
- Create: `apps/api/src/modules/tournaments/bracket-relink.spec.ts`

- [ ] **Step 1: Escribir el spec (falla: el módulo no existe)**

`bracket-relink.spec.ts`:

```ts
import { MatchStage } from '@prisma/client';
import { planBracketRelink } from './bracket-relink';

const H = 60 * 60 * 1000;

const seed = (code: string, stage: MatchStage, iso: string) => ({
  code,
  stage,
  startTime: new Date(iso),
});

const db = (
  id: string,
  stage: MatchStage,
  iso: string,
  code: string | null = null,
) => ({ id, stage, startTime: new Date(iso), code });

describe('planBracketRelink', () => {
  it('asigna por stage + horario exacto', () => {
    const plan = planBracketRelink(
      [seed('wc-r32-01', MatchStage.R32, '2026-06-28T19:00:00.000Z')],
      [db('m1', MatchStage.R32, '2026-06-28T19:00:00.000Z')],
    );
    expect(plan).toEqual([{ matchId: 'm1', code: 'wc-r32-01', alreadySet: false }]);
  });

  it('tolera horario corrido (fix-match-times) eligiendo el más cercano', () => {
    const plan = planBracketRelink(
      [
        seed('wc-r32-01', MatchStage.R32, '2026-06-28T19:00:00.000Z'),
        seed('wc-r32-02', MatchStage.R32, '2026-06-29T17:00:00.000Z'),
      ],
      [
        // horarios movidos 2h respecto de la siembra
        db('m2', MatchStage.R32, '2026-06-29T15:00:00.000Z'),
        db('m1', MatchStage.R32, '2026-06-28T21:00:00.000Z'),
      ],
    );
    expect(plan).toEqual([
      { matchId: 'm1', code: 'wc-r32-01', alreadySet: false },
      { matchId: 'm2', code: 'wc-r32-02', alreadySet: false },
    ]);
  });

  it('no cruza stages aunque el horario coincida', () => {
    expect(() =>
      planBracketRelink(
        [seed('wc-r16-01', MatchStage.R16, '2026-07-04T17:00:00.000Z')],
        [db('m1', MatchStage.R32, '2026-07-04T17:00:00.000Z')],
      ),
    ).toThrow(/sin candidato/);
  });

  it('aborta si dos seeds mapean al mismo partido', () => {
    expect(() =>
      planBracketRelink(
        [
          seed('wc-sf-01', MatchStage.SEMIFINAL, '2026-07-14T19:00:00.000Z'),
          seed('wc-sf-02', MatchStage.SEMIFINAL, '2026-07-15T19:00:00.000Z'),
        ],
        [db('m1', MatchStage.SEMIFINAL, '2026-07-15T00:00:00.000Z')],
      ),
    ).toThrow(/ambiguo/);
  });

  it('aborta si no hay candidato dentro de la tolerancia', () => {
    expect(() =>
      planBracketRelink(
        [seed('wc-fin-01', MatchStage.FINAL, '2026-07-19T19:00:00.000Z')],
        [db('m1', MatchStage.FINAL, '2026-07-25T19:00:00.000Z')],
      ),
    ).toThrow(/sin candidato/);
  });

  it('aborta si el match ya tiene un code distinto', () => {
    expect(() =>
      planBracketRelink(
        [seed('wc-fin-01', MatchStage.FINAL, '2026-07-19T19:00:00.000Z')],
        [db('m1', MatchStage.FINAL, '2026-07-19T19:00:00.000Z', 'wc-sf-01')],
      ),
    ).toThrow(/ya tiene code/);
  });

  it('es idempotente: code ya correcto → alreadySet true', () => {
    const plan = planBracketRelink(
      [seed('wc-fin-01', MatchStage.FINAL, '2026-07-19T19:00:00.000Z')],
      [db('m1', MatchStage.FINAL, '2026-07-19T19:00:00.000Z', 'wc-fin-01')],
    );
    expect(plan).toEqual([{ matchId: 'm1', code: 'wc-fin-01', alreadySet: true }]);
  });

  it('respeta la tolerancia configurable', () => {
    const plan = planBracketRelink(
      [seed('wc-fin-01', MatchStage.FINAL, '2026-07-19T19:00:00.000Z')],
      [db('m1', MatchStage.FINAL, '2026-07-19T21:00:00.000Z')],
      3 * H,
    );
    expect(plan[0].matchId).toBe('m1');
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run (desde `apps/api`): `pnpm test -- bracket-relink`
Expected: FAIL — `Cannot find module './bracket-relink'`.

- [ ] **Step 3: Implementar `bracket-relink.ts`**

```ts
import { MatchStage } from '@prisma/client';

/**
 * Reasignación de Match.code para BDs donde db:map-espn-ids pisó los
 * externalId de siembra (prod). Matchea cada partido KO del JSON de siembra
 * contra la BD por (stage, horario más cercano) con tolerancia acotada.
 * Funciones PURAS (sin DB) para testearlas aisladas.
 */

export interface SeedKnockoutMatch {
  /** Id de siembra del JSON (wc-r32-03). */
  code: string;
  stage: MatchStage;
  startTime: Date;
}

export interface DbKnockoutMatch {
  id: string;
  stage: MatchStage;
  startTime: Date;
  code: string | null;
}

export interface RelinkAssignment {
  matchId: string;
  code: string;
  /** true si el match ya tenía este code (no hay que escribir). */
  alreadySet: boolean;
}

/** ±36 h: cubre correcciones de horario de db:fix-match-times y husos. */
const DEFAULT_TOLERANCE_MS = 36 * 60 * 60 * 1000;

/**
 * Decide qué code va a qué match. Estricta: lanza Error (sin resultado
 * parcial) si algún seed no tiene candidato, si dos seeds eligen el mismo
 * match, o si un match ya tiene un code distinto al esperado.
 */
export function planBracketRelink(
  seedMatches: SeedKnockoutMatch[],
  dbMatches: DbKnockoutMatch[],
  toleranceMs = DEFAULT_TOLERANCE_MS,
): RelinkAssignment[] {
  const byStage = new Map<MatchStage, DbKnockoutMatch[]>();
  for (const m of dbMatches) {
    const arr = byStage.get(m.stage) ?? [];
    arr.push(m);
    byStage.set(m.stage, arr);
  }

  const takenBy = new Map<string, string>(); // matchId -> code que lo reclamó
  const out: RelinkAssignment[] = [];

  for (const s of seedMatches) {
    const best = (byStage.get(s.stage) ?? [])
      .map((m) => ({
        m,
        diff: Math.abs(m.startTime.getTime() - s.startTime.getTime()),
      }))
      .filter((c) => c.diff <= toleranceMs)
      .sort((a, b) => a.diff - b.diff)[0];

    if (!best) {
      throw new Error(
        `Relink: sin candidato en BD para ${s.code} (${s.stage} @ ${s.startTime.toISOString()})`,
      );
    }
    const prev = takenBy.get(best.m.id);
    if (prev) {
      throw new Error(
        `Relink ambiguo: ${prev} y ${s.code} eligen el mismo partido (${best.m.id})`,
      );
    }
    if (best.m.code && best.m.code !== s.code) {
      throw new Error(
        `Relink: el partido ${best.m.id} ya tiene code ${best.m.code}; esperado ${s.code}`,
      );
    }
    takenBy.set(best.m.id, s.code);
    out.push({
      matchId: best.m.id,
      code: s.code,
      alreadySet: best.m.code === s.code,
    });
  }
  return out;
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `pnpm test -- bracket-relink`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/tournaments/bracket-relink.ts apps/api/src/modules/tournaments/bracket-relink.spec.ts
git commit -m "feat: matcher puro de relink de codes del bracket"
```

---

### Task 7: Service + endpoint admin `POST :id/bracket/relink-codes`

**Files:**
- Modify: `apps/api/src/modules/tournaments/tournaments.service.ts` (nuevo método, cerca de `propagateAllKnockoutResults`, ~línea 663)
- Modify: `apps/api/src/modules/tournaments/tournaments.controller.ts` (sección «Eliminación: propagación y campeón (admin)», ~línea 225)

- [ ] **Step 1: Método `relinkBracketCodes` en `TournamentsService`**

Imports nuevos al tope del archivo (respetar los existentes):

```ts
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { planBracketRelink } from './bracket-relink';
```

Método (después de `propagateAllKnockoutResults`):

```ts
  /**
   * Reasigna Match.code en torneos donde db:map-espn-ids pisó los externalId
   * de siembra (prod). Lee el JSON de siembra y matchea por stage + horario
   * más cercano. Idempotente; aborta sin escribir ante ambigüedad.
   */
  async relinkBracketCodes(
    tournamentId: string,
  ): Promise<{ total: number; assigned: number; alreadySet: number }> {
    const KO_STAGES = [
      MatchStage.R32,
      MatchStage.R16,
      MatchStage.QUARTERFINAL,
      MatchStage.SEMIFINAL,
      MatchStage.THIRD_PLACE,
      MatchStage.FINAL,
    ];

    const path = resolve(process.cwd(), 'prisma', 'data', 'worldcup-2026.json');
    const data = JSON.parse(readFileSync(path, 'utf-8')) as {
      matches: Array<{ externalId: string; stage: string; startTime: string }>;
    };
    const seedMatches = data.matches
      .filter((m) => (KO_STAGES as string[]).includes(m.stage))
      .map((m) => ({
        code: m.externalId,
        stage: m.stage as MatchStage,
        startTime: new Date(m.startTime),
      }));

    const dbMatches = await this.prisma.match.findMany({
      where: { tournamentId, stage: { in: KO_STAGES } },
      select: { id: true, stage: true, startTime: true, code: true },
    });

    const plan = planBracketRelink(seedMatches, dbMatches);
    const toWrite = plan.filter((a) => !a.alreadySet);
    await this.prisma.$transaction(
      toWrite.map((a) =>
        this.prisma.match.update({
          where: { id: a.matchId },
          data: { code: a.code },
        }),
      ),
    );
    return {
      total: plan.length,
      assigned: toWrite.length,
      alreadySet: plan.length - toWrite.length,
    };
  }
```

Nota: `MatchStage` ya está importado en este service. Si TypeScript se queja del cast `(KO_STAGES as string[])`, usar `KO_STAGES.map(String).includes(m.stage)`.

- [ ] **Step 2: Endpoint en el controller**

En `tournaments.controller.ts`, junto a `propagateKnockout` (~línea 227):

```ts
  /** Reasigna Match.code desde el JSON de siembra (repara BDs con externalId remapeado). */
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Post(':id/bracket/relink-codes')
  relinkBracketCodes(@Param('id') id: string) {
    return this.service.relinkBracketCodes(id);
  }
```

- [ ] **Step 3: Compilar y correr suite**

Run (desde `apps/api`): `npx tsc --noEmit && pnpm test`
Expected: limpio, PASS.

- [ ] **Step 4: Prueba end-to-end local contra la BD dev**

Simular el estado de prod en dev y verificar el ciclo completo relink→propagate. Desde `apps/api`, crear `tmp-verify-relink.ts` (borrarlo al final):

```ts
import { PrismaClient, MatchStage, MatchStatus } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  // 1. Simular prod: pisar externalId de KO con ids fake de ESPN y limpiar code.
  const kos = await p.match.findMany({
    where: { stage: { in: [MatchStage.R32, MatchStage.R16, MatchStage.QUARTERFINAL, MatchStage.SEMIFINAL, MatchStage.THIRD_PLACE, MatchStage.FINAL] } },
    orderBy: { startTime: 'asc' },
  });
  for (let i = 0; i < kos.length; i++) {
    await p.match.update({ where: { id: kos[i].id }, data: { externalId: `fake-espn-${760486 + i}`, code: null } });
  }
  console.log(`KO con externalId pisado y code null: ${kos.length}`);
}
main().finally(() => p.$disconnect());
```

Run: `npx tsx tmp-verify-relink.ts` → luego levantar la API (`pnpm start:dev`) y con un token admin:
`POST /api/tournaments/<id>/bracket/relink-codes`
Expected: `{ "total": 32, "assigned": 32, "alreadySet": 0 }`. Repetir el POST → `{ total: 32, assigned: 0, alreadySet: 32 }` (idempotencia).

Después restaurar dev: `UPDATE "Match" SET "externalId" = "code" WHERE "code" LIKE 'wc-%';` (vía `npx prisma db execute`) y borrar `tmp-verify-relink.ts`.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/tournaments/tournaments.service.ts apps/api/src/modules/tournaments/tournaments.controller.ts
git commit -m "feat: endpoint admin POST :id/bracket/relink-codes"
```

---

### Task 8: Hook de carga manual — `updateMatch` dispara la cadena post-FINISHED

**Files:**
- Modify: `apps/api/src/modules/resultados/resultados.service.ts:126-184` (`handleKnockoutFinished` → firma compartida; nuevo `onMatchFinished`)
- Modify: `apps/api/src/modules/fixtures/fixtures.service.ts:108-114` (`updateMatch`)
- Modify: `apps/api/src/modules/fixtures/fixtures.module.ts`
- Create: `apps/api/src/modules/fixtures/fixtures.service.spec.ts`

- [ ] **Step 1: Verificar que no hay ciclo de módulos**

Run: `grep -rn "FixturesModule" apps/api/src/modules --include="*.module.ts"`
Expected: solo `fixtures.module.ts` y `app.module` (u otro raíz). Ninguno de los módulos que importa `ResultadosModule` (Gamificacion, Notificaciones, Activity, Tournaments) debe importar `FixturesModule`. Si apareciera un ciclo, usar `forwardRef(() => ResultadosModule)` en `FixturesModule` y `@Inject(forwardRef(() => ResultadosService))` en el service.

- [ ] **Step 2: Refactor de `handleKnockoutFinished` a una forma compartida + `onMatchFinished` público**

En `resultados.service.ts`, definir el tipo (arriba del `@Injectable()`, junto a los otros tipos locales):

```ts
/** Datos mínimos de un partido recién FINISHED para disparar la cadena post-resultado. */
export interface FinishedMatchInfo {
  fixtureId: string;
  tournamentId: string;
  stage: MatchStage;
  code: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  homePens: number | null;
  awayPens: number | null;
}
```

Cambiar la firma de `handleKnockoutFinished` de `(local: ActiveMatchWithTeams, r: RemoteResult)` a `(m: FinishedMatchInfo)` y dentro reemplazar los usos: `local.tournamentId` → `m.tournamentId`, `local.externalId`/`code` → `m.code`, `r.homeScore` → `m.homeScore`, `r.homePens ?? null` → `m.homePens`, `local.stage` → `m.stage`, `local.homeTeamId` → `m.homeTeamId`, etc. La lógica (propagar + campeón si FINAL + try/catch) no cambia.

En el call site del poller (`fetchAndUpdateResults`, línea ~106), construir la forma compartida (los scores del remoto, que son los frescos):

```ts
        } else if (isKnockoutStage(local.stage as unknown as SharedMatchStage)) {
          await this.handleKnockoutFinished({
            fixtureId: local.fixtureId,
            tournamentId: local.tournamentId,
            stage: local.stage,
            code: local.code,
            homeTeamId: local.homeTeamId,
            awayTeamId: local.awayTeamId,
            homeScore: r.homeScore,
            awayScore: r.awayScore,
            homePens: r.homePens ?? null,
            awayPens: r.awayPens ?? null,
          });
        }
```

Agregar el método público `onMatchFinished` (después de `handleKnockoutFinished`):

```ts
  /**
   * Cadena post-FINISHED para resultados cargados a mano por el admin
   * (PATCH fixtures/matches/:id): la misma que dispara el poller — puntos del
   * fixture, standings si es grupos, propagación/campeón si es eliminación.
   */
  async onMatchFinished(m: FinishedMatchInfo): Promise<void> {
    await this.calculatePoints(m.fixtureId);
    if (m.stage === MatchStage.GROUP) {
      await this.refreshGroupStandings(m.tournamentId);
    } else if (isKnockoutStage(m.stage as unknown as SharedMatchStage)) {
      await this.handleKnockoutFinished(m);
    }
  }
```

- [ ] **Step 3: Test del hook en `FixturesService` (falla primero)**

`apps/api/src/modules/fixtures/fixtures.service.spec.ts` (estilo unit con mocks planos, como los servicios se instancian por constructor):

```ts
import { MatchStatus, MatchStage } from '@prisma/client';
import { FixturesService } from './fixtures.service';

const baseMatch = {
  id: 'm1',
  fixtureId: 'f1',
  tournamentId: 't1',
  stage: MatchStage.R32,
  code: 'wc-r32-01',
  status: MatchStatus.LIVE,
  homeTeamId: 'th',
  awayTeamId: 'ta',
  homeScore: null,
  awayScore: null,
  homePens: null,
  awayPens: null,
};

function build(current = baseMatch, updated = { ...baseMatch, status: MatchStatus.FINISHED, homeScore: 2, awayScore: 1 }) {
  const prisma = {
    match: {
      findUnique: jest.fn().mockResolvedValue(current),
      update: jest.fn().mockResolvedValue(updated),
    },
  } as any;
  const cache = { delByPattern: jest.fn().mockResolvedValue(undefined) } as any;
  const resultados = { onMatchFinished: jest.fn().mockResolvedValue(undefined) } as any;
  return { service: new FixturesService(prisma, cache, resultados), resultados };
}

describe('FixturesService.updateMatch — hook post-FINISHED', () => {
  it('dispara onMatchFinished cuando el partido pasa a FINISHED', async () => {
    const { service, resultados } = build();
    await service.updateMatch('m1', { status: MatchStatus.FINISHED, homeScore: 2, awayScore: 1 } as any);
    expect(resultados.onMatchFinished).toHaveBeenCalledWith(
      expect.objectContaining({ fixtureId: 'f1', code: 'wc-r32-01', homeScore: 2 }),
    );
  });

  it('NO dispara si el partido ya estaba FINISHED (edición de un resultado viejo)', async () => {
    const finished = { ...baseMatch, status: MatchStatus.FINISHED };
    const { service, resultados } = build(finished, { ...finished, homeScore: 3 });
    await service.updateMatch('m1', { homeScore: 3 } as any);
    expect(resultados.onMatchFinished).not.toHaveBeenCalled();
  });

  it('NO dispara si el update no llega a FINISHED', async () => {
    const { service, resultados } = build(baseMatch, { ...baseMatch, homeScore: 1 });
    await service.updateMatch('m1', { homeScore: 1 } as any);
    expect(resultados.onMatchFinished).not.toHaveBeenCalled();
  });

  it('un fallo del hook no rompe el PATCH', async () => {
    const { service, resultados } = build();
    resultados.onMatchFinished.mockRejectedValue(new Error('boom'));
    const updated = await service.updateMatch('m1', { status: MatchStatus.FINISHED } as any);
    expect(updated.status).toBe(MatchStatus.FINISHED);
  });
});
```

Run: `pnpm test -- fixtures.service`
Expected: FAIL — `FixturesService` no acepta un tercer argumento / no llama al hook.

- [ ] **Step 4: Implementar el hook en `FixturesService`**

`fixtures.service.ts` — imports nuevos:

```ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MatchStatus } from '@prisma/client';
import { ResultadosService } from '../resultados/resultados.service';
```

Constructor y `updateMatch`:

```ts
@Injectable()
export class FixturesService {
  private readonly logger = new Logger(FixturesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly resultados: ResultadosService,
  ) {}
```

```ts
  async updateMatch(matchId: string, data: UpdateMatchDto) {
    const match = await this.prisma.match.findUnique({ where: { id: matchId } });
    if (!match) throw new NotFoundException('Partido no encontrado');
    const updated = await this.prisma.match.update({ where: { id: matchId }, data });
    await this.invalidate();

    // Carga manual del admin: al pasar a FINISHED dispara la misma cadena que
    // el poller (puntos + standings/propagación/campeón). Un fallo acá no debe
    // romper el PATCH: el resultado ya quedó guardado.
    const becameFinished =
      match.status !== MatchStatus.FINISHED &&
      updated.status === MatchStatus.FINISHED;
    if (becameFinished) {
      try {
        await this.resultados.onMatchFinished(updated);
      } catch (err: any) {
        this.logger.error(`Post-FINISHED hook falló para ${matchId}: ${err.message}`);
      }
    }
    return updated;
  }
```

(`updated` es la fila completa de `Match`, que ya tiene todos los campos de `FinishedMatchInfo`, incluido `code` gracias a Task 1.)

`fixtures.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { FixturesController } from './fixtures.controller';
import { FixturesService } from './fixtures.service';
import { AdminGuard } from '../../common/guards/admin.guard';
import { ResultadosModule } from '../resultados/resultados.module';

@Module({
  imports: [ResultadosModule],
  controllers: [FixturesController],
  providers: [FixturesService, AdminGuard],
  exports: [FixturesService],
})
export class FixturesModule {}
```

- [ ] **Step 5: Correr tests y build completo**

Run (desde `apps/api`): `npx tsc --noEmit && pnpm test`
Expected: build limpio; los 4 tests nuevos PASS; el resto de la suite PASS. Además arrancar la API (`pnpm start:dev`) y verificar en el log que Nest levanta sin error de dependencias circulares.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/fixtures/ apps/api/src/modules/resultados/resultados.service.ts
git commit -m "feat: carga manual de resultados dispara puntos+propagación+campeón"
```

---

### Task 9: Runbook de reparación en prod (lo ejecuta el usuario)

**Files:**
- Modify: `docs/superpowers/specs/2026-07-02-knockout-progression-design.md` (ya documenta el runbook; verificar que coincida con lo implementado)

- [ ] **Step 1: Verificación final local**

Run (desde `apps/api`): `pnpm test && npx tsc --noEmit`
Expected: todo PASS/limpio.

- [ ] **Step 2: Documentar el runbook para el usuario (mensaje final, no código)**

Pasos que ejecuta el usuario contra prod (Render), en orden:

1. **Aplicar la migración a mano** en la BD de Render (convención del proyecto: sin `migrate deploy` en startCommand). SQL exacto: el de `apps/api/prisma/migrations/20260702120000_match_code/migration.sql`, más el registro en `_prisma_migrations` si se quiere mantener el historial consistente (o correr `npx prisma migrate deploy` manualmente apuntando `DATABASE_URL` a Render, que hace ambas cosas).
2. **Deploy** de la API con estos cambios.
3. `POST /api/tournaments/<id>/bracket/relink-codes` (admin) → esperar `{ total: 32, assigned: 32, alreadySet: 0 }` (o `assigned` menor si el backfill de la migración ya cubrió algo).
4. `POST /api/tournaments/<id>/knockout/propagate` (admin) → rellena los cruces de 8vos ya definidos. A la fecha del plan: Canadá–Marruecos, Paraguay–Francia, Brasil–Noruega, México–Inglaterra, EE.UU.–Bélgica (dos de ellos con ganador por penales, que `knockoutWinnerSide` resuelve con `homePens/awayPens`).
5. Verificar el bracket en la web; de ahí en más el poller propaga solo cada ronda.

- [ ] **Step 3: Commit final si hubo ajustes de docs**

```bash
git add docs/
git commit -m "docs: runbook de reparación del bracket en prod"
```

---

## Self-review (hecho al escribir el plan)

- **Cobertura del spec:** §1 columna `code` → Task 1+5; §2 propagación por `code` → Tasks 2-4; §3 relink → Tasks 6-7; §4 hook manual → Task 8; §5 runbook prod → Task 9. Casos borde del spec: empate sin penales (cubierto por `knockoutWinnerSide`, sin cambios), match sin `code` (guard `if (!finished.code)` en Task 3), re-corrida de `map-espn-ids` (Task 5 Step 2).
- **Tipos consistentes:** `AdvanceRef.sourceCode` (Task 2) = lo que compara `resolveSide` (Task 3); `ActiveMatchWithTeams.code` (Task 4) alimenta `FinishedMatchInfo.code` (Task 8); `planBracketRelink` (Task 6) = firma usada en Task 7.
- **Sin placeholders:** cada paso tiene código o comando concreto.
