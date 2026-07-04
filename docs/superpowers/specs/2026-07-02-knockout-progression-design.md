# Automatización del avance de llaves eliminatorias — Diseño

**Fecha:** 2026-07-02
**Estado:** aprobado (opción A)

## Problema

La propagación de ganadores entre rondas de eliminación ya existe
(`knockout-advance.ts` + `TournamentsService.propagateKnockoutResult`), pero
**no funciona en producción**: los placeholders ("Ganador R32-3") se resuelven
al `externalId` sembrado (`wc-r32-03`) y el script `db:map-espn-ids` pisó esos
IDs en prod con los event ids de ESPN (`760486`, …). El matching
`ref.sourceExternalId !== finished.externalId` nunca da verdadero y las llaves
de 8vos no se rellenan, pese a que en ESPN ya hay 10/16 partidos de 16vos
terminados y 5 cruces de 8vos confirmados.

No se puede "volver" a los `externalId` `wc-*`: el poller necesita el event id
de ESPN en los partidos de eliminación porque su fallback por abreviaturas no
funciona con lados placeholder sin equipo. Conclusión: `externalId` cumple hoy
dos roles incompatibles (id del provider + id estructural del bracket) y hay
que separarlos.

Segundo hueco: la carga manual de resultados por el admin
(`PATCH fixtures/matches/:id` → `FixturesService.updateMatch`) no dispara
scoring ni propagación ni campeón — solo el poller lo hace.

## Diseño

### 1. Columna estable `Match.code`

- `code String?` en el modelo `Match` + `@@unique([tournamentId, code])`.
- Guarda el id de siembra del JSON (`wc-r32-03`, `wc-qf-01`, …). **Nada lo
  pisa jamás**; `externalId` queda como id del provider (rol legítimo de
  `db:map-espn-ids`).
- Seed/importer (`worldcup-importer.service.ts`, `import-worldcup.ts`) setean
  `code` con el id del JSON para todos los partidos.
- Migración con backfill SQL para BDs donde `externalId` aún es de siembra:
  `UPDATE "Match" SET code = "externalId" WHERE "externalId" LIKE 'wc-%'`
  (cubre dev; prod se repara con el relink del punto 3).

### 2. Propagación por `code`

- `parseAdvancePlaceholder` no cambia (sigue devolviendo `wc-r32-03`), pero el
  campo del resultado se renombra `sourceExternalId` → `sourceCode`.
- `propagateKnockoutResult` compara contra `finished.code` (antes
  `finished.externalId`).
- `handleKnockoutFinished` y `propagateAllKnockoutResults` cargan y pasan
  `code` (agregarlo al select de `fetchAndUpdateResults` /
  `ActiveMatchWithTeams`).

### 3. Endpoint admin de relink: `POST :id/bracket/relink-codes`

Repara BDs existentes (prod) donde `code` es null y `externalId` ya fue pisado:

- Lee `prisma/data/worldcup-2026.json` (se despliega con la API).
- Para cada partido KO del JSON, busca el match en BD por
  `(tournamentId, stage, startTime más cercano)` con tolerancia acotada
  (±36 h, cubre correcciones de horario de `db:fix-match-times`).
- **Aborta con error** (sin escribir nada) si dos entradas del JSON mapean al
  mismo match de BD o si alguna no encuentra candidato — nunca asigna códigos
  ambiguos.
- Idempotente: si `code` ya coincide, no escribe.
- La lógica de matching es una función pura testeada aparte; el service solo
  orquesta DB.
- Guard admin, igual que `POST :id/knockout/propagate`.

### 4. Hook de carga manual (`FixturesService.updateMatch`)

Cuando el update hace que un partido pase a `FINISHED` (transición, no estado
previo), disparar la misma cadena que el poller:

- `calculatePoints(fixtureId)` (scoring de predicciones del fixture).
- Si es fase de grupos: `refreshGroupStandings`.
- Si es eliminación: propagación (+ campeón si es la FINAL), reutilizando la
  lógica de `handleKnockoutFinished` extraída/expuesta para ambos callers.
- En try/catch como el poller: un fallo de propagación no debe romper el PATCH.
- Ojo a dependencias de módulos NestJS (Fixtures ↔ Resultados/Tournaments):
  si hace falta, `forwardRef` o mover el orquestador post-FINISHED a un
  service compartido.

### 5. Operación de reparación en prod (post-deploy)

1. Deploy de la API con los cambios.
2. `POST :id/bracket/relink-codes` → asigna `code` a los 32 partidos KO.
3. `POST :id/knockout/propagate` (existente, ahora funcional) → rellena los
   cruces de 8vos ya definidos (incluye los ganados por penales:
   `knockoutWinnerSide` ya los resuelve con `homePens/awayPens`, que el
   provider ESPN captura vía `shootoutScore`).
4. De ahí en más, 4tos/semis/3º puesto/final avanzan solos con el poller, y la
   final dispara `setTournamentChampion` → scoring de BracketPicks.

El usuario ejecuta los endpoints (opción elegida: deploy + endpoint admin, sin
scripts directos contra la BD de prod).

## Errores y casos borde

- Empate sin penales cargados → `knockoutWinnerSide` devuelve `null` y no se
  propaga (comportamiento actual, correcto: se propaga cuando lleguen los
  penales en el próximo poll o carga manual).
- Partido KO sin `code` (relink no corrido) → propagación lo ignora en
  silencio, igual que hoy con `externalId` null. El endpoint de relink loguea
  cuántos asignó para verificar cobertura.
- Re-corrida de `db:map-espn-ids` → inocua: no toca `code`. Se agrega un
  comentario en el script dejándolo explícito.

## Testing

- `knockout-advance.spec.ts`: renombre `sourceCode` (sin cambio de lógica).
- Propagación: caso "externalId de ESPN + code de siembra" (el bug de prod).
- Matcher de relink (función pura): match exacto, tolerancia de horario,
  colisión → error, JSON sin candidato → error, idempotencia.
- `updateMatch`: transición a FINISHED dispara la cadena; update sin
  transición no dispara; fallo de propagación no rompe el PATCH.

## Addendum (hallazgo en review final)

La resolución de **terceros de R32** (`fillR32Matches` → `resolveSide`) tenía la
MISMA clase de bug: leía `thirdAssign[m.externalId]`, pero `r32ThirdsAssignment`
está keyed por el id de siembra (`wc-r32-03`, ver `R32_THIRD_SLOTS`), que en
prod es `code` — no `externalId` (pisado por `db:map-espn-ids`). Se migró esa
ruta a `m.code`. `syncR32FromEspn` NO tiene el bug: usa `externalId` como id del
proveedor (rol legítimo) para traer las llaves oficiales de ESPN por
abreviatura.

## Giro de diseño: ESPN como fuente autoritativa de cruces (post-implementación)

Al desplegar en prod se descubrió que **el cableado de la llave en
`worldcup-2026.json` NO coincide con la llave oficial de FIFA**: los placeholders
"Ganador R32-N vs Ganador R32-M" emparejan los partidos equivocados, porque la
numeración cronológica del seed difiere de la numeración de ESPN (ej.: ESPN dice
que Suiza juega contra "R32-15 winner" = ganador de Colombia-Ghana, pero en el
seed `wc-r32-15` = Argentina). La propagación por placeholders del seed —aunque
el código funcione— produce cruces incorrectos, y no se puede reparar remapeando
números.

**Solución adoptada:** `ResultadosService.syncKnockoutFromEspn(tournamentId?)`
—generalización de `syncR32FromEspn` a todas las rondas KO— sincroniza los
equipos de cada cruce desde ESPN por `externalId` (id real del evento). Solo
escribe un lado cuando ESPN trae el equipo real; deja los lados pendientes
intactos. El poller (`handleKnockoutFinished`) ahora llama a este sync en vez de
`propagateKnockoutResult`. La propagación por placeholders + `relink` + `code`
quedan como fallback admin, pero el camino automático es ESPN. Endpoint admin:
`POST resultados/sync-knockout-espn`.

## Notas operativas (prod)

- **No re-seedear en prod** tras el remap: el seeder upserta por `externalId`;
  con `externalId` ya remapeado no encuentra las filas y crearía Match
  duplicados. Reparar con `POST :id/bracket/relink-codes`, nunca re-seed.
- **Penales cargados a una FINAL ya FINISHED**: la carga manual no re-dispara la
  cadena (la transición a FINISHED ya ocurrió). Fijar el campeón con
  `PATCH :id/champion` (endpoint existente).

## Fuera de alcance

- Vínculos FK estructurales entre partidos (opción B, descartada por YAGNI).
- UI admin nueva: se usan los endpoints existentes + el nuevo relink.
- Scoring del 3er puesto (no existe como producto).
