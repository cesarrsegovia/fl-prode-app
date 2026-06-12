# Ver el prode de un amigo (vista de solo-lectura en grupos)

**Fecha:** 2026-06-12

## Problema

Hoy cada usuario ve sus propios picks en las pantallas de edición (campeón, goleador,
clasificados R32, pronósticos por partido), pero no hay forma de ver el prode de **otro
miembro del grupo** en una sola pantalla. La gracia social del juego es comparar: "¿a
quién le va Beto de campeón?", "¿cómo viene su fecha?".

## Objetivo

Una vista de **solo-lectura** del prode completo de un miembro del grupo, accesible
desde la lista de miembros del grupo. Muestra en una sola pantalla:

- Campeón elegido
- Goleador elegido
- Clasificados a 16vos (R32)
- Resultados por fecha (picks de partido), con desglose de puntos por partido finalizado

## Modelo de visibilidad

Solo accesible para **co-miembros del mismo grupo** (se reusa el chequeo de membresía
de `matches.service.ts`).

| Pick | Visibilidad |
|------|-------------|
| Campeón | Siempre (apuesta de instinto, no se considera trampa) |
| Goleador | Siempre |
| Clasificados R32 | Siempre |
| Pick de un partido | Solo si **ese partido ya cerró**: `matchLeadDeadline(startTime) = startTime − 1h`. Partidos futuros → ocultos individualmente. |

**Umbral por partido, no por fecha.** Los partidos ahora cierran 1 hora antes de su
inicio (no por fecha completa). El revelado de cada pick de partido del amigo usa
`matchLeadDeadline` / `isMatchPredictionClosed` de `packages/shared/src/deadlines.ts`.

### Bug a corregir de paso

`apps/api/src/modules/matches/matches.service.ts:79` todavía calcula el cierre con el
criterio viejo (`match.fixture.closeAt <= new Date()`), es decir cierre por fecha
completa. Debe migrarse al cierre por partido (`matchLeadDeadline(match.startTime)`),
coherente con el resto del sistema. Esto afecta el endpoint existente `groupPicks`.

## Backend — endpoints nuevos

Todos requieren JWT y validan que el solicitante y el `userId` objetivo **compartan al
menos un grupo** (helper nuevo `assertSharesGroup(requesterId, targetUserId)` en un
lugar reutilizable, p.ej. en `grupos.service` o un guard/util compartido).

Patrón espejo de los `*/me` ya existentes, pero con `:userId`:

1. `GET /tournaments/:id/bracket-pick/user/:userId` → campeón del usuario (siempre visible).
2. `GET /tournaments/:id/top-scorer-pick/user/:userId` → goleador (siempre visible).
3. `GET /tournaments/:id/r32-picks/user/:userId` → clasificados R32 (siempre visibles).
4. `GET /users/:userId/predictions?cursor=&take=` → historial de picks por partido del
   usuario, **filtrando los partidos aún no cerrados** (`startTime − 1h > now`). Mismo
   shape que `/users/me/predictions` (`PredictionHistoryItem`). La paginación se mantiene.

Los services de tournaments ya tienen `getMyBracketPick(id, userId)` etc.; los métodos
nuevos reutilizan la misma query cambiando el `userId` y aplicando el guard de grupo
en el controller (los picks de torneo son "siempre visibles", así que no filtran por
deadline). Solo el endpoint de historial (4) aplica el filtro por partido.

## Frontend

### Acceso
En la pestaña **Miembros** del grupo (`grupos/[id]/page.tsx`, componente `MembersList`),
cada miembro tiene un acceso "ver prode" que navega a una ruta nueva.

### Ruta
`apps/web/src/app/(main)/grupos/[id]/miembro/[userId]/page.tsx` — el `groupId` en la URL
permite al backend validar la pertenencia compartida sin ambigüedad.

### Layout (secciones apiladas, solo-lectura)
1. **Header**: avatar + nombre del miembro, "Su prode".
2. **Campeón + Goleador**: dos cards lado a lado (reusar estilo de `FeaturedPickCard`).
3. **Clasificados R32**: grilla de banderas (reusar presentación de `R32PicksCard` en modo lectura).
4. **Resultados por fecha**: lista agrupada por fecha (reusar fila tipo `mis-pronosticos`),
   con los partidos futuros omitidos. Cada partido finalizado muestra a la derecha el
   **desglose de puntos** (ver abajo).

### Desglose de puntos por partido (en mi vista y en la del amigo)
En cada card de partido **finalizado**, a la derecha se extiende el desglose de cómo se
sumaron los puntos de ese partido. Se **deriva en el front** a partir de los datos que
ya vienen en `PredictionHistoryItem` (no requiere cambios de cálculo en backend), usando
las constantes de `@prode/shared`:

- `POINTS_CORRECT_RESULT = 3` (acertó ganador/empate)
- `POINTS_EXACT_SCORE = 2` (bonus marcador exacto)
- `CAPTAIN_MULTIPLIER = 2` (si fue capitán, ×2 sobre el subtotal)

Helper puro nuevo (testeable): `pointsBreakdown(prediction, match)` → devuelve
`{ winner: number, exact: number, captainBonus: number, total: number }`. El `total`
debe coincidir con `pointsEarned` que ya trae el backend (se usa como verificación).
Se aplica el mismo componente de desglose en `mis-pronosticos` (mi vista) y en la vista
del amigo.

## Componentes y unidades

- `pointsBreakdown` (lib puro, con tests) — única fuente del desglose.
- `<PointsBreakdown />` — presentación del desglose, compartida entre ambas vistas.
- Endpoints de lectura por `:userId` — espejo de los `/me`.
- `assertSharesGroup` — guard de visibilidad reutilizable.

## Testing

- `pointsBreakdown`: tests unitarios — solo ganador (3), ganador+exacto (5), fallado (0),
  capitán ×2, verificación de que `total === pointsEarned`.
- Filtro de visibilidad del historial: el endpoint omite partidos con `startTime − 1h > now`.
- Guard `assertSharesGroup`: rechaza a quien no comparte grupo.

## Fuera de alcance (YAGNI)

- Vista propia "unificada" (el usuario ya ve lo suyo en las pantallas de edición).
- Acceso desde el ranking del grupo (solo desde lista de miembros en v1).
- Comentarios / reacciones sobre el prode ajeno.
