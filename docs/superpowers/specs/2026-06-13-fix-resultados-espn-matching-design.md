# Fix: resultados automáticos no se registran (matching ESPN)

**Fecha:** 2026-06-13

## Problema

Los partidos no registran su resultado automáticamente. Ej: USA 4-1 Paraguay (12 jun)
quedó PENDING aunque ESPN ya lo tiene finalizado.

## Causa raíz (confirmada)

El cron (`resultados.cron.ts`, cada 2 min) llama `fetchAndUpdateResults`, que vincula
los eventos remotos a los partidos locales por `externalId`:

```ts
const local = byExternalId.get(r.externalId); // resultados.service.ts
```

Pero los partidos locales tienen `externalId` **sintético del seed** (`wc-m004`),
mientras el provider ESPN (default) devuelve el **event id de ESPN** (`760417`).
Nunca coinciden → ningún partido se actualiza vía ESPN. (CAN-BIH aparece finalizado
en prod porque se cargó manualmente desde el admin.)

Evidencia: ESPN `/scoreboard?dates=20260612` devuelve
`United States 4-1 Paraguay [STATUS_FULL_TIME] espnId=760417`, con
`competitor.team.abbreviation = USA/PAR` y `event.date = 2026-06-13T01:00Z`. Los
equipos locales tienen `shortName = USA/PAR` y `startTime = 2026-06-13T01:00:00Z`
(coincidencia exacta de horario).

Segundo desajuste: el cron consulta ESPN por el día UTC del `startTime` (`20260613`),
pero ESPN lista ese partido nocturno bajo `20260612`.

## Diseño

Matchear por **(abreviatura home, abreviatura away) + startTime exacto** en lugar de
depender solo del `externalId`. No requiere re-sembrar IDs.

### 1. `RemoteResult` (`providers/results-provider.ts`)
Agregar campos opcionales para habilitar el matching alternativo:
```ts
homeAbbr?: string | null;
awayAbbr?: string | null;
startTime?: string | null; // ISO del evento remoto
```
(API-Football no los puebla; sigue matcheando por `externalId`.)

### 2. ESPN provider (`providers/espn.provider.ts`)
- `parseScoreboard`: poblar `homeAbbr = home.team.abbreviation`,
  `awayAbbr = away.team.abbreviation`, `startTime = ev.date`.
- `fetchResults`: para cada partido activo consultar su día UTC **y el anterior y el
  siguiente** (día ±1), deduplicando fechas, para cubrir el desfase de zona horaria.

### 3. Matching en el service — función pura nueva
Crear `matchRemoteToLocal(local, remote)` en un módulo testeable
(`providers/match-remote.ts`). Para cada `RemoteResult`, encuentra el `ActiveMatch`
local correspondiente:

1. **Por externalId** (exacto) — cubre API-Football.
2. **Fallback por equipos + startTime** — si no hubo match por id: comparar
   `homeAbbr`/`awayAbbr` (case-insensitive) contra los `shortName` de los equipos del
   partido local, y `startTime` igual (mismo instante). Cubre ESPN.

El `ActiveMatch` debe incluir los shortName de ambos equipos para poder comparar, así
que se amplía su forma (y la query del service que lo arma).

`fetchAndUpdateResults` usa esta función en lugar de `byExternalId.get(...)`.

## Unidades

- `matchRemoteToLocal` — función pura, con tests (todo el riesgo está acá).
- ESPN provider — poblar abbr/startTime + fechas ±1.
- Service — usar la función de matching; ampliar `ActiveMatch` con shortNames.

## Testing

- `matchRemoteToLocal`: match por externalId; match por abbr+startTime; sin match
  (abbr distinta); sin match (startTime distinto); case-insensitive en abbr; preferir
  externalId sobre abbr cuando ambos aplican.

## Fuera de alcance

- Re-sembrar/backfill de externalId (no hace falta con el matching por equipos).
- Cambiar el provider por defecto.
- Corregir resultados ya cargados a mano (no se tocan).
