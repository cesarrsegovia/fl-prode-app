# Diseño — Deadline unificado + selector dropdown (campeón y goleador)

> **Fecha:** 2026-06-12
> **Repo:** `fl-prode-app` (shared, api, web).

## 1. Objetivo y alcance

Dos cambios sobre los picks de **campeón** y **goleador**:

1. **Deadline:** que el pick de **campeón** cierre al **final de la 3ª fecha de grupos** (igual que el goleador ya hace), en vez de al inicio del torneo.
2. **UI:** reemplazar la grilla de ~48 banderas (campeón) y la lista de jugadores (goleador) por un **dropdown custom buscable con banderas/fotos**. Si el pick está **cerrado y ya existe**, no mostrar el selector — solo el bloque "TU PICK ACTUAL" + badge cerrado (ese bloque ya existe).

**Fuera de alcance:** scoring, rankings, el flujo de guardar pick (`setBracketPick`/`setTopScorerPick`) salvo la fuente del deadline, schema/BD (sin migración, sin override nuevo).

## 2. Parte 1 — Deadline del campeón

Estado actual: el campeón cierra al inicio del torneo (`championPickDeadline(tournamentStart)`), calculado en el **front** ([BracketPickCard.tsx:55-62](../../../apps/web/src/components/torneo/BracketPickCard.tsx)) y validado en el back ([tournaments.service.ts:175](../../../apps/api/src/modules/tournaments/tournaments.service.ts)). El goleador ya deriva su deadline de `getRound3FirstMatchStart()` + `topScorerPickDeadline()`.

Cambios:
- **`packages/shared/src/deadlines.ts`:** `championPickDeadline` cambia su parámetro de `tournamentStart` a `round3FirstMatchStart`, devolviendo `endOfPreviousDayUtc(round3FirstMatchStart)` (idéntico a `topScorerPickDeadline`). Actualizar el comentario.
- **`apps/api/src/modules/tournaments/tournaments.service.ts`:** agregar `getChampionDeadline(tournamentId): Promise<Date | null>` — espejo de `getTopScorerDeadline` pero **sin** override de BD: usa `getRound3FirstMatchStart(tournamentId)` y `championPickDeadline(firstStart)`. La validación en `setBracketPick` (la del bloque ~175 que hoy hace `championPickDeadline(tournament.startDate)`) pasa a usar `getChampionDeadline`. `getRound3FirstMatchStart` ya existe (private, mismo service) — reusable directamente.
- **`apps/api/src/modules/tournaments/tournaments.controller.ts`:** nuevo endpoint `GET :id/bracket-pick/deadline` (espejo de `topScorerDeadline`), devuelve `{ deadline: Date | null }`.
- **`apps/web/src/lib/endpoints.ts`:** agregar `bracketPick.deadline(id)`.
- **`BracketPickCard.tsx`:** deja de calcular el deadline localmente; lo consulta del endpoint (mismo patrón que `TopScorerPickCard` con `topScorerPick.deadline`). Quita el `useMemo` de `championPickDeadline` y el prop `tournamentStartDate` si ya no se usa (verificar quién lo pasa).

## 3. Parte 2 — Selector dropdown

### Componente nuevo: `apps/web/src/components/torneo/FlagCombobox.tsx`
Combobox custom reutilizable:
- **Props:** `options: { id: string; label: string; sublabel?: string; imageUrl?: string | null }[]`, `value?: string`, `onSelect: (id: string) => void`, `disabled?: boolean`, `placeholder: string`, `searchPlaceholder: string`, `noResultsLabel: string`, y un render opcional de la imagen (para usar `TeamFlag` en campeón y `PlayerPhoto` en goleador) — vía prop `renderImage?: (opt) => ReactNode` o un slot simple.
- **Comportamiento:** botón que abre un panel con input de búsqueda + lista filtrada (normalizando acentos/mayúsculas, como ya hace `TopScorerPickCard`). Al elegir, llama `onSelect` y cierra. Cierra con Escape y click afuera.
- **Accesibilidad:** `aria-expanded`, `role="listbox"`/`option`, navegable por teclado, foco en el input al abrir.
- **Estados:** `disabled` (cuando submitting). Lista vacía → `noResultsLabel`.

### `BracketPickCard.tsx` (campeón)
- Lógica de render:
  - `loaded && locked && current` → solo bloque "TU PICK ACTUAL" + badge (sin selector).
  - `loaded && !locked` → `<FlagCombobox>` con los 48 equipos (imagen `TeamFlag`).
  - `loaded && locked && !current` → mensaje cerrado, sin selector.
  - `teams.length === 0` → `Empty` (como hoy).
- Reemplaza la grilla `grid-cols-3 sm:grid-cols-4 md:grid-cols-6`.

### `TopScorerPickCard.tsx` (goleador)
- Reemplaza el buscador + grilla de delanteros + dropdown "otro jugador" por **un solo** `<FlagCombobox>` con todos los jugadores (imagen `PlayerPhoto`, `sublabel` = equipo + dorsal).
- Misma lógica de render que campeón (cerrado+pick → solo pick).

## 4. i18n (es/en/fr/de)

- `FlagCombobox` usa: `searchPlaceholder`, `selectPlaceholder`, `noResults`. `topScorer` ya tiene `searchPlaceholder` y `selectTeamPlaceholder`; `champion` no tiene ninguna. Agregar bajo un namespace común `torneo.combobox` (`{ search, select, noResults }`) y usarlo en ambos componentes para no duplicar.
- Actualizar `champion.subtitle` en los 4 idiomas: hoy dice "antes del inicio del torneo" → debe reflejar "hasta el final de la fase de grupos" (texto a definir corto).
- Completar solo claves faltantes; no duplicar las que ya existen.

## 5. Errores

- `FlagCombobox` es solo UI; no maneja red. El error de guardar sigue en cada card (`error` + mensaje del API, como hoy).
- Endpoint de deadline falla → el front trata el pick de forma segura (si `deadline` es null, no bloquea), mismo patrón que `TopScorerPickCard`.
- Lista de opciones vacía → `noResults` / `Empty`, no rompe.

## 6. Testing

- **`packages/shared` (vitest, ya presente):** test de `championPickDeadline(round3Start)` === `endOfPreviousDayUtc(round3Start)` (== `topScorerPickDeadline`). Actualizar cualquier test existente que llamara `championPickDeadline(tournamentStart)`.
- **Backend:** si tournaments tiene specs, test de `getChampionDeadline` derivando de la 3ª fecha (mock de `getRound3FirstMatchStart`).
- **Front:** sin runner de componentes → `tsc` + `build` + smoke manual (abrir campeón/goleador en el iframe: con torneo abierto se ve el dropdown y guarda; cerrado+con pick solo se ve el pick).
- **Regresión:** scoring/picks intactos.

## 7. Lo que NO se toca
Scoring, rankings, `setBracketPick`/`setTopScorerPick` (salvo fuente del deadline), schema/BD, el provider de resultados ESPN.
