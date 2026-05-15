# Changelog

Registro de cambios del monorepo fl-prode-app. Formato inspirado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [Unreleased]

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
