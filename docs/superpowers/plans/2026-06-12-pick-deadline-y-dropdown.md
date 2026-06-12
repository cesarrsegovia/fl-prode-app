# Deadline unificado + dropdown — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps usan checkbox.

**Goal:** Deadline de campeón = fin de 3ª fecha de grupos (como goleador); selector de campeón y goleador = dropdown custom buscable; cerrado+con pick = solo el pick.

**Tech Stack:** NestJS, Next.js 15, TS, @prode/shared (vitest), next-intl (es/en/fr/de). Front sin runner de componentes → tsc/build/smoke.

**Restricción:** NO commitear (lo hace el usuario). Pasos "commit" → verificación.

---

## Task 1: `championPickDeadline` deriva de la 3ª fecha (shared, TDD)

**Files:** Modify `packages/shared/src/deadlines.ts`; Test `packages/shared/src/deadlines.spec.ts` (crear si no existe).

- [ ] **Step 1:** Cambiar `championPickDeadline` en `deadlines.ts`:
```typescript
// Campeón: se puede elegir hasta el final de la 2da fecha de grupos
// (cierra el día previo al primer partido de la 3ra fecha, igual que el goleador).
export function championPickDeadline(round3FirstMatchStart: Date): Date {
  return endOfPreviousDayUtc(round3FirstMatchStart);
}
```
- [ ] **Step 2:** Test (crear/añadir en `deadlines.spec.ts`):
```typescript
import { describe, it, expect } from 'vitest';
import { championPickDeadline, topScorerPickDeadline } from './deadlines';

describe('championPickDeadline', () => {
  it('cierra el día previo al primer partido de la 3ra fecha (== topScorer)', () => {
    const round3 = new Date('2026-06-25T19:00:00.000Z');
    expect(championPickDeadline(round3).toISOString()).toBe(
      topScorerPickDeadline(round3).toISOString(),
    );
    expect(championPickDeadline(round3).toISOString()).toBe('2026-06-24T23:59:59.999Z');
  });
});
```
- [ ] **Step 3:** `cd d:/Work/fl-prode-app/packages/shared && npx vitest run deadlines` → PASS. Si había un test viejo que llamaba `championPickDeadline(tournamentStart)`, actualizarlo.
- [ ] **Step 4:** Buildear shared para que api/web tomen el cambio: `cd d:/Work/fl-prode-app && pnpm --filter @prode/shared build`.

---

## Task 2: `getChampionDeadline` + endpoint (backend)

**Files:** Modify `apps/api/src/modules/tournaments/tournaments.service.ts`, `tournaments.controller.ts`.

- [ ] **Step 1:** En `tournaments.service.ts`, agregar método (junto a `getTopScorerDeadline`):
```typescript
  /** Deadline del pick de campeón: fin de la 2da fecha (día previo al primer partido de la 3ra). */
  async getChampionDeadline(tournamentId: string): Promise<Date | null> {
    const firstStart = await this.getRound3FirstMatchStart(tournamentId);
    if (!firstStart) return null;
    return championPickDeadline(firstStart);
  }
```
(Confirmar que `championPickDeadline` ya está importado de `@prode/shared` en este archivo — sí lo está, línea ~15.)

- [ ] **Step 2:** En `setBracketPick`, reemplazar la validación que hoy hace `championPickDeadline(tournament.startDate)` por:
```typescript
    const deadline = await this.getChampionDeadline(tournamentId);
    if (deadline && deadline.getTime() <= Date.now()) {
      throw new BadRequestException('El plazo para elegir campeón ya está cerrado.');
    }
```
(Revisá el bloque actual ~línea 170-180: elimina el `if (tournament.startDate && championPickDeadline(tournament.startDate)...)`. Si `tournament.startDate` ya no se usa en ese método tras el cambio, ajustá el select para no romper tipos.)

- [ ] **Step 3:** En `tournaments.controller.ts`, agregar endpoint (junto a `bracket-pick/me`):
```typescript
  @Get(':id/bracket-pick/deadline')
  async bracketDeadline(@Param('id') id: string) {
    const deadline = await this.service.getChampionDeadline(id);
    return { deadline };
  }
```
- [ ] **Step 4:** `cd d:/Work/fl-prode-app/apps/api && npx tsc --noEmit` → sin errores. Si hay specs de tournaments, `npx jest tournaments` → PASS.

---

## Task 3: endpoint front + FlagCombobox

**Files:** Modify `apps/web/src/lib/endpoints.ts`; Create `apps/web/src/components/torneo/FlagCombobox.tsx`.

- [ ] **Step 1:** En `endpoints.ts`, dentro de `export const bracketPick = {`, agregar tras `set`:
```typescript
  deadline: (tournamentId: string) =>
    apiClient
      .get<{ deadline: string | null }>(
        `/tournaments/${tournamentId}/bracket-pick/deadline`,
      )
      .then((r) => r.data),
```
- [ ] **Step 2:** Crear `FlagCombobox.tsx`:
```tsx
'use client';

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ComboOption {
  id: string;
  label: string;
  sublabel?: string;
  image?: ReactNode;
}

interface Props {
  options: ComboOption[];
  value?: string;
  disabled?: boolean;
  placeholder: string;
  searchPlaceholder: string;
  noResultsLabel: string;
  onSelect: (id: string) => void;
}

function normalize(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

export function FlagCombobox({
  options,
  value,
  disabled,
  placeholder,
  searchPlaceholder,
  noResultsLabel,
  onSelect,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const selected = useMemo(() => options.find((o) => o.id === value), [options, value]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return options;
    return options.filter(
      (o) => normalize(o.label).includes(q) || (o.sublabel && normalize(o.sublabel).includes(q)),
    );
  }, [query, options]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    inputRef.current?.focus();
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-surface-2 border border-line/40 text-left text-sm text-foreground transition-all',
          'hover:border-neon/60 focus:outline-none focus:ring-1 focus:ring-neon',
          disabled && 'opacity-60 pointer-events-none',
        )}
      >
        {selected?.image}
        <span className={cn('flex-1 min-w-0 truncate font-display font-bold', !selected && 'text-ink-muted')}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-ink-muted" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-line/40 bg-surface-1 shadow-xl">
          <div className="relative p-2 border-b border-line/30">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-ink-muted" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-8 pr-2 py-1.5 rounded-md bg-surface-2 border border-line/40 text-sm focus:border-neon/60 focus:outline-none"
            />
          </div>
          <ul role="listbox" id={listId} className="max-h-64 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-sm text-ink-muted text-center">{noResultsLabel}</li>
            ) : (
              filtered.map((o) => {
                const isSel = o.id === value;
                return (
                  <li key={o.id} role="option" aria-selected={isSel}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(o.id);
                        setOpen(false);
                        setQuery('');
                      }}
                      className={cn(
                        'w-full flex items-center gap-2 px-2 py-2 rounded-md text-left transition-colors',
                        isSel ? 'bg-neon/10 text-neon' : 'hover:bg-surface-2',
                      )}
                    >
                      {o.image}
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-display font-bold truncate">{o.label}</span>
                        {o.sublabel && (
                          <span className="block text-[11px] text-ink-muted truncate">{o.sublabel}</span>
                        )}
                      </span>
                      {isSel && <Check className="size-4 shrink-0 text-neon" />}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
```
- [ ] **Step 3:** `cd d:/Work/fl-prode-app/apps/web && npx tsc --noEmit` → sin errores.

---

## Task 4: i18n combobox + subtitle campeón (4 idiomas)

**Files:** Modify `apps/web/src/messages/{es,en,fr,de}/torneo.json`.

- [ ] **Step 1:** En cada `torneo.json`, agregar dentro del objeto raíz un namespace `combobox`:
  - es: `"combobox": { "search": "Buscar…", "select": "Elegí una opción", "noResults": "Sin resultados" }`
  - en: `"combobox": { "search": "Search…", "select": "Choose an option", "noResults": "No results" }`
  - fr: `"combobox": { "search": "Rechercher…", "select": "Choisissez une option", "noResults": "Aucun résultat" }`
  - de: `"combobox": { "search": "Suchen…", "select": "Option wählen", "noResults": "Keine Ergebnisse" }`
- [ ] **Step 2:** Actualizar `champion.subtitle` en cada idioma (hoy dice "antes del inicio del torneo"):
  - es: `"Elegí una selección hasta el final de la fase de grupos. Bonus al final si acertás."`
  - en: `"Pick a team until the end of the group stage. Bonus at the end if you nail it."`
  - fr: `"Choisissez une équipe jusqu'à la fin de la phase de groupes. Bonus à la fin si vous trouvez."`
  - de: `"Wähle ein Team bis zum Ende der Gruppenphase. Bonus am Ende, wenn du richtig liegst."`
- [ ] **Step 3:** Validar JSON: `cd d:/Work/fl-prode-app && node -e "['es','en','fr','de'].forEach(l=>{const j=JSON.parse(require('fs').readFileSync('apps/web/src/messages/'+l+'/torneo.json','utf8'));if(!j.combobox)throw new Error(l);console.log(l,'ok')})"`

---

## Task 5: BracketPickCard → dropdown + deadline del endpoint

**Files:** Modify `apps/web/src/components/torneo/BracketPickCard.tsx`, `apps/web/src/app/(main)/torneo/[id]/page.tsx`.

- [ ] **Step 1:** En `BracketPickCard.tsx`:
  - Quitar el prop `tournamentStartDate` y el import/uso de `championPickDeadline` y el `useMemo` de `lockedAt`.
  - Cargar el deadline del endpoint en el `useEffect`: junto a `bracketPick.mine`, hacer `bracketPick.deadline(tournamentId)` y guardar `const [deadline, setDeadline] = useState<Date | null>(null)`; `locked = deadline ? deadline <= new Date() : false`.
  - Reemplazar la grilla (`<div className="grid grid-cols-3...">...</div>`) por la lógica:
    - Si `locked && current` → no renderizar selector (solo queda el bloque "TU PICK ACTUAL" del header + badge).
    - Si `!locked` → `<FlagCombobox>` con `options` mapeadas de `sortedTeams` (`{id, label: name, sublabel: group?, image: <TeamFlag size="sm" .../>}`), `value={current?.champTeamId}`, `onSelect={pick}`, placeholders desde `useTranslations('torneo.combobox')`.
    - Si `locked && !current` → mostrar `t('locked')` simple.
  - Mantener `Empty` para `teams.length === 0`.
- [ ] **Step 2:** En `page.tsx`, quitar el prop `tournamentStartDate` del `<BracketPickCard>` (queda `tournamentId` + `teams`).
- [ ] **Step 3:** `cd d:/Work/fl-prode-app/apps/web && npx tsc --noEmit` → sin errores.

---

## Task 6: TopScorerPickCard → dropdown único

**Files:** Modify `apps/web/src/components/torneo/TopScorerPickCard.tsx`.

- [ ] **Step 1:** Reemplazar el bloque de buscador + grilla de delanteros + dropdown "otro jugador" por un solo `<FlagCombobox>`:
  - `options` = todos los `players` mapeados a `{ id: playerId, label: name, sublabel: `${team.shortName ?? team.name}${number ? ' · #'+number : ''}`, image: <PlayerPhoto src={photoUrl} size="sm" .../> }`.
  - `value={current?.playerId}`, `onSelect={(id) => pick(id)}`, `disabled={locked}`, placeholders de `torneo.combobox`.
  - Lógica de render: `locked && current` → solo el bloque pick actual (header) sin selector; `!locked` → combobox; `locked && !current` → `t('locked')`. Mantener `emptyPlayers` si `players.length === 0`.
  - Quitar `query`/`otherTeamId`/`forwards`/`searchResults`/`otherSquad`/`teams` y el `renderPlayer` de grilla si quedan sin uso (dejar `pick`).
- [ ] **Step 2:** `cd d:/Work/fl-prode-app/apps/web && npx tsc --noEmit` → sin errores.

---

## Task 7: Verificación final

- [ ] **Step 1:** `cd d:/Work/fl-prode-app && pnpm --filter @prode/shared build && pnpm --filter @prode/shared test` → PASS.
- [ ] **Step 2:** `cd d:/Work/fl-prode-app/apps/api && npx tsc --noEmit && npx jest --silent` → PASS.
- [ ] **Step 3:** `cd d:/Work/fl-prode-app/apps/web && npx tsc --noEmit && npx next build` (o `pnpm build`) → build OK.
- [ ] **Step 4:** Smoke manual (usuario): abrir torneo en el iframe — con torneo abierto, campeón y goleador muestran dropdown buscable y guardan; cerrado+con pick muestran solo el pick.
- [ ] **Step 5:** NO commitear.
