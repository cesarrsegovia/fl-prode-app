# ESPN Results Provider — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar API-Football por la API pública de ESPN como fuente de resultados del Mundial, vía un proveedor intercambiable, y poblar `Match.externalId` con los event ids reales de ESPN.

**Architecture:** Se introduce una interfaz `ResultsProvider` que devuelve `RemoteResult[]` normalizado. `EspnResultsProvider` lee del scoreboard de ESPN; el código actual de API-Football se extrae a `ApiFootballResultsProvider` (legacy). `resultados.service` selecciona el provider por env `RESULTS_PROVIDER` y `applyRemoteResult()` pasa a consumir `RemoteResult` (agnóstico). Un script one-shot idempotente puebla `Match.externalId` con event ids de ESPN.

**Tech Stack:** NestJS 11, TypeScript, Prisma, Jest (ya configurado en `apps/api`), axios (ya usado). Scripts CLI con `ts-node -r tsconfig-paths/register`.

**Repo:** `d:\Work\fl-prode-app`, paquete `apps/api`. Comandos desde `d:/Work/fl-prode-app/apps/api` salvo que se indique.

**Restricción:** **NO commitear** (lo hace el usuario). Los pasos "Commit" del formato estándar se reemplazan por **verificación** (`npx jest`, `npx tsc --noEmit`).

**NO tocar:** `calculatePoints`, `scoring.ts`, `GroupScore`/rankings, TopScorer, schema Prisma, UI.

---

## File Structure

**Nuevos:**
- `apps/api/src/modules/resultados/providers/results-provider.ts` — interfaz `ResultsProvider` + tipo `RemoteResult` + token DI.
- `apps/api/src/modules/resultados/providers/espn.util.ts` — `statusFromEspn()` (puro).
- `apps/api/src/modules/resultados/providers/espn.util.spec.ts` — tests del mapeo.
- `apps/api/src/modules/resultados/providers/espn.provider.ts` — `EspnResultsProvider`.
- `apps/api/src/modules/resultados/providers/espn.provider.spec.ts` — test de parseo de scoreboard.
- `apps/api/src/modules/resultados/providers/api-football.provider.ts` — `ApiFootballResultsProvider` (extraído).
- `apps/api/prisma/map-espn-ids.ts` — script one-shot de mapeo de externalId.

**Modificados:**
- `apps/api/src/modules/resultados/resultados.service.ts` — usar provider; `applyRemoteResult(RemoteResult)`.
- `apps/api/src/modules/resultados/resultados.module.ts` — registrar providers + selección por env.
- `apps/api/package.json` — script `db:map-espn-ids`.
- `apps/api/.env.example` — `RESULTS_PROVIDER`, `ESPN_SCOREBOARD_URL`.
- `render.yaml` — declarar `RESULTS_PROVIDER`, `ESPN_SCOREBOARD_URL`.

---

## Task 1: Interfaz `ResultsProvider` + tipo `RemoteResult`

**Files:**
- Create: `apps/api/src/modules/resultados/providers/results-provider.ts`

- [ ] **Step 1: Crear el archivo**

```typescript
import { MatchStatus } from '@prisma/client';

/** Resultado normalizado de un partido, agnóstico del proveedor externo. */
export interface RemoteResult {
  /** Event id del proveedor (se guarda en Match.externalId). */
  externalId: string;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
  homeScoreET?: number | null;
  awayScoreET?: number | null;
  homePens?: number | null;
  awayPens?: number | null;
}

/** Partido local mínimo que el provider necesita para consultar resultados. */
export interface ActiveMatch {
  id: string;
  externalId: string;
  startTime: Date;
}

export interface ResultsProvider {
  /** Trae los resultados remotos de los partidos activos dados. */
  fetchResults(activeMatches: ActiveMatch[]): Promise<RemoteResult[]>;
}

/** Token DI para inyectar el provider seleccionado. */
export const RESULTS_PROVIDER = Symbol('RESULTS_PROVIDER');
```

- [ ] **Step 2: Verificar tipos**

Run: `cd d:/Work/fl-prode-app/apps/api && npx tsc --noEmit`
Expected: sin nuevos errores.

---

## Task 2: `espn.util.ts` — mapeo de estado (TDD)

**Files:**
- Create: `apps/api/src/modules/resultados/providers/espn.util.ts`
- Test: `apps/api/src/modules/resultados/providers/espn.util.spec.ts`

- [ ] **Step 1: Escribir el test (falla)**

`espn.util.spec.ts`:
```typescript
import { MatchStatus } from '@prisma/client';
import { statusFromEspn } from './espn.util';

describe('statusFromEspn', () => {
  it('post / completed -> FINISHED', () => {
    expect(statusFromEspn('post', 'STATUS_FULL_TIME', true)).toBe(MatchStatus.FINISHED);
    expect(statusFromEspn('post', 'STATUS_FINAL', false)).toBe(MatchStatus.FINISHED);
  });
  it('in -> LIVE', () => {
    expect(statusFromEspn('in', 'STATUS_FIRST_HALF', false)).toBe(MatchStatus.LIVE);
  });
  it('postponed / canceled -> CANCELLED', () => {
    expect(statusFromEspn('pre', 'STATUS_POSTPONED', false)).toBe(MatchStatus.CANCELLED);
    expect(statusFromEspn('pre', 'STATUS_CANCELED', false)).toBe(MatchStatus.CANCELLED);
  });
  it('pre / desconocido -> PENDING', () => {
    expect(statusFromEspn('pre', 'STATUS_SCHEDULED', false)).toBe(MatchStatus.PENDING);
    expect(statusFromEspn('', '', false)).toBe(MatchStatus.PENDING);
  });
});
```

- [ ] **Step 2: Correr el test (debe fallar)**

Run: `cd d:/Work/fl-prode-app/apps/api && npx jest espn.util --silent`
Expected: FAIL (`Cannot find module './espn.util'`).

- [ ] **Step 3: Implementar `espn.util.ts`**

```typescript
import { MatchStatus } from '@prisma/client';

const CANCELLED_NAMES = new Set([
  'STATUS_POSTPONED',
  'STATUS_CANCELED',
  'STATUS_CANCELLED',
  'STATUS_ABANDONED',
  'STATUS_FORFEIT',
  'STATUS_SUSPENDED',
]);

/**
 * Mapea el estado de ESPN (status.type.state + status.type.name + completed)
 * al enum MatchStatus.
 */
export function statusFromEspn(
  state: string,
  name: string,
  completed: boolean,
): MatchStatus {
  if (CANCELLED_NAMES.has(name)) return MatchStatus.CANCELLED;
  if (completed || state === 'post') return MatchStatus.FINISHED;
  if (state === 'in') return MatchStatus.LIVE;
  return MatchStatus.PENDING;
}
```

- [ ] **Step 4: Correr el test (debe pasar)**

Run: `cd d:/Work/fl-prode-app/apps/api && npx jest espn.util --silent`
Expected: PASS (4 tests).

---

## Task 3: `EspnResultsProvider` (TDD del parseo)

**Files:**
- Create: `apps/api/src/modules/resultados/providers/espn.provider.ts`
- Test: `apps/api/src/modules/resultados/providers/espn.provider.spec.ts`

El provider expone un método estático puro `parseScoreboard(json)` para testear el parseo sin red, y `fetchResults()` que hace los GET y delega en `parseScoreboard`.

- [ ] **Step 1: Escribir el test (falla)**

`espn.provider.spec.ts`:
```typescript
import { MatchStatus } from '@prisma/client';
import { EspnResultsProvider } from './espn.provider';

const SAMPLE = {
  events: [
    {
      id: '760416',
      date: '2026-06-12T19:00Z',
      status: { type: { state: 'post', name: 'STATUS_FULL_TIME', completed: true } },
      competitions: [
        {
          competitors: [
            { homeAway: 'home', score: '2' },
            { homeAway: 'away', score: '1' },
          ],
        },
      ],
    },
    {
      id: '760417',
      date: '2026-06-12T22:00Z',
      status: { type: { state: 'pre', name: 'STATUS_SCHEDULED', completed: false } },
      competitions: [
        {
          competitors: [
            { homeAway: 'home', score: '0' },
            { homeAway: 'away', score: '0' },
          ],
        },
      ],
    },
  ],
};

describe('EspnResultsProvider.parseScoreboard', () => {
  it('mapea eventos a RemoteResult con score por homeAway y status', () => {
    const out = EspnResultsProvider.parseScoreboard(SAMPLE);
    expect(out).toContainEqual({
      externalId: '760416',
      status: MatchStatus.FINISHED,
      homeScore: 2,
      awayScore: 1,
    });
    const pending = out.find((r) => r.externalId === '760417');
    expect(pending?.status).toBe(MatchStatus.PENDING);
    expect(pending?.homeScore).toBe(0);
  });

  it('saltea eventos sin competitors/score sin romper', () => {
    const out = EspnResultsProvider.parseScoreboard({
      events: [{ id: 'x', status: { type: { state: 'pre', name: '', completed: false } }, competitions: [] }],
    });
    expect(out).toEqual([]);
  });

  it('JSON vacío -> []', () => {
    expect(EspnResultsProvider.parseScoreboard({})).toEqual([]);
    expect(EspnResultsProvider.parseScoreboard(null)).toEqual([]);
  });
});
```

- [ ] **Step 2: Correr el test (debe fallar)**

Run: `cd d:/Work/fl-prode-app/apps/api && npx jest espn.provider --silent`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementar `espn.provider.ts`**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { MatchStatus } from '@prisma/client';
import {
  ActiveMatch,
  RemoteResult,
  ResultsProvider,
} from './results-provider';
import { statusFromEspn } from './espn.util';

const DEFAULT_BASE =
  'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world';
const UA = 'Mozilla/5.0 (compatible; ProdeBot/1.0)';

function toInt(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** YYYYMMDD en UTC a partir de una Date. */
function espnDate(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

@Injectable()
export class EspnResultsProvider implements ResultsProvider {
  private readonly logger = new Logger(EspnResultsProvider.name);
  private readonly base = (process.env.ESPN_SCOREBOARD_URL || DEFAULT_BASE).replace(/\/+$/, '');

  /** Parseo puro de un JSON de scoreboard de ESPN a RemoteResult[]. */
  static parseScoreboard(json: any): RemoteResult[] {
    const events: any[] = json?.events ?? [];
    const out: RemoteResult[] = [];
    for (const ev of events) {
      const comp = ev?.competitions?.[0];
      const competitors: any[] = comp?.competitors ?? [];
      const home = competitors.find((c) => c?.homeAway === 'home');
      const away = competitors.find((c) => c?.homeAway === 'away');
      if (!home || !away) continue;
      const type = ev?.status?.type ?? {};
      out.push({
        externalId: String(ev.id),
        status: statusFromEspn(type.state ?? '', type.name ?? '', !!type.completed),
        homeScore: toInt(home.score),
        awayScore: toInt(away.score),
      });
    }
    return out;
  }

  async fetchResults(activeMatches: ActiveMatch[]): Promise<RemoteResult[]> {
    const dates = Array.from(new Set(activeMatches.map((m) => espnDate(m.startTime))));
    const results: RemoteResult[] = [];
    for (const date of dates) {
      try {
        const res = await axios.get(`${this.base}/scoreboard`, {
          params: { dates: date },
          headers: { 'User-Agent': UA },
          timeout: 10_000,
        });
        results.push(...EspnResultsProvider.parseScoreboard(res.data));
      } catch (err: any) {
        this.logger.error(`ESPN scoreboard fetch failed for ${date}: ${err.message}`);
      }
    }
    return results;
  }
}
```

- [ ] **Step 4: Correr el test (debe pasar)**

Run: `cd d:/Work/fl-prode-app/apps/api && npx jest espn.provider --silent`
Expected: PASS (3 tests).

---

## Task 4: Extraer `ApiFootballResultsProvider` (legacy)

**Files:**
- Create: `apps/api/src/modules/resultados/providers/api-football.provider.ts`

Mueve el fetch actual de API-Football (de `resultados.service.ts` líneas ~39-79) a un provider, produciendo `RemoteResult[]`. Conserva `api-football.util.ts`.

- [ ] **Step 1: Crear `api-football.provider.ts`**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import {
  ActiveMatch,
  RemoteResult,
  ResultsProvider,
} from './results-provider';
import { statusFromApiFootball } from '../../../common/utils/api-football.util';

interface ApiFixtureResponse {
  fixture: { id: number; status: { short: string } };
  goals: { home: number | null; away: number | null };
  score: {
    extratime: { home: number | null; away: number | null };
    penalty: { home: number | null; away: number | null };
  };
}

const BATCH_SIZE = 20;

@Injectable()
export class ApiFootballResultsProvider implements ResultsProvider {
  private readonly logger = new Logger(ApiFootballResultsProvider.name);

  async fetchResults(activeMatches: ActiveMatch[]): Promise<RemoteResult[]> {
    const apiKey = process.env.SPORTS_API_KEY;
    const rawUrl = process.env.SPORTS_API_URL;
    if (!apiKey || !rawUrl) {
      this.logger.warn('SPORTS_API_KEY/SPORTS_API_URL no configurados. Skipping.');
      return [];
    }
    const apiUrl = (/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`).replace(/\/+$/, '');
    const externalIds = activeMatches.map((m) => m.externalId);
    const out: RemoteResult[] = [];

    for (let i = 0; i < externalIds.length; i += BATCH_SIZE) {
      const chunk = externalIds.slice(i, i + BATCH_SIZE);
      try {
        const res = await axios.get(`${apiUrl}/fixtures`, {
          headers: { 'x-apisports-key': apiKey },
          params: { ids: chunk.join('-') },
          timeout: 10_000,
        });
        const responses: ApiFixtureResponse[] = res.data?.response ?? [];
        for (const fx of responses) {
          out.push({
            externalId: String(fx.fixture.id),
            status: statusFromApiFootball(fx.fixture.status.short),
            homeScore: fx.goals.home ?? null,
            awayScore: fx.goals.away ?? null,
            homeScoreET: fx.score.extratime.home ?? null,
            awayScoreET: fx.score.extratime.away ?? null,
            homePens: fx.score.penalty.home ?? null,
            awayPens: fx.score.penalty.away ?? null,
          });
        }
      } catch (err: any) {
        this.logger.error(`Batch fetch failed: ${err.message}`);
      }
    }
    return out;
  }
}
```

- [ ] **Step 2: Verificar tipos**

Run: `cd d:/Work/fl-prode-app/apps/api && npx tsc --noEmit`
Expected: sin nuevos errores.

---

## Task 5: Refactor `resultados.service.ts` para consumir el provider

**Files:**
- Modify: `apps/api/src/modules/resultados/resultados.service.ts`

`fetchAndUpdateResults()` delega el fetch al provider inyectado; `applyRemoteResult()` pasa a recibir `RemoteResult`.

- [ ] **Step 1: Cambiar imports y constructor**

Reemplazar el import de `statusFromApiFootball` y la interfaz `ApiFixtureResponse`/`BATCH_SIZE` (líneas ~11-24) por:
```typescript
import { Inject } from '@nestjs/common';
import {
  ActiveMatch,
  RemoteResult,
  RESULTS_PROVIDER,
  ResultsProvider,
} from './providers/results-provider';
```
Agregar al constructor (junto a las demás dependencias):
```typescript
    @Inject(RESULTS_PROVIDER) private readonly provider: ResultsProvider,
```

- [ ] **Step 2: Reescribir `fetchAndUpdateResults()`**

Reemplazar el cuerpo actual (líneas ~39-84) por:
```typescript
  async fetchAndUpdateResults() {
    const activeMatches = await this.prisma.match.findMany({
      where: {
        status: { in: [MatchStatus.LIVE, MatchStatus.PENDING] },
        externalId: { not: null },
      },
      select: { id: true, externalId: true, startTime: true, status: true, homeScore: true, awayScore: true, fixtureId: true },
    });
    if (!activeMatches.length) return;

    const byExternalId = new Map(activeMatches.map((m) => [m.externalId!, m]));
    const active: ActiveMatch[] = activeMatches.map((m) => ({
      id: m.id,
      externalId: m.externalId!,
      startTime: m.startTime,
    }));

    const remote = await this.provider.fetchResults(active);

    const affectedFixtureIds = new Set<string>();
    for (const r of remote) {
      const local = byExternalId.get(r.externalId);
      if (!local) continue;
      const becameFinished = await this.applyRemoteResult(local, r);
      if (becameFinished) affectedFixtureIds.add(local.fixtureId);
    }

    for (const fixtureId of affectedFixtureIds) {
      await this.calculatePoints(fixtureId);
    }
  }
```

- [ ] **Step 3: Reescribir `applyRemoteResult()` para consumir `RemoteResult`**

Reemplazar la firma y el cuerpo (líneas ~86-130) por:
```typescript
  /** Aplica el resultado remoto al match local. Devuelve true si quedó FINISHED por primera vez. */
  private async applyRemoteResult(
    local: { id: string; status: MatchStatus; homeScore: number | null; awayScore: number | null },
    remote: RemoteResult,
  ): Promise<boolean> {
    const newStatus = remote.status;
    const homeScore = remote.homeScore;
    const awayScore = remote.awayScore;

    const updated = await this.prisma.match.update({
      where: { id: local.id },
      data: {
        homeScore: homeScore ?? undefined,
        awayScore: awayScore ?? undefined,
        homeScoreET: remote.homeScoreET ?? undefined,
        awayScoreET: remote.awayScoreET ?? undefined,
        homePens: remote.homePens ?? undefined,
        awayPens: remote.awayPens ?? undefined,
        status: newStatus,
      },
    });

    const scoreChanged =
      local.homeScore !== updated.homeScore || local.awayScore !== updated.awayScore;
    if (scoreChanged && updated.homeScore !== null && updated.awayScore !== null) {
      this.events.emitToAll(WS_EVENTS.MATCH_SCORE_UPDATE, {
        matchId: updated.id,
        homeScore: updated.homeScore,
        awayScore: updated.awayScore,
      });
    }
    if (local.status !== newStatus) {
      this.events.emitToAll(WS_EVENTS.MATCH_STATUS_CHANGE, {
        matchId: updated.id,
        status: newStatus,
      });
    }

    const becameFinished =
      local.status !== MatchStatus.FINISHED &&
      newStatus === MatchStatus.FINISHED &&
      homeScore !== null &&
      awayScore !== null;
    return becameFinished;
  }
```

- [ ] **Step 4: Verificar tipos**

Run: `cd d:/Work/fl-prode-app/apps/api && npx tsc --noEmit`
Expected: sin errores (puede haber error de DI hasta completar Task 6 — si tsc pasa, el DI se resuelve en runtime/Task 6).

---

## Task 6: Registrar providers + selección por env en el módulo

**Files:**
- Modify: `apps/api/src/modules/resultados/resultados.module.ts`

- [ ] **Step 1: Reescribir el módulo**

```typescript
import { Module } from '@nestjs/common';
import { ResultadosService } from './resultados.service';
import { GamificacionModule } from '../gamificacion/gamificacion.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { ActivityModule } from '../activity/activity.module';
import { TournamentsModule } from '../tournaments/tournaments.module';
import { RESULTS_PROVIDER } from './providers/results-provider';
import { EspnResultsProvider } from './providers/espn.provider';
import { ApiFootballResultsProvider } from './providers/api-football.provider';

@Module({
  imports: [
    GamificacionModule,
    NotificacionesModule,
    ActivityModule,
    TournamentsModule,
  ],
  providers: [
    ResultadosService,
    EspnResultsProvider,
    ApiFootballResultsProvider,
    {
      provide: RESULTS_PROVIDER,
      inject: [EspnResultsProvider, ApiFootballResultsProvider],
      useFactory: (espn: EspnResultsProvider, apiFootball: ApiFootballResultsProvider) =>
        process.env.RESULTS_PROVIDER === 'apifootball' ? apiFootball : espn,
    },
  ],
  exports: [ResultadosService],
})
export class ResultadosModule {}
```

- [ ] **Step 2: Verificar tipos + arranque**

Run: `cd d:/Work/fl-prode-app/apps/api && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Correr toda la suite (regresión scoring)**

Run: `cd d:/Work/fl-prode-app/apps/api && npx jest --silent`
Expected: PASS — incluyendo `scoring.spec.ts` (no se tocó), `espn.util.spec.ts`, `espn.provider.spec.ts`.

---

## Task 7: Script `map-espn-ids.ts` — poblar externalId

**Files:**
- Create: `apps/api/prisma/map-espn-ids.ts`
- Modify: `apps/api/package.json` (script `db:map-espn-ids`)

Trae los eventos de ESPN (scoreboard por fecha, que da abreviaturas inline), y matchea contra los `Match` de la BD. Para grupos: por `(abbr home + abbr away + fecha)`. Para KO: por `(fecha + posición de cruce)` — pero como los KO de ESPN también traen placeholders, se matchea por `startTime` exacto + ronda. Idempotente. Loguea no-matcheados.

> **Nota de fuente:** se usa el **scoreboard** del site API (no el core) porque da `team.abbreviation` y `score`/`date` inline sin perseguir `$ref`. Se recorren las fechas del Mundial (rango `tournament.startDate`..`endDate`) y se acumulan los eventos.

- [ ] **Step 1: Crear `map-espn-ids.ts`**

```typescript
/**
 * CLI: `pnpm db:map-espn-ids`
 * Pobla Match.externalId con el event id real de ESPN para el Mundial 2026.
 * - Grupos: matchea por (abbr home + abbr away + fecha UTC).
 * - KO: matchea por (fecha UTC + ronda) — ESPN usa placeholders con la misma fecha.
 * Idempotente. No toca picks/scores. Loguea los partidos sin match.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import axios from 'axios';
import { MatchStatus, MatchStage } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';

function loadEnvFile(path: string) {
  try {
    const content = readFileSync(path, 'utf-8');
    for (const rawLine of content.split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    /* .env opcional */
  }
}
loadEnvFile(resolve(process.cwd(), '.env'));

const BASE =
  (process.env.ESPN_SCOREBOARD_URL ||
    'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world').replace(/\/+$/, '');
const UA = 'Mozilla/5.0 (compatible; ProdeBot/1.0)';

interface EspnEvent {
  id: string;
  dateIso: string;       // ISO del evento
  homeAbbr: string | null;
  awayAbbr: string | null;
}

function norm(s: string | null | undefined): string {
  return (s ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase().trim();
}

/** YYYYMMDD UTC */
function ymd(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

function* dateRange(start: Date, end: Date): Generator<string> {
  const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  while (d <= last) {
    yield ymd(d);
    d.setUTCDate(d.getUTCDate() + 1);
  }
}

async function fetchEspnEvents(dates: string[]): Promise<EspnEvent[]> {
  const out: EspnEvent[] = [];
  for (const date of dates) {
    try {
      const res = await axios.get(`${BASE}/scoreboard`, {
        params: { dates: date },
        headers: { 'User-Agent': UA },
        timeout: 10_000,
      });
      for (const ev of res.data?.events ?? []) {
        const competitors = ev?.competitions?.[0]?.competitors ?? [];
        const home = competitors.find((c: any) => c?.homeAway === 'home');
        const away = competitors.find((c: any) => c?.homeAway === 'away');
        out.push({
          id: String(ev.id),
          dateIso: ev.date,
          homeAbbr: home?.team?.abbreviation ?? null,
          awayAbbr: away?.team?.abbreviation ?? null,
        });
      }
    } catch (err: any) {
      console.warn(`  ! ESPN ${date}: ${err.message}`);
    }
  }
  return out;
}

async function main() {
  const prisma = new PrismaService();
  await prisma.$connect();
  try {
    const tournament = await prisma.tournament.findFirst({ orderBy: { startDate: 'asc' } });
    if (!tournament) throw new Error('No hay torneo sembrado.');
    if (!tournament.startDate || !tournament.endDate) {
      throw new Error('El torneo no tiene startDate/endDate; no se puede recorrer el rango de fechas.');
    }

    const matches = await prisma.match.findMany({
      where: { tournamentId: tournament.id },
      include: { homeTeam: true, awayTeam: true },
    });

    const dates = Array.from(dateRange(tournament.startDate, tournament.endDate));
    console.log(`Trayendo eventos de ESPN para ${dates.length} fechas...`);
    const espn = await fetchEspnEvents(dates);
    console.log(`ESPN devolvió ${espn.length} eventos.`);

    // Índice por (abbrHome|abbrAway|YYYYMMDD) para grupos.
    const espnByKey = new Map<string, EspnEvent>();
    for (const e of espn) {
      if (e.homeAbbr && e.awayAbbr) {
        espnByKey.set(`${norm(e.homeAbbr)}|${norm(e.awayAbbr)}|${ymd(new Date(e.dateIso))}`, e);
      }
    }

    let matched = 0;
    const unmatched: string[] = [];

    for (const m of matches) {
      let ev: EspnEvent | undefined;
      if (m.stage === MatchStage.GROUP && m.homeTeam && m.awayTeam) {
        const key = `${norm(m.homeTeam.shortName)}|${norm(m.awayTeam.shortName)}|${ymd(m.startTime)}`;
        ev = espnByKey.get(key);
      } else {
        // KO: matchea por fecha+hora exacta (placeholders en ambos lados).
        ev = espn.find((e) => new Date(e.dateIso).getTime() === m.startTime.getTime());
      }
      if (ev) {
        await prisma.match.update({ where: { id: m.id }, data: { externalId: ev.id } });
        matched++;
      } else {
        const label =
          m.stage === MatchStage.GROUP
            ? `${m.homeTeam?.shortName} vs ${m.awayTeam?.shortName}`
            : `${m.homeTeamName} vs ${m.awayTeamName}`;
        unmatched.push(`${m.stage} ${label} @ ${m.startTime.toISOString()}`);
      }
    }

    console.log('\n========== Resumen ==========');
    console.log(`Partidos en BD:   ${matches.length}`);
    console.log(`Mapeados:         ${matched}`);
    console.log(`Sin match:        ${unmatched.length}`);
    if (unmatched.length) {
      console.log('\nSin match (revisar a mano):');
      unmatched.forEach((u) => console.log(`  - ${u}`));
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('✗ Error:', (e as Error).message);
  process.exitCode = 1;
});
```

- [ ] **Step 2: Agregar el script a `package.json`**

En `apps/api/package.json`, en `scripts`, después de `db:seed-squads`:
```json
    "db:map-espn-ids": "ts-node -r tsconfig-paths/register prisma/map-espn-ids.ts"
```

- [ ] **Step 3: Verificar que compila**

Run: `cd d:/Work/fl-prode-app/apps/api && npx tsc --noEmit`
Expected: sin errores. (No se ejecuta contra prod en este paso; eso es smoke manual del usuario.)

> **Nota (verificado):** el enum es `MatchStage` con valor `GROUP` (schema.prisma:226,542). `Match.stage` default `GROUP`. `tournament.startDate/endDate` son nullable → el script ya guarda contra null.

---

## Task 8: Config env + render.yaml

**Files:**
- Modify: `apps/api/.env.example`
- Modify: `render.yaml`

- [ ] **Step 1: `.env.example`**

Agregar bajo la sección de API-Football:
```
# Proveedor de resultados: "espn" (default, gratis, sin key) | "apifootball" (legacy, requiere SPORTS_API_KEY)
RESULTS_PROVIDER=espn
# Base del scoreboard de ESPN (override opcional)
ESPN_SCOREBOARD_URL=https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world
```

- [ ] **Step 2: `render.yaml`**

En la sección de envs del servicio `prode-api`, agregar:
```yaml
      - key: RESULTS_PROVIDER
        value: espn
      - key: ESPN_SCOREBOARD_URL
        value: https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world
```

- [ ] **Step 3: Verificación final completa**

Run: `cd d:/Work/fl-prode-app/apps/api && npx tsc --noEmit && npx jest --silent`
Expected: tsc sin errores; todos los tests PASAN.

---

## Notas para el resumen final (usuario)

- **Orden en prod:** (1) deploy del backend con `RESULTS_PROVIDER=espn`; (2) correr `pnpm db:map-espn-ids` contra la BD de prod (revisar el resumen de cobertura); (3) el cron actualiza solo cada 2 min.
- `SPORTS_API_KEY` ya **no es necesaria** con ESPN (el provider legacy queda disponible por si se vuelve a API-Football).
- Los partidos no cubiertos por ESPN (~8 KO tardíos) se completan re-corriendo el script cuando ESPN los publique.
- **NO commitear** — lo hace el usuario.
