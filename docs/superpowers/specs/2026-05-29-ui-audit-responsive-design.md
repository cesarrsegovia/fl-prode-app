# Auditoría UI + Plan de Responsive y Consistencia — fl-prode-app

**Fecha:** 2026-05-29
**Estado:** Aprobado para implementación por fases
**Objetivo principal:** Sitio totalmente responsive (mobile-first), corrigiendo en el camino inconsistencias de diseño, deuda de tokens, accesibilidad, duplicación de componentes y faltantes funcionales.

---

## 1. Contexto

App social de pronósticos de fútbol. Monorepo: Next.js 15 + React 19 + Tailwind CSS v4 + TypeScript en `apps/web`. Tema dark-first "Gold Imperius" (marca dorada `#e9ac36`). i18n con next-intl (es/en/de/fr). Estado con Zustand. 23 páginas, 46 componentes.

Una auditoría de los 5 dominios (layout/tokens, prode, torneo, grupos/ranking/perfil, admin) produjo ~135 hallazgos que se reducen a **6 problemas de raíz**.

### Decisiones tomadas (brainstorming)

- **Enfoque:** auditoría primero, luego implementar.
- **Alcance:** los 6 temas entran en implementación.
- **Dispositivos:** mobile-first (optimizar agresivo 360–414px, validar tablet/desktop después).
- **Estrategia:** Fundaciones primero → dominios con una sola pasada por archivo (migración tokens + responsive + a11y juntos) → faltantes funcionales.
- **Materialización:** este documento es el maestro; cada fase tiene su propio ciclo plan → implementación → revisión.

---

## 2. Estado actual del sistema de diseño

`globals.css` define DOS sets de tokens en paralelo:

| Concepto | Sistema NUEVO (objetivo) | Sistema LEGACY (a eliminar) |
|---|---|---|
| Superficies | `surface`, `surface-1/2/3` | `surface-container-lowest/low/high/highest` |
| Texto principal | `foreground` (`text-foreground`) | `text-white` (literal) |
| Texto tenue | `ink-muted`, `ink-dim` | `on-surface-variant` |
| Marca | `neon` + `primary-foreground` | `primary` + `text-black` (literal) |
| Error | `destructive` (`text-destructive`) | `text-red-400` (literal) |
| Bordes | `line`, `line-strong` | `outline-variant` |
| Acentos | `citrus`, `grass` (tokens) | `sky/violet/emerald/amber-400` (literales) |

Referencias correctas ya migradas: `home`, `perfil/[userId]`, `notificaciones`, `error.tsx`, `not-found.tsx`. Sirven de patrón.

---

## 3. Los 6 problemas de raíz

### 🔴 Tema 1 — Doble sistema de tokens

La mayor deuda de consistencia. 21 archivos usan tokens legacy.

**Datos:** `surface-container*` 56 usos / `on-surface-variant` 71 / `text-white` 35 / `text-red-*` 14 / `text-green-*` 0.

**Mayores concentradores:** `app/page.tsx` (~33), `(auth)/auth/page.tsx` (~24), `grupos/[id]/page.tsx` (~21), `grupos/page.tsx` (~21), `ranking/RankingTable.tsx` (~13), `launch/page.tsx` (~7), `ProdeForm.tsx`, `Chat.tsx`, `ActivityFeed.tsx`, `GroupCard.tsx`, `R32PicksCard.tsx`, `prode/[fechaId]/page.tsx`, `invitacion/[code]/page.tsx`, `Countdown.tsx`, `PositionBadge.tsx`, `EmptyState.tsx`.

**Problemas en `globals.css`:**
- Glow del `Button` default es VERDE hardcodeado (`rgba(69,252,155,…)`) — paleta neón anterior, no la dorada actual (`button.tsx:13`).
- `.bg-primary-gradient` es dorado pero el botón le aplica glow verde → choque de marca.
- 3 tonos de dorado distintos hardcodeados: `--brand`=#e9ac36=rgb(233,172,54) vs glows con rgb(240,194,75) vs `::selection` rgb(233,172,54) (`globals.css:179,181,237,277`).
- Bloque legacy completo mantenido como aliases (`globals.css:77-92, 150-165`).

**Otros literales fuera de sistema:** `border-l-sky/violet/emerald/amber-400` en `ActivityFeed.tsx:15-22` (mismo evento tiene color distinto que en notificaciones); `text-violet-400`/`bg-violet-500` en `R32PicksCard.tsx:290,323,332`; medallas hex `#FFD700/#C0C0C0/#CD7F32` en `PositionBadge.tsx`.

### 🔴 Tema 2 — Responsive

- **[alta] Safe-area iOS:** `BottomNav.tsx:39` sin `env(safe-area-inset-bottom)`; `layout.tsx:58` usa `pb-16` fijo; falta `viewport-fit=cover` en el viewport meta.
- **[alta] `MatchCard.tsx:124-181`:** 2 columnas `flex-1` + 3 botones `size-12` + `gap-4` ≈ 192px de ~288px útiles en 360px → nombres uppercase rompen. Sugerencia: `size-10 sm:size-12`, `gap-2 sm:gap-4`, `p-4 sm:p-5`.
- **[alta] `BracketTree.tsx:110-124`:** scroll horizontal ~1200-1700px sin fade/hint, sin conectores (no se lee como bracket), sin estado vacío, sin semántica (`div>div>div`).
- **[alta] Landing `page.tsx:12`:** `min-h-[921px]` fijo → usar `min-h-[100svh]`. `page.tsx:13`: glow `w-[600px]` puede desbordar (asegurar `overflow-hidden`).
- **[alta] Chat `Chat.tsx:66-68`:** `height: 70vh` (no `svh/dvh`) → input puede quedar tapado por BottomNav.
- **[alta] Tablas sin scroll:** `GroupStandings.tsx:115` y `FaqModal.tsx:45` sin `overflow-x-auto`.
- **[alta] Admin denso:** filas de `usuarios` (3 stats), `grupos` (4 stats), `partidos` (marcador inline de 8 elementos) no colapsan en móvil.
- **[alta] Navbar `px-6` vs páginas `px-4`** (desalineación 8px); admin también `px-6`.
- **[media] `resultados/page.tsx:125-138`** y `partido/page.tsx:95-152`: nombres de equipo sin `truncate`/`break-words` → desbordan con nombres largos.
- **[media] `TournamentHero.tsx:44`** y `seleccion:60`: `clamp(3rem,9vw,7rem)` sin `break-words`.
- **[media] Tabs admin `admin/layout.tsx:60-78`** dentro de `rounded-full` sin scroll.

### 🟠 Tema 3 — Accesibilidad

- Dropdowns (`Navbar` menú usuario, `LanguageSwitcher`) sin `aria-expanded`/`aria-haspopup`/`role="menu"`/Escape/foco.
- Botones de selección sin `aria-pressed`: 1/X/2 (`MatchCard:146`), picks de equipo (`BracketPickCard:133`, `TopScorerPickCard:155`, R32), tabs de filtro (`PredictionsFilterTabs:36`).
- Inputs sin `<label>` asociado: marcadores (`MatchCard:189`), auth (`auth:129-166`), grupos (`grupos:137-151`), chat (`Chat:137`), select capitán (`ProdeForm:213`), selects admin torneos.
- Sin `role="alert"`/`aria-live` en errores/éxito (auth, prode, grupos, torneo picks) y en mensajes nuevos del chat.
- `confirm()`/`alert()` nativos: `grupos/[id]:128-139`, `admin/usuarios:67,77`, `admin/grupos:62,69`.
- Tablas sin `scope="col"`: `GroupStandings:116-126`.
- Falta: skip-to-content (`layout.tsx`), `prefers-reduced-motion` (`globals.css`), `aria-current` en navs/tabs, áreas táctiles 44px (íconos `size-9`).
- `<img>` nativo sin fallback en avatares: `RankingTable`, `ActivityFeed`, `grupos/[id]` miembros, landing (debería usar `<Avatar>`).
- Emojis sin texto accesible: `RankingTable:69-78` (✓🎯⚽), `FaqModal`.

### 🟠 Tema 4 — Refactor / duplicación

- `NAV_LINKS` duplicado y divergente entre `Navbar.tsx:30-36` y `BottomNav.tsx:16-22` (orden y labels distintos).
- Patrón dropdown (click-outside con useRef/useEffect) copiado en `Navbar` (AuthedActions) y `LanguageSwitcher`; tabs custom reinventadas en `admin/layout`, `ranking`, `grupos/[id]`, prode (el primitivo `Tabs` existe pero no se usa).
- 3 empty states: `EmptyState.tsx` (shared, sin usar), `ui/empty` (`<Empty>`), divs inline (RankingTable/Chat/ActivityFeed/grupos). Estandarizar en `ui/empty`.
- `PercentBar` triplicado: `VsFriends`, `MatchGroupStats.Bar`, `partido/page.PercentBar`.
- Patrón fetch (`useState`+`useEffect`+`Promise.all`+`.catch`+`.finally`) reescrito en grupos, grupos/[id], ranking, perfil, notificaciones, home, invitacion.
- Hooks candidatos: `useFixtureWithPredictions(fechaId)` (idéntico en 2 páginas prode), `usePredictionCounts`, `useMyGroupBlocks(matchId)`.
- `getInitials`/`diceBearAvatar` locales en Navbar (probable duplicado en perfil/ranking) → `lib/avatar.ts`.
- Componentes grandes a dividir: `R32PicksCard.tsx` (372 líneas: fetch + validación de reglas + 2 grillas + submit).

### 🟡 Tema 5 — Faltantes funcionales (bugs de producto)

- **El filtro de Prode NO filtra la lista** (`prode/page.tsx:155,212-267`): las tabs pending/live/results no afectan el contenido renderizado.
- **Chat sin optimistic UI** (`Chat.tsx:58-63`): limpia el draft antes del `await send`; si falla, el mensaje se pierde.
- **CTAs de landing sin acción** (`page.tsx:26-31`): botones sin `href`/`onClick`.
- **Stats inventados** (`page.tsx:138,153,161`: 500k+/2.5m/#1) y avatares con URLs efímeras de Google (`page.tsx:36-55`).
- **Ranking sin paginación** (`ranking/page.tsx:65-69`).
- **Bug de timezone** (`MatchdayList.tsx:8`): agrupa por UTC (`toISOString().slice(0,10)`) pero muestra en hora local.
- **`Suspense` inútiles** (`torneo/[id]/page.tsx:84-110`): datos ya resueltos por `await Promise.all`; además sin `.catch` por endpoint (un fallo tumba toda la página).
- **`notificaciones` toggle sin revertir** en fallo (`notificaciones:50-56`); sin estado de error.
- **`saveAll` de ProdeForm** sin estado "guardando" global ni indicador de cambios sin guardar.
- **`perfil`** descarga ranking global completo solo para sacar la posición de un usuario (`perfil:167,173`).
- **`seleccion`** inútil fuera de la ventana del torneo activo (`seleccion:42-47`).

### 🟡 Tema 6 — Iconografía y formatos

- 3 sistemas de íconos: lucide-react + Material Symbols (CDN render-blocking en `layout.tsx:48-51`) + emojis (FaqModal, RankingTable). Material Symbols se usa en landing y launch → migrar a lucide y quitar el `<link>`.
- 4+ formatos de fecha entre componentes del mismo dominio (MatchdayList largo, MatchRow corto, BracketTree, R32 numérico dd/mm/yyyy, partido largo). Centralizar en helpers (`formatMatchDate`, `formatDeadline`) sobre `useFormatter`.
- `bg-gradient-to-br` (v3) en `home:94` vs `bg-linear-to-r` (v4) en landing → unificar a sintaxis v4.

---

## 4. Roadmap de fases

Cada fase es un sub-proyecto con su propio plan de implementación y revisión.

### Fase 0 — Fundaciones (PRIMERA, detallada abajo)
Base que el resto consume. No toca páginas de feature.

### Fases 1–6 — Dominios (una pasada por archivo: tokens + responsive + a11y)
Orden por visibilidad/tráfico:
1. **Prode** — MatchCard, ProdeForm, Countdown, FeaturedPickCard, PredictionsFilterTabs, PredictionsProgressCard, páginas prode/[fechaId]/resultados.
2. **Landing + Auth** — `app/page.tsx`, `(auth)/auth/page.tsx`.
3. **Grupos + Chat** — grupos, grupos/[id], GroupCard, Chat, ActivityFeed, invitacion.
4. **Ranking** — ranking/page, RankingTable, PositionBadge.
5. **Torneo** — BracketTree, GroupStandings, R32PicksCard, BracketPickCard, TopScorerPickCard, TournamentHero, MatchdayList, MatchRow, VenueCard, partido, seleccion, mundial, VsFriends, MatchGroupStats.
6. **Admin** — layout, usuarios, grupos, partidos, torneos, launch.

### Fase 7 — Faltantes funcionales
Filtro de prode, optimistic chat, CTAs landing, stats/config, paginación ranking, timezone fix, Suspense/error de torneo, iconografía/fechas centralizadas.

---

## 5. Fase 0 — Fundaciones (alcance detallado)

**Objetivo:** crear los cimientos para que las fases de dominio sean "una sola pasada por archivo" sin reinventar primitivos.

### 5.1 Tokens (`globals.css`, `button.tsx`)
- Definir un único token RGB de marca y derivar todos los dorados (glows, selección, text-neon-glow) con `color-mix()`/variable.
- Arreglar el glow verde del `Button` default → `var(--shadow-neon)` (dorado).
- Marcar el bloque legacy como `@deprecated` con comentario y tabla de equivalencias legacy→nuevo (no eliminar aún; se elimina al cerrar las fases de dominio).
- Definir tokens semánticos para acentos hoy literales: medallas (oro/plata/bronce), y un token para el rol "violet/terceros" de R32 (reusar `citrus` por coherencia con GroupStandings).

### 5.2 Safe-areas
- `viewport-fit=cover` en el viewport meta (`layout.tsx`).
- Utilidad/clase para `env(safe-area-inset-bottom)`.
- `BottomNav` con `pb-[env(safe-area-inset-bottom)]`; contenedor de `layout.tsx` con `pb-[calc(4rem+env(safe-area-inset-bottom))]`.

### 5.3 Primitivos compartidos (`components/ui`)
- `DropdownMenu` accesible (sobre `@base-ui` ya instalado o equivalente): `aria-expanded`, `role="menu"`/`menuitem`, Escape, foco, click-outside. Reemplaza el patrón de Navbar y LanguageSwitcher.
- `PillTabs`: tabs tipo píldora con scroll horizontal, `aria-pressed`/`role="tab"`, foco visible. Reemplaza las tabs custom de 4 páginas.
- `PercentBar`: barra de porcentaje con `role="progressbar"` + `aria-valuenow`. Reemplaza las 3 copias.
- `AsyncSection` (o `AsyncState`): wrapper loading/error/empty estándar. Consolida los 3 empty states en `ui/empty`.
- `Avatar` con fallback por `onError` para reemplazar `<img>` nativos.

### 5.4 Hooks y utilidades (`hooks/`, `lib/`)
- `useFetch`/`useAsync` genérico (loading/error/data) para las 7 páginas con fetch a mano.
- `lib/navigation.ts`: definición única de navegación; Navbar y BottomNav derivan de ahí.
- `lib/avatar.ts`: `getInitials`, `diceBearAvatar`.
- `lib/date.ts`: `formatMatchDate`, `formatDeadline` sobre `useFormatter`.

### 5.5 Base global (`globals.css`, `layout.tsx`)
- Skip-to-content link + `id="main-content"`.
- `@media (prefers-reduced-motion: reduce)`.
- `aria-label` distinto en cada `<nav>` landmark.
- Revisar contraste/grosor del foco global.

### 5.6 Fuera de alcance de Fase 0
- No se migran páginas de feature (eso es Fases 1–6).
- No se elimina el bloque legacy de tokens (se elimina al final de las fases de dominio).
- No se tocan bugs funcionales (Fase 7).

---

## 6. Criterios de éxito (global)

- **Responsive:** sin scroll horizontal ni desbordes en 360px en ninguna página; safe-areas respetadas en iOS; navegación y formularios usables con una mano en móvil.
- **Consistencia:** 0 usos de tokens legacy fuera de `globals.css`; un solo dorado de marca; un único patrón de botón primario; un solo sistema de íconos.
- **Accesibilidad:** dropdowns/tabs/botones de selección con ARIA correcto; inputs con label; errores anunciados; skip-link y reduced-motion presentes.
- **Mantenibilidad:** navegación, fetch, empty states, barras de porcentaje y formatos de fecha con una sola fuente de verdad.
- **Funcional:** filtro de prode funciona; chat con optimistic UI; CTAs de landing navegan.

### Criterios de éxito específicos de Fase 0
- `globals.css` con un solo token de marca y bloque legacy marcado `@deprecated`; `Button` sin glow verde.
- `viewport-fit=cover` + utilidades safe-area aplicadas en BottomNav/layout.
- `DropdownMenu`, `PillTabs`, `PercentBar`, `AsyncSection`, `useFetch`, `lib/navigation`, `lib/avatar`, `lib/date` creados con sus tests/uso de referencia, sin romper páginas existentes.
- App compila y las páginas ya migradas (home/perfil/notificaciones) siguen visualmente intactas.

---

## 7. Notas de implementación

- Mobile-first: escribir estilos base para 360px y escalar con `sm:`/`md:`/`lg:`.
- Una pasada por archivo en fases de dominio: al abrir un archivo, migrar tokens + arreglar responsive + agregar a11y de ese archivo antes de cerrarlo.
- Preservar i18n: todo texto nuevo visible pasa por next-intl.
- Verificar visualmente en 360 / 768 / 1024+ antes de cerrar cada fase.
