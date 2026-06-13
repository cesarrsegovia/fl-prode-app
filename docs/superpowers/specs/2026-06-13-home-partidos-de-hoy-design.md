# Home: partidos de hoy + quitar título

**Fecha:** 2026-06-13

## Objetivo

En el home (`apps/web/src/app/(main)/home/page.tsx`):
1. Quitar el título grande "El estadio es tuyo".
2. Agregar una sección **"Partidos de hoy"** entre el hero del torneo y el grid de
   próxima-fecha/ranking, con tarjetas en modo solo-lectura (equipos, horario,
   resultado si finalizó), sin opción de pronosticar.
3. Cada partido aún pronosticable muestra un botón **"Ir a pronósticos"** que lleva a
   `/prode/{fixtureId}`.

## Backend — `GET /matches/today`

Nuevo endpoint en el módulo `matches` (controller/service ya existen).

- Devuelve los partidos cuyo `startTime` cae **hoy** en la zona horaria de la app
  (`America/Argentina/Buenos_Aires`, igual que `MatchdayList`). Incluye jugados,
  en vivo y por jugar.
- Cada item incluye `fixtureId` (para el botón) y el mismo `include` que el schedule:
  `homeTeam, awayTeam, venue, group`. Ordenados por `startTime` asc.

Cálculo del rango "hoy": determinar el día calendario actual en la TZ de la app y
construir el rango `[inicioDía, finDía)` en UTC. Implementación: formatear `now` con
`Intl.DateTimeFormat('en-CA', { timeZone })` → `YYYY-MM-DD`; el inicio del día local
es ese día a medianoche en la TZ. Para no depender de librerías de TZ en el server,
se calcula el offset así:

```ts
const TZ = 'America/Argentina/Buenos_Aires';
function todayRangeUtc(now: Date): { gte: Date; lt: Date } {
  // Día calendario local (YYYY-MM-DD) en la TZ de la app.
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(now);
  // Medianoche local expresada en UTC: tomamos el instante "ymdT00:00" interpretado
  // en la TZ. Argentina es UTC-3 fijo (sin DST), así que medianoche local = 03:00 UTC.
  const startLocalUtc = new Date(`${ymd}T03:00:00.000Z`);
  const endLocalUtc = new Date(startLocalUtc.getTime() + 24 * 60 * 60 * 1000);
  return { gte: startLocalUtc, lt: endLocalUtc };
}
```

(Argentina no aplica horario de verano: offset fijo UTC-3. Esto se documenta en el
código; si en el futuro la TZ cambia, se revisita.)

Query Prisma:
```ts
this.prisma.match.findMany({
  where: { startTime: { gte: range.gte, lt: range.lt } },
  include: { homeTeam: true, awayTeam: true, venue: true, group: true },
  orderBy: { startTime: 'asc' },
});
```
Se expone `fixtureId` (campo del modelo Match) en la respuesta.

Controller: `@Get('today')` **antes** de `@Get(':id')` (orden de rutas Nest).

## Frontend

### Tipo y cliente
`MatchDto` no tiene `fixtureId`. Agregar en `server-endpoints.ts` (o donde se consuma)
un tipo `TodayMatchDto = MatchDto & { fixtureId: string }` y un método cliente
`matchesApi.today()` → `GET /matches/today`. El home es client component, así que se
consume vía `apiClient.get` como el resto de las llamadas del home.

### Quitar el título
Eliminar el `<h1>` con `t('heroLine1')`/`t('heroLine2')` (líneas ~102-104). El saludo
"HOLA, {name}" (`greeting`) se conserva.

### Sección "Partidos de hoy"
Ubicación: después del bloque del hero del torneo, antes del grid
`Próxima fecha + mi ranking`.

- Carga: agregar `matchesApi.today()` al `Promise.all` del `useEffect` del home.
- Render:
  - Si cargando → Skeleton.
  - Si hay partidos → grid/lista de tarjetas read-only. Reusar el componente `MatchRow`
    (`components/torneo/MatchRow.tsx`), que ya muestra equipos, hora y resultado y es
    solo-lectura. Pasar `href={false}` (no navegar la fila entera) y `showDate={false}`.
    Debajo o al costado de cada `MatchRow`, un botón "Ir a pronósticos" → `/prode/{fixtureId}`,
    visible **solo si el partido es aún pronosticable**: `startTime − 1h > now`
    (status PENDING y deadline futura).
  - Si no hay partidos hoy → mensaje "No hay partidos hoy" (sin ocultar la sección).

Nota sobre `MatchRow`: hoy linkea toda la fila a `/partido/{id}` por defecto; pasar
`href={false}` para que la fila no sea clickeable y el único CTA sea "Ir a pronósticos"
en los partidos abiertos.

### i18n (`home`, es/en/de/fr)
- `today.title` — "Partidos de hoy"
- `today.empty` — "No hay partidos hoy"
- `today.goToPredictions` — "Ir a pronósticos"

## Unidades

- `todayRangeUtc` (backend) — función pura del rango del día, testeable.
- `MatchesService.findToday` — query.
- Endpoint `GET /matches/today`.
- Sección de home + tipo/cliente `today()`.

## Testing

- `todayRangeUtc`: dado un `now`, devuelve `[medianoche local, +24h)` en UTC. Casos:
  un instante a mediodía UTC y uno cerca del borde del día local.
- El render del home no se testea unitariamente (UI); verificación visual.

## Fuera de alcance

- Auto-refresh en vivo de los partidos de hoy (se carga al montar).
- Mostrar pronóstico propio en la tarjeta (solo datos del partido).
- Cambiar `MatchRow`.
