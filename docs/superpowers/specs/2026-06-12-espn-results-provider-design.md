# Diseño — ESPN como proveedor de resultados del Mundial

> **Fecha:** 2026-06-12
> **Repo:** `fl-prode-app` (backend NestJS en `apps/api`).
> **Contexto:** los resultados de los partidos no se actualizaban porque el cron depende de API-Football, que tiene el Mundial solo en plan pago. Se reemplaza por la API pública de ESPN (gratuita, sin key).

## 1. Objetivo y alcance

Que los resultados de los **104 partidos** del Mundial 2026 ya sembrados (72 fase de grupos + 32 eliminatorias) se actualicen automáticamente desde la API pública de ESPN, disparando el scoring y rankings que **ya existen y funcionan**.

**En alcance:**
- Abstraer el proveedor de resultados (hoy acoplado a API-Football en `resultados.service.ts` + `api-football.util.ts`).
- Nuevo `EspnResultsProvider` que lee del scoreboard de ESPN.
- Script one-shot e idempotente que pobla `Match.externalId` con el **event id real de ESPN** (matching por equipos+fecha para grupos, cruce+fecha para KO).

**Fuera de alcance (NO se toca):**
- Scoring (`calculatePoints`, `scoring.ts`), `GroupScore`/rankings, TopScorer, R32 picks — son **agnósticos del proveedor**.
- Schema de Prisma (el modelo ya soporta grupos+KO).
- UI.
- Expandir el modelo de predicción (la app ya tiene grupos+KO sembrados).

## 2. Datos de ESPN (verificados golpeando la API)

- **Scoreboard (site API, inline, sin $ref):** `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=YYYYMMDD`
  - `events[].id` → event id (ej. `"760416"`).
  - `events[].date` → ISO (ej. `"2026-06-12T19:00Z"`).
  - `events[].status.type.state` → `pre` | `in` | `post`; `status.type.name` (ej. `STATUS_SCHEDULED`, `STATUS_POSTPONED`, `STATUS_CANCELED`); `status.type.completed` (bool).
  - `events[].competitions[0].competitors[]` → `{ homeAway: "home"|"away", team.displayName, team.abbreviation, score: "0" }`.
- **Core API (catálogo completo, por $ref):** `https://sports.core.api.espn.com/v2/sports/soccer/leagues/fifa.world/seasons/2026/types/{1,2,3}/events?limit=300`
  - type 1 = 72 (grupos), type 2 = 16, type 3 = 8 → **96 eventos** totales (vs 104 en BD; faltan ~8 KO tardíos que ESPN aún no publica).
  - Cada item es `$ref` a un evento con `id`, `date`, `name` (ej. `"Czechia at South Korea"`; KO con placeholder `"Group B 2nd Place at Group A 2nd Place"`).
- **League slug:** `fifa.world` (league id `606`). Sin API key, sin auth.
- **Riesgo:** API no oficial/no documentada, sin SLA ni rate limits publicados, puede cambiar sin aviso. Aceptable para un prode con parseo defensivo + manejo de errores.

## 3. Datos de la BD (verificados en `worldcup-2026.json` ya sembrado)

- `tournament`, 16 `venues`, 48 `teams` (con `shortName` tipo `"ARG"`, `"MEX"`), 12 `groups`, **104 `matches`**.
- Match de grupos: `{ externalId: "wc-m001", stage: "GROUP", round, groupName: "A", homeTeamExternalId: "t-MEX", awayTeamExternalId: "t-RSA", startTime }`.
- Match de KO: `{ externalId: "wc-r32-01", stage: "R32", homeTeamName: "2° Grupo B", awayTeamName: "2° Grupo A", startTime }` (placeholders).
- Los `externalId` actuales son **ficticios** (`wc-m001`, `wc-r32-01`) → hay que reemplazarlos por los event id de ESPN.

## 4. Arquitectura — proveedor intercambiable

Hoy `fetchAndUpdateResults()` ([resultados.service.ts:39-84](../../../apps/api/src/modules/resultados/resultados.service.ts)) habla directo con API-Football. Se refactoriza a:

```
interface ResultsProvider {
  fetchResults(activeMatches): Promise<RemoteResult[]>
}
type RemoteResult = {
  externalId: string;          // event id del proveedor
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
  homeScoreET?, awayScoreET?, homePens?, awayPens? (si el proveedor los da)
}

EspnResultsProvider        implements ResultsProvider   ← nuevo (default)
ApiFootballResultsProvider implements ResultsProvider   ← extraído del código actual (legacy)

resultados.service.fetchAndUpdateResults():
  provider = pick(RESULTS_PROVIDER)           // 'espn' (default) | 'apifootball'
  remote = await provider.fetchResults(activeMatches)
  for r in remote: applyRemoteResult(matchByExternalId[r.externalId], r)   // SIN cambios de lógica
  for fixtureId in affected: calculatePoints(fixtureId)                    // SIN cambios
```

El cron (`@Cron('*/2 * * * *')` en `resultados.cron.ts`), `applyRemoteResult()` y todo el scoring quedan **iguales**. Solo cambia de dónde salen los `{status, score}` normalizados.

## 5. Componentes

### 5.1 `apps/api/src/modules/resultados/providers/results-provider.ts` [NUEVO]
Interfaz `ResultsProvider` + tipo `RemoteResult`. Punto único que consume el service.

### 5.2 `apps/api/src/modules/resultados/providers/espn.provider.ts` [NUEVO]
- `fetchResults(activeMatches)`:
  - Junta las **fechas distintas** (`YYYYMMDD` en UTC) de los `activeMatches` (status LIVE/PENDING con `externalId != null`).
  - Por cada fecha: `GET {ESPN_SCOREBOARD_URL}/scoreboard?dates=YYYYMMDD` (User-Agent de browser).
  - Parsea `events[]` defensivamente → `RemoteResult[]` (`externalId = event.id`, score desde `competitors[].score` por `homeAway`, status vía `espn.util`).
  - Captura errores por fecha; loguea y sigue (no aborta el batch).

### 5.3 `apps/api/src/modules/resultados/providers/espn.util.ts` [NUEVO]
`statusFromEspn(state: string, name: string, completed: boolean): MatchStatus`:
- `state === 'post'` (o `completed`) → `FINISHED`.
- `state === 'in'` → `LIVE`.
- `name` en (`STATUS_POSTPONED`, `STATUS_CANCELED`, `STATUS_ABANDONED`, `STATUS_FORFEIT`) → `CANCELLED`.
- resto / `pre` → `PENDING`.
Función **pura**, testeable.

### 5.4 `apps/api/src/modules/resultados/providers/api-football.provider.ts` [NUEVO, extraído]
El fetch actual de API-Football movido a esta clase (mismo comportamiento, header `x-apisports-key`, query `ids=`, `statusFromApiFootball`). Queda como provider legacy seleccionable por env. `api-football.util.ts` se conserva.

### 5.5 `resultados.service.ts` [MODIFICADO]
Inyecta/selecciona el provider por `RESULTS_PROVIDER`. `fetchAndUpdateResults()` delega el fetch; conserva `applyRemoteResult()` + disparo de `calculatePoints()`. Diff acotado.

### 5.6 `apps/api/prisma/map-espn-ids.ts` [NUEVO] — script one-shot (CLI `pnpm db:map-espn-ids`)
- Trae los 96 eventos de ESPN (core API types 1/2/3), resolviendo `date` + equipos.
  - Para nombres de equipo: usar el `name`/`shortName` del evento del core API, o el scoreboard por fecha (que da `abbreviation` inline) — el plan elige la fuente más barata que dé abreviaturas fiables.
- **Grupos (72):** matchea cada evento contra los `Match stage=GROUP` por `(abbr home + abbr away + fecha UTC)`, normalizando mayúsculas/acentos. Resuelve el equipo de la BD vía `Team.shortName`.
- **KO (32):** matchea por `(ronda/posición de cruce + fecha)` contra los placeholders.
- Actualiza `Match.externalId` = event id de ESPN. **Idempotente** (re-ejecutable).
- **Loguea los no-matcheados** (ESPN sin el partido aún, o diferencia de abreviatura) con detalle para resolver a mano. No aborta.
- **No toca picks, grupos ni scores** — solo escribe `externalId`. Patrón de los seeds existentes (`ts-node -r tsconfig-paths/register`, carga `.env`).

## 6. Manejo de errores

- ESPN caída/timeout/JSON inesperado → captura por fecha, loguea, cron reintenta en 2 min.
- Parseo defensivo: si falta `score`/`status` en un evento, se saltea ese evento (no escribe datos corruptos).
- `externalId` no poblado → el Match no se consulta (filtro `externalId != null`); espera el mapeo, sin error.
- Mapeo: equipo/fecha sin match → log y continúa.

## 7. Testing (Jest, ya presente en `apps/api`)

- `espn.util.ts`: tabla de estados (`pre`/`in`/`post`/postponed/canceled → MatchStatus).
- `espn.provider`: parseo de un JSON real de scoreboard (capturado) → `RemoteResult[]` correcto (id, score por homeAway, status). HTTP mockeado.
- `map-espn-ids` matching: con un set chico (1 grupo + 1 KO) verificar match correcto y reporte de no-matcheado.
- Regresión: los tests existentes de `calculatePoints`/scoring siguen pasando (no se toca).
- Smoke manual: correr `db:map-espn-ids` contra prod (revisar cobertura logueada); forzar el cron y verificar que un partido finalizado actualiza score + confirma picks + mueve ranking.

## 8. Config (env)

- `RESULTS_PROVIDER=espn` (default; `apifootball` disponible).
- `ESPN_SCOREBOARD_URL=https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world` (base override-able).
- `SPORTS_API_KEY` / `SPORTS_API_URL` → solo para el provider legacy de API-Football. Con ESPN, el cron deja de depender de esa key.
- Agregar las nuevas a `apps/api/.env.example` y declararlas en `render.yaml` (con default donde aplique).

## 9. Orden de ejecución (producción)

1. Deploy del backend con el provider ESPN + `RESULTS_PROVIDER=espn`.
2. Correr `pnpm db:map-espn-ids` contra la BD de prod (puebla `externalId`, reporta cobertura).
3. El cron (cada 2 min) empieza a actualizar resultados desde ESPN automáticamente.
4. Los ~8 partidos no cubiertos por ESPN se completan cuando ESPN los publique (re-correr el script) o a mano.
