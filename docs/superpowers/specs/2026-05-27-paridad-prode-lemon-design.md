# Diseño: Paridad de features con Prode Lemon

**Fecha:** 2026-05-27
**Estado:** Aprobado (diseño) — pendiente de plan de implementación
**Autor:** brainstorming asistido (Claude + cesarrsegovia)

## Contexto

Se analizaron 19 capturas de la app de referencia **Prode Lemon** (un prode del Mundial 2026
en el que el usuario participa) y se compararon contra el estado actual de `fl-prode-app`
(monorepo Next.js web + NestJS api + Prisma). El objetivo es cerrar los gaps de features para
alcanzar paridad funcional con la referencia.

El torneo activo es **Mundial 2026** (`Próximo`, aún sin partidos puntuados, ~6900 participantes),
por lo que los cambios de scoring y los recálculos de ranking son de bajo riesgo: prácticamente
no hay datos puntuados que migrar.

## Gaps detectados (resumen)

| # | Feature de la referencia | Estado actual |
|---|--------------------------|---------------|
| 1 | Predicción de **Goleador** (15 pts, jugador + posición) | ❌ No existe |
| 2 | **FAQ / Preguntas Frecuentes** con las reglas | ❌ No existe |
| 3 | **Desempate visible** + sub-stats por fila de ranking | ⚠️ Solo `total` + `streak` |
| 4 | **Card de progreso** + **tabs de filtro** en Predicciones | ⚠️ Solo barra simple en el form |
| 5 | **Chips de alerta** en el home del torneo | ❌ No existe |
| 6 | Empty state **"Todo al día"** | ❌ No existe |

Diferencia de scoring detectada: la app daba **6 pts** por exacto (3 ganador + 3 exacto);
Prode Lemon usa **5** (3 + 2). Se alinea a Lemon.

## Decisiones de diseño (acordadas)

- **Alcance:** un único spec con 6 módulos independientes, implementados en orden de dependencias
  (Enfoque A: monolito modular — schema + scoring primero, luego Goleador, luego UI; una sola
  migración de Prisma agrupando todos los cambios de tablas).
- **Scoring:** acertar ganador **+3**, resultado exacto **+2** (total **5**). Capitán mantiene ×2.
- **Predicciones especiales:** Campeón = **15 pts**, Goleador = **15 pts**.
- **Goleador:** build completo (modelo + API + UI) con **empty state** "Lista de jugadores
  próximamente" cuando aún no hay `SquadEntry` cargado. El **admin marca el goleador ganador**
  (no se calcula por goles acumulados).
- **Desempate:** contadores denormalizados en `GroupScore` + 4º criterio = **fecha de la primera
  predicción** (quien predijo antes desempata).
- **Tabs de filtro:** los 5 de Lemon — Pendientes / Predichos / En Vivo / Resultados / Goleadores.
- **i18n:** todo el texto nuevo (FAQ, labels, empty states) pasa por next-intl cookie-based,
  respetando el approach existente (sin renombrar rutas).

## Arquitectura por módulos

### Módulo 1 — Scoring alignment (backend, base)

- `packages/shared/src/constants`: `POINTS_EXACT_SCORE` 3 → **2**. Agregar `POINTS_CHAMPION = 15`
  y `POINTS_TOP_SCORER = 15` (si el campeón ya tiene constante, ajustarla a 15).
- Verificar en `apps/api/src/modules/resultados/resultados.service.ts` que el cálculo quede:
  ganador correcto `+3`, exacto `+2` adicional (exacto ⇒ ganador correcto, total 5),
  capitán `×2`.
- **Dependencia:** este módulo y el Módulo 2 tocan el mismo servicio de puntuación → se
  implementan juntos.

### Módulo 2 — Contadores de desempate (backend + schema)

- **Schema** (`GroupScore`): agregar
  - `correctWinners Int @default(0)`
  - `exactScores Int @default(0)`
  - `exactGoalsSum Int @default(0)`
  - `firstPredictionAt DateTime?`
- **Servicio de puntuación:** al calcular cada partido, incrementar:
  - `correctWinners += 1` si acertó el ganador/empate
  - `exactScores += 1` si acertó el resultado exacto
  - `exactGoalsSum += (homeScore + awayScore)` cuando el pronóstico es exacto
  - setear `firstPredictionAt` con la fecha de la primera predicción del usuario en ese torneo
    (si aún es null)
- **Orden del ranking:** `total ↓, correctWinners ↓, exactScores ↓, exactGoalsSum ↓, firstPredictionAt ↑`.
- **Recálculo:** script idempotente que recomputa los contadores desde `Prediction`. Hoy es
  trivial (0 partidos puntuados), pero queda como red de seguridad.
- **UI ranking** (`RankingTable`): cada fila muestra los 3 sub-stats con íconos
  (✓ acertados · 🎯 exactos · ⚽ suma goles), como la referencia.

### Módulo 3 — Goleador / Top Scorer (full-stack)

- **Schema:**
  - Nuevo modelo `TopScorerPick { id, userId, tournamentId, playerId, pointsEarned Int?,
    createdAt, updatedAt, @@unique([userId, tournamentId]) }` con relaciones a `User`,
    `Tournament`, `Player`.
  - `Tournament`: agregar `topScorerPlayerId String?` (goleador ganador, lo setea el admin)
    y `topScorerDeadline DateTime?`.
- **API:**
  - `GET` jugadores del torneo vía `SquadEntry` (agrupables por equipo/posición).
  - `GET`/`PUT` del pick del usuario (rechaza cambios pasado `topScorerDeadline`).
  - Endpoint admin para setear `topScorerPlayerId`.
  - Al resolver: otorgar `POINTS_TOP_SCORER` (15) a los picks acertados y sumarlos al `GroupScore`.
- **Web:**
  - Card "Tu Goleador" (valor en pts + deadline) en la página de Predicciones.
  - Pantalla/selector de jugador agrupado por equipo y posición.
  - **Empty state** "Lista de jugadores próximamente" cuando no hay `SquadEntry` para el torneo;
    la feature queda lista para activarse al sembrar jugadores.
- **i18n:** keys para labels, card y empty state.

### Módulo 4 — FAQ / Preguntas Frecuentes (frontend + i18n)

- Componente `FaqModal` (acordeón) disparado por el botón **(?)** del header (ya presente en las
  pantallas de la app).
- Contenido (~10 preguntas de la referencia), **localizado**, con valores reales del proyecto:
  - ¿Cómo funciona el sistema de puntos? (ganador +3, exacto +2, total 5)
  - ¿Qué significa acertar el ganador?
  - ¿Qué significa resultado exacto?
  - ¿Qué es la predicción de campeón? (15 pts, deadline)
  - ¿Qué es la predicción de goleador? (15 pts, deadline)  ← agregado vs. la referencia
  - ¿Hasta cuándo puedo hacer mis predicciones?
  - ¿Puedo cambiar mi predicción?
  - ¿Cómo funcionan los grupos privados?
  - ¿Qué pasa si no hago predicción en un partido?
  - ¿Qué pasa con el tiempo extra y los penales?
  - ¿Cómo se desempata si dos jugadores tienen los mismos puntos? (con tabla de ejemplo y el
    orden real: puntos → acertados → exactos → suma goles → fecha de predicción)
- Disponible desde el botón (?) en headers de Ranking, Predicciones y Torneo.

### Módulo 5 — Card de progreso + tabs de filtro (frontend, página Predicciones)

- **Card de progreso:** "X de N pronosticados", "N−X pendientes", "% completo" + barra de progreso.
- **Tabs de filtro:** Pendientes / Predichos / En Vivo / Resultados / Goleadores. (El tab
  "Goleadores" lleva a la sección de predicción de goleador.)
- **Sub-tabs por fecha** (Grupos – Fecha 1/2/3, etc.) reutilizando los fixtures existentes.
- **Cards destacadas** "Tu Campeón" / "Tu Goleador" arriba (pts + deadline).
- **Empty state** "¡Todo al día!" cuando todos los partidos próximos están pronosticados.

### Módulo 6 — Chips de alerta en el home del torneo (frontend)

- Chips clickeables que aparecen **solo cuando falta** algo:
  - "N partidos sin pronosticar" → lleva a Predicciones
  - "Falta tu campeón" → lleva a selección de campeón
  - "Falta tu goleador" → lleva a selección de goleador
- Reutiliza los conteos de progreso del Módulo 5.

## Orden de implementación

1. **Módulos 1 + 2** (schema + servicio de puntuación + recálculo + UI ranking) — una migración.
2. **Módulo 3** (Goleador) — extiende schema y servicio de puntuación ya tocados.
3. **Módulos 4, 5, 6** (frontend: FAQ, progreso/tabs, chips) — dependen de los datos anteriores.

## Testing

- **Scoring (Mód. 1/2):** tests unitarios del servicio de puntuación — casos ganador-no-exacto
  (3), exacto (5), capitán sobre exacto (10), y verificación de incrementos de
  `correctWinners`/`exactScores`/`exactGoalsSum`.
- **Ranking (Mód. 2):** test de orden con empates que ejerciten cada criterio en cascada,
  incluido `firstPredictionAt`.
- **Goleador (Mód. 3):** tests de API (no permite pick pasado deadline, unicidad por usuario/torneo,
  otorga 15 pts al pick correcto al resolver) + empty state en la UI sin `SquadEntry`.
- **Frontend (Mód. 4/5/6):** tests de render — FAQ abre/cierra y muestra los valores correctos;
  card de progreso calcula % y pendientes; filtros segmentan correctamente; chips aparecen solo
  cuando falta algo y navegan al destino correcto.

## Fuera de alcance (YAGNI)

- Cálculo automático del goleador por goles acumulados (se usa marca manual del admin).
- Cambios al sistema de premios/USDT (la infra backend ya existe; el card de premio no se
  modifica salvo que se confirme lo contrario).
- Achievements, stats en vivo / comentarios de partido.

## Notas / riesgos

- El cambio de `POINTS_EXACT_SCORE` impacta cualquier test existente que asuma 6 pts por exacto:
  actualizarlos como parte del Módulo 1.
- Los contadores denormalizados deben actualizarse **dentro de la misma transacción** que el
  cálculo de puntos para evitar inconsistencias.
- Confirmar durante el plan si el card "Premio del Torneo" y los sub-tabs por fecha ya existen
  parcialmente para no duplicar.
