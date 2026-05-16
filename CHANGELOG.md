# Changelog

Registro de cambios del monorepo fl-prode-app. Formato inspirado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [Unreleased]

### Fase 4 — Mundial 2026 (Backend, 2026-05-16)

Hito grande: **schema reescrito** para soportar torneos internacionales con grupos + eliminatorias, e **importador desde API-Football**.

#### Schema (BREAKING — requiere `pnpm db:reset`)
- Nuevos modelos:
  - `Tournament` (reemplaza `Season`): name, type (LEAGUE|CUP|INTERNATIONAL), startDate/endDate, logoUrl, trophyUrl, externalId.
  - `TournamentGroup`: grupos A→L del Mundial.
  - `Team`: entidad real (antes era string), con flagUrl, code, confederation, colores.
  - `TournamentTeam`: mapea qué equipos juegan qué torneo y en qué grupo.
  - `Venue`: estadios con capacidad, ciudad, coords, imagen.
  - `Player` + `SquadEntry`: plantillas por torneo/equipo.
  - `GroupStanding`: cache de tablas de grupo (recalculable).
  - `BracketPick`: predicción de campeón del torneo (bonus al final).
- `Match` enriquecido: `stage` (GROUP/R32/R16/QF/SF/3RD/FINAL), `groupId`, `venueId`, FK a Team con `homeTeamId`/`awayTeamId` + denormalizado `homeTeamName`/`awayTeamName` (sirve para placeholders pre-bracket tipo "Ganador Grupo A"), `homeScoreET`/`awayScoreET`/`homePens`/`awayPens` para alargue y penales.
- `Fixture` se queda como "matchday" (round 1-3 grupos, 4 R32, 5 R16, 6 QF, 7 SF, 8 3rd, 9 Final) con `name` legible.
- `GroupScore.seasonId` → `tournamentId`.
- Seed limpiado: solo admin + achievements + achievement nuevo `BRACKET_CHAMPION`. Sin Liga Argentina.

#### Importador (`pnpm db:import-worldcup`)
- Servicio `WorldCupImporterService` ([apps/api/src/modules/importer/worldcup-importer.service.ts](apps/api/src/modules/importer/worldcup-importer.service.ts)) consume API-Football v3 (`league=1`, `season=2026`).
- Cliente HTTP tipado `ApiFootballClient`.
- CLI standalone `apps/api/prisma/import-worldcup.ts` carga `.env` manualmente (sin dependencia extra de dotenv).
- Endpoint admin: `POST /api/tournaments/worldcup/import` (alternativa al CLI).
- Etapas: tournament metadata → teams (48) → standings/grupos → tournament-team links → venues (~16) → fixtures (matchdays) → matches (104) → squads (opcional via `IMPORT_SQUADS=1`).
- **Idempotente**: re-ejecutar no duplica.
- ~7 requests sin plantillas, ~55 con plantillas (cabe en el free tier de 100/día).

#### Nuevos endpoints públicos
- `GET /api/tournaments` — lista
- `GET /api/tournaments/active` — torneo activo (Mundial una vez importado)
- `GET /api/tournaments/:id/groups` — grupos con standings + equipos
- `GET /api/tournaments/:id/schedule` — calendario completo por matchday
- `GET /api/tournaments/:id/teams` — selecciones del torneo
- `GET /api/tournaments/:id/venues` — estadios
- `GET /api/tournaments/:id/bracket` — partidos de eliminación

#### Quality (pasada `simplify`)
- Util `statusFromApiFootball()` extraído ([apps/api/src/common/utils/api-football.util.ts](apps/api/src/common/utils/api-football.util.ts)); usado por ambos `ResultadosService` y `WorldCupImporterService`.
- `ResultadosService.fetchAndUpdateResults()` ahora **batchea** (`ids=1-2-3`) con chunks de 20 → 1 req cada 20 partidos en vez de 1×N. Lógica extraída a `applyRemoteResult()` reusable.
- Upserts del importer deduplicados: `data` object compartido entre `update` y `create`.
- Loops independientes paralelizados con `Promise.all`/`Promise.allSettled`: teams, venues, standings, matches, squads. Import de ~104 partidos pasa de secuencial a en paralelo.
- Fix de correctness: `teamByExternal.get(...) ?? ''` reemplazado por skip + warning (antes podía crear standings con `teamId` vacío).
- `importWorldCup2026` split en 7 métodos privados con un `ImportContext` que viaja entre etapas.

#### Migración a aplicar
```bash
pnpm db:reset                                       # destructivo: dropea Liga Argentina
# (opcional) export SPORTS_API_KEY=...
pnpm db:import-worldcup                             # sin plantillas
IMPORT_SQUADS=1 pnpm db:import-worldcup             # con plantillas (48 reqs más)
```

### Fase 3 — Frontend conectado (2026-04-23)

#### Added
- `lib/endpoints.ts` con helpers tipados para `fixtures`, `pronosticos`, `grupos`, `ranking`, `notificaciones`. Todos consumen el mismo `apiClient` (el que inyecta el JWT desde NextAuth).
- `MatchCard` funcional ([apps/web/src/components/prode/MatchCard.tsx](apps/web/src/components/prode/MatchCard.tsx)): selector 1/X/2 controlado, marcador exacto opcional, flag de capitán, deshabilitado para partidos LIVE/FINISHED/CANCELLED.
- `ProdeForm` funcional ([apps/web/src/components/prode/ProdeForm.tsx](apps/web/src/components/prode/ProdeForm.tsx)): hidrata con pronósticos del usuario, selector único de capitán con desmarcado automático, guardado por partido o en bloque, countdown y barra de progreso.
- `RankingTable` funcional con loading skeleton, highlight del usuario actual y badge de racha.
- `GroupCard` funcional: link a detalle, badge de rol ADMIN, conteo de miembros.
- Páginas reconstruidas con datos reales:
  - `/prode` — lista `GET /fixtures/active` con countdown.
  - `/prode/[fechaId]` — consume `GET /fixtures/:id` + `GET /pronosticos/me/:fechaId`, renderiza `ProdeForm`.
  - `/prode/[fechaId]/resultados` — desglose punto por partido: resultado real vs pronóstico, bonus de marcador exacto, multiplicador de capitán, total.
  - `/ranking` — toggle Global / Grupos del usuario con `useRanking`. Actualización automática al recibir `RANKING_UPDATE` por WebSocket.
  - `/grupos` — lista `GET /grupos/mine`, forms inline para crear grupo y unirse con código.
- Hook `useNotifications` que se suscribe a `NOTIFICATION_NEW` y mantiene `useNotificacionStore` sincronizado.

#### Changed
- `useRealtimeStore.connect` ahora recibe `userId` y emite `JOIN_USER_ROOM` al conectar (necesario para recibir `NOTIFICATION_NEW` y `PREDICTION_UPDATED`).
- `RealtimeProvider` pasa `session.user.id` a `connect`.
- `useRanking` se reescribió sobre `lib/endpoints` y se auto-refresca al recibir `RANKING_UPDATE`.
- `lib/axios.ts` quedó como shim de compatibilidad que re-exporta `apiClient` — evita dos instancias con bases distintas.

#### Removed (mocks)
Se eliminaron los datos hardcodeados de:
- Página `/prode` (River/Boca, Racing/Independiente, San Lorenzo/Huracán inventados).
- Página `/grupos` ("La Scaloneta", "Oficina Central", etc. inventados).
- Página `/ranking` ("Koke_10", "Lucía Sanz", "S. Ramos" inventados y porcentajes ficticios).

#### Pendiente en Fase 3 (para próxima tanda)
- `/home` todavía tiene datos hardcodeados (grupos destacados, actividad reciente).
- `/perfil/[userId]` sigue siendo stub.
- Landing `/` tiene estadísticas marketing sin backend (no prioritario).
- Chat de grupo, feed social, admin panel.

### Fase 2 — Backend completo (2026-04-23)

#### Added — Autorización
- `AdminGuard` ([apps/api/src/common/guards/admin.guard.ts](apps/api/src/common/guards/admin.guard.ts)) exige `User.isAdmin = true`.
- `GroupMemberGuard` ([apps/api/src/common/guards/group-member.guard.ts](apps/api/src/common/guards/group-member.guard.ts)) verifica membresía del grupo indicado en `:id`/`:groupId`. Combinado con `@Roles(Role.ADMIN)` exige además rol de admin intra-grupo.
- Decorator `@Roles(...)` ([apps/api/src/common/decorators/roles.decorator.ts](apps/api/src/common/decorators/roles.decorator.ts)) para anotar handlers.
- Campo `User.isAdmin: Boolean @default(false)` en schema.

#### Added — DTOs con `class-validator`
- Grupos: `CreateGrupoDto`, `UpdateGrupoDto`, `JoinGrupoDto`, `UpdateMemberDto`.
- Usuarios: `UpdateUserDto` (username, bio, avatarUrl validados).
- Fixtures: `CreateFixtureDto` (con matches anidados), `UpdateFixtureDto`, `UpdateMatchDto`.

#### Added — Endpoints
- **Grupos**:
  - `GET /api/grupos/mine` — mis grupos con conteo de miembros.
  - `PATCH /api/grupos/:id` — editar grupo (admin del grupo).
  - `DELETE /api/grupos/:id` — eliminar grupo (admin).
  - `POST /api/grupos/:id/invite/regenerate` — regenera inviteCode (admin).
  - `PATCH /api/grupos/:id/members/:userId` — cambiar rol de miembro (admin).
  - `DELETE /api/grupos/:id/members/:userId` — expulsar miembro (admin).
  - `POST /api/grupos/:id/leave` — salir del grupo.
  - Protección: siempre conserva al menos un admin.
- **Fixtures (admin-only)**:
  - `POST /api/fixtures`, `PATCH /api/fixtures/:id`, `DELETE /api/fixtures/:id`.
  - `PATCH /api/fixtures/matches/:matchId` — editar partido (marcador, status, externalId).
  - `GET /api/fixtures/upcoming?limit=N` público.
- **Predicciones**:
  - `GET /api/pronosticos/me` — fechas donde el usuario ya cargó pronósticos.
  - `DELETE /api/pronosticos/:id` — borrar pronóstico antes del cierre.
  - Validaciones extra: el match debe pertenecer a la fecha, el match debe estar `PENDING`, y al marcar capitán se desmarca el anterior automáticamente.

#### Added — Realtime y notificaciones
- `WebsocketModule` global; `EventsGateway` expone `emitToUser`, `emitToGroup`, `emitToAll` y una room por usuario (`JOIN_USER_ROOM`).
- Eventos nuevos en `@prode/shared`: `JOIN_USER_ROOM`, `NOTIFICATION_NEW`, `PREDICTION_UPDATED`.
- `NotificacionesService.create` / `createMany` persisten y emiten push realtime al user.
- `ResultadosService`:
  - Emite `MATCH_SCORE_UPDATE` cuando cambia el marcador y `MATCH_STATUS_CHANGE` al cambiar el estado.
  - Tras recalcular puntos: crea notificaciones `RESULT_CALCULATED` por usuario afectado y emite `RANKING_UPDATE` global + por grupo.
- `PronosticosService` emite `PREDICTION_UPDATED` al user.
- Cron `handleFixtureClosingNotifications` cada 15 min: manda `FIXTURE_CLOSING` (idempotente por `#fixtureId` en el mensaje) a usuarios sin pronóstico cuando faltan ≤60 min para el cierre.

#### Changed
- `GruposController.findOne` ahora protegido por `GroupMemberGuard` (antes era público).
- `UsuariosService.update` tipado y con manejo de conflicto en `username` (`P2002` → `409 Conflict`).

#### Fixed
- `PronosticosService.create` validaba sólo `closeAt`; ahora también chequea ownership matchId↔fixtureId y estado del partido.

#### Migraciones pendientes
- Correr migración con `User.isAdmin`:
  ```bash
  pnpm db:migrate --name add_admin_flag
  pnpm db:seed  # crea admin@prode.local / admin1234 (configurable via SEED_ADMIN_*)
  ```

### Fase 1 — Datos y estructura base (2026-04-23)

#### Added
- **Seed de base de datos** en `apps/api/prisma/seed.ts`
  - Catálogo de 5 achievements (`FIRST_PREDICTION`, `EXACT_SCORE`, `STREAK_5`, `STREAK_10`, `PERFECT_ROUND`) alineado con `GamificacionService`.
  - Temporada "Liga Profesional 2025" con 16 equipos reales argentinos.
  - 5 fechas × 8 partidos = 40 partidos. Las 2 primeras fechas se siembran como `FINISHED` con marcadores random para poder probar scoring y rankings end-to-end; las 3 siguientes quedan `PENDING` para pronosticar.
  - Idempotente: se puede reejecutar sin duplicar datos.
- `externalId` (unique, nullable) en modelos `Season` y `Match` para mapear contra API-Football sin colisionar con los cuids internos.
- Restricción `@@unique([seasonId, round])` en `Fixture` para evitar fechas duplicadas.
- Scripts `db:seed` y `db:reset` en el root y en `apps/api` (integración con `prisma.seed` para que `prisma migrate reset` los ejecute automáticamente).
- URL base de api-sports.io y documentación en `apps/api/.env.example`.

#### Fixed
- **Bug crítico** en `ResultadosService.fetchAndUpdateResults()` ([apps/api/src/modules/resultados/resultados.service.ts](apps/api/src/modules/resultados/resultados.service.ts)): el cron usaba el cuid interno de `Match` como ID de fixture de API-Football, por lo que nunca podía matchear resultados. Ahora filtra por `externalId IS NOT NULL` y consulta con ese valor.

#### Migraciones pendientes
- Aplicar migración nueva con los campos `externalId` y la unique de `Fixture`:
  ```bash
  pnpm db:migrate --name add_external_ids
  pnpm db:seed
  ```
