# Fase 3 — Frontend (FAQ + Progreso/Tabs + Chips + Ranking sub-stats) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar la paridad visual con Prode Lemon: render de sub-stats en la tabla de ranking, modal de FAQ con las reglas, card de progreso + tabs de filtro en la página de Predicciones, empty state "¡Todo al día!", chips de alerta en el home del torneo y cards destacadas "Tu Campeón / Tu Goleador" arriba de las predicciones.

**Architecture:** Trabajo 100% en `apps/web`. Se consume lo que las Fases 1 y 2 expusieron: sub-stats de ranking, pick de campeón/goleador, lista de jugadores. Se agrega una primitiva mínima `Dialog` reutilizable, un nuevo namespace `faq` en i18n, y componentes `FaqModal`, `PredictionsProgressCard`, `PredictionsFilterTabs`, `TournamentAlertChips`, `FeaturedPickCard`.

**Tech Stack:** Next.js (App Router, client components), Tailwind, `next-intl` (cookie-based, no route renames — preferencia ya guardada), Lucide icons (`HelpCircle`).

**Depende de:** Fase 1 (sub-stats en respuesta del ranking) y Fase 2 (endpoints de goleador + pick).

**Spec:** `docs/superpowers/specs/2026-05-27-paridad-prode-lemon-design.md` (Módulos 2 UI · 4 · 5 · 6).

---

## File Structure

- `apps/web/src/components/ui/dialog.tsx` — **(nuevo)** primitiva.
- `apps/web/src/components/common/FaqModal.tsx` — **(nuevo)**.
- `apps/web/src/components/layout/Navbar.tsx` — botón (?) que abre la FAQ.
- `apps/web/src/messages/{es,en,de}/faq.json` — **(nuevo)** contenido FAQ.
- `apps/web/src/i18n/request.ts` — agregar `'faq'` al array `namespaces`.
- `packages/shared/src/types/...` (donde viva `RankingEntry`) — sumar sub-stats al tipo.
- `apps/web/src/components/ranking/RankingTable.tsx` — render de columnas ✓ 🎯 ⚽.
- `apps/web/src/components/prode/PredictionsProgressCard.tsx` — **(nuevo)**.
- `apps/web/src/components/prode/PredictionsFilterTabs.tsx` — **(nuevo)**.
- `apps/web/src/components/prode/FeaturedPickCard.tsx` — **(nuevo)** (reutilizable para Campeón/Goleador).
- `apps/web/src/app/(main)/prode/page.tsx` — montar progreso + tabs + featured + empty state.
- `apps/web/src/components/torneo/TournamentAlertChips.tsx` — **(nuevo)**.
- `apps/web/src/app/(main)/torneo/[id]/page.tsx` — montar los chips arriba.

---

## Task 1: Primitiva `Dialog`

**Files:**
- Create: `apps/web/src/components/ui/dialog.tsx`

- [ ] **Step 1: Crear el componente**

Create `apps/web/src/components/ui/dialog.tsx`:
```tsx
'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidthClassName?: string;
}

export function Dialog({ open, onClose, title, children, maxWidthClassName = 'max-w-lg' }: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full ${maxWidthClassName} rounded-t-2xl bg-background p-4 shadow-lg sm:rounded-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            type="button"
            aria-label="close"
            onClick={onClose}
            className="rounded-full p-1 hover:bg-muted"
          >
            <X size={18} />
          </button>
        </header>
        <div className="mt-3 max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/ui/dialog.tsx
git commit -m "feat(ui): primitiva Dialog"
```

---

## Task 2: Namespace i18n `faq`

**Files:**
- Create: `apps/web/src/messages/{es,en,de}/faq.json`
- Modify: `apps/web/src/i18n/request.ts`

- [ ] **Step 1: Registrar el namespace**

En `apps/web/src/i18n/request.ts`, sumar `'faq'` al array `namespaces` (mantener orden alfabético o donde corresponda):
```ts
const namespaces = [
  'common', 'nav', 'auth', 'landing', 'home', 'prode', 'grupos', 'ranking',
  'notificaciones', 'mis-pronosticos', 'torneo', 'seleccion', 'partido', 'perfil',
  'admin', 'faq',
] as const;
```

- [ ] **Step 2: Contenido ES (`apps/web/src/messages/es/faq.json`)**

Create:
```json
{
  "title": "Preguntas Frecuentes",
  "trigger": "Ayuda",
  "items": {
    "pointSystem": {
      "q": "¿Cómo funciona el sistema de puntos?",
      "a": "Sumás puntos prediciendo los resultados: acertar el ganador suma 3 pts; acertar el resultado exacto suma 2 pts adicionales. Si predecís el resultado exacto, sumás 5 pts en total."
    },
    "winner": {
      "q": "¿Qué significa acertar el ganador?",
      "a": "Significa predecir correctamente quién gana el partido (local, visitante o empate). Si predecís 2-1 y el resultado real es 3-0, acertaste al ganador (local) y sumás 3 puntos."
    },
    "exact": {
      "q": "¿Qué significa resultado exacto?",
      "a": "Significa acertar los goles exactos de cada equipo. Si predecís 2-1 y el resultado es exactamente 2-1, sumás 5 puntos en total (3 por el ganador + 2 por el exacto)."
    },
    "champion": {
      "q": "¿Qué es la predicción de campeón?",
      "a": "En algunos torneos podés elegir qué equipo creés que va a salir campeón. Si acertás, sumás 15 pts extra. Tenés hasta una fecha límite para cambiar tu elección; pasada esa fecha, queda bloqueada."
    },
    "topScorer": {
      "q": "¿Qué es la predicción de goleador?",
      "a": "Elegís al jugador que creés que va a ser el goleador del torneo. Si acertás, sumás 15 pts. Tenés hasta una fecha límite para cambiar tu elección."
    },
    "deadline": {
      "q": "¿Hasta cuándo puedo hacer mis predicciones?",
      "a": "Podés hacer o modificar tus predicciones hasta el momento en que comienza el partido. Una vez que arranca, tu predicción queda bloqueada."
    },
    "changePick": {
      "q": "¿Puedo cambiar mi predicción?",
      "a": "Sí, podés modificar tu predicción cuantas veces quieras antes de que comience el partido. Solo se cuenta la última predicción realizada."
    },
    "privateGroups": {
      "q": "¿Cómo funcionan los grupos privados?",
      "a": "Los grupos privados te permiten competir con amigos en un ranking separado. Podés crear un grupo y compartir el código de invitación. Cada grupo tiene su propio ranking basado en los mismos puntos del torneo general."
    },
    "noPrediction": {
      "q": "¿Qué pasa si no hago predicción en un partido?",
      "a": "Si no realizás una predicción para un partido, simplemente no sumás puntos por ese partido. No hay penalización."
    },
    "etPenalties": {
      "q": "¿Qué pasa con el tiempo extra y los penales?",
      "a": "Los goles del alargue cuentan normalmente. Si el partido se define por penales, se considera empate. Los penales solo determinan quién avanza, pero no cambian el marcador."
    },
    "tieBreak": {
      "q": "¿Cómo se desempata si dos jugadores tienen los mismos puntos?",
      "a": "Cuando varios jugadores tienen la misma cantidad de puntos, el ranking los desempata en este orden: 1) mayor cantidad de ganadores acertados, 2) mayor cantidad de resultados exactos, 3) mayor suma de goles en resultados exactos, 4) quien hizo antes su primera predicción.",
      "exampleTitle": "Por ejemplo:",
      "exampleNote": "Ana y Pablo tienen los mismos puntos y exactos. Ana aparece primera porque tiene mayor sumatoria de goles en sus resultados exactos (3 vs 1)."
    }
  }
}
```

- [ ] **Step 3: Contenido EN (`apps/web/src/messages/en/faq.json`)**

Create con las mismas keys y traducciones equivalentes (omitido por brevedad; mismo shape JSON).

- [ ] **Step 4: Contenido DE (`apps/web/src/messages/de/faq.json`)**

Idem en alemán.

- [ ] **Step 5: Correr parity test de i18n si existe**

Run (si `apps/web/src/i18n/messages-parity.test.ts` está activo): `pnpm --filter @prode/web test messages-parity`
Expected: PASS — todas las locales tienen las mismas keys.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/messages apps/web/src/i18n/request.ts
git commit -m "i18n(faq): contenido completo en es/en/de y registro del namespace"
```

---

## Task 3: `FaqModal` + botón (?) en `Navbar`

**Files:**
- Create: `apps/web/src/components/common/FaqModal.tsx`
- Modify: `apps/web/src/components/layout/Navbar.tsx`

- [ ] **Step 1: Crear el modal con acordeón nativo**

Create `apps/web/src/components/common/FaqModal.tsx`:
```tsx
'use client';

import { useTranslations } from 'next-intl';
import { Dialog } from '@/components/ui/dialog';

const KEYS = [
  'pointSystem', 'winner', 'exact', 'champion', 'topScorer',
  'deadline', 'changePick', 'privateGroups', 'noPrediction',
  'etPenalties', 'tieBreak',
] as const;

interface Props {
  open: boolean;
  onClose: () => void;
}

export function FaqModal({ open, onClose }: Props) {
  const t = useTranslations('faq');
  return (
    <Dialog open={open} onClose={onClose} title={t('title')} maxWidthClassName="max-w-2xl">
      <div className="divide-y">
        {KEYS.map((k) => (
          <details key={k} className="group py-2">
            <summary className="cursor-pointer list-none py-2 font-medium">
              {t(`items.${k}.q`)}
            </summary>
            <div className="prose prose-sm max-w-none pb-3 text-sm text-muted-foreground">
              <p>{t(`items.${k}.a`)}</p>
              {k === 'tieBreak' && (
                <>
                  <p className="mt-2 font-medium">{t('items.tieBreak.exampleTitle')}</p>
                  <table className="mt-1 w-full text-xs">
                    <thead>
                      <tr className="text-left">
                        <th>Pos.</th><th>Jugador</th><th>Pts</th><th>🎯</th><th>⚽</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td>1°</td><td>Ana</td><td>5</td><td>1</td><td>3</td></tr>
                      <tr><td>2°</td><td>Pablo</td><td>5</td><td>1</td><td>1</td></tr>
                      <tr><td>3°</td><td>Diego</td><td>3</td><td>0</td><td>—</td></tr>
                    </tbody>
                  </table>
                  <p className="mt-2">{t('items.tieBreak.exampleNote')}</p>
                </>
              )}
            </div>
          </details>
        ))}
      </div>
    </Dialog>
  );
}
```

- [ ] **Step 2: Botón (?) en el Navbar**

En `apps/web/src/components/layout/Navbar.tsx`, agregar imports:
```ts
import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { FaqModal } from '@/components/common/FaqModal';
```
Dentro del componente Navbar (ya es client), agregar el estado:
```ts
const [faqOpen, setFaqOpen] = useState(false);
```
Y en el JSX, **antes** del bell de notificaciones (alrededor de las líneas 148–167), insertar:
```tsx
<button
  type="button"
  aria-label={t('faqTrigger')}
  onClick={() => setFaqOpen(true)}
  className="rounded-full p-2 hover:bg-muted"
>
  <HelpCircle size={20} />
</button>
<FaqModal open={faqOpen} onClose={() => setFaqOpen(false)} />
```
**Si el Navbar no usa el namespace `'common'` o `'nav'`** (revisar el `useTranslations(...)` actual), agregar la key `faqTrigger` al namespace que sí usa (por ejemplo en `common.json` y/o `nav.json`: `"faqTrigger": "Ayuda"`).

- [ ] **Step 3: Verificar UI**

`pnpm --filter @prode/web dev` → en cualquier página, clickear el (?) → se abre el modal con el acordeón.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/common/FaqModal.tsx apps/web/src/components/layout/Navbar.tsx
git commit -m "feat(web): modal de FAQ con acordeon y boton (?) en Navbar"
```

---

## Task 4: Sub-stats en `RankingTable`

**Files:**
- Modify: el tipo `RankingEntry` (probablemente `packages/shared/src/types/ranking.ts` o similar — buscar `interface RankingEntry`/`type RankingEntry`).
- Modify: `apps/web/src/components/ranking/RankingTable.tsx`

- [ ] **Step 1: Extender el tipo `RankingEntry`**

Localizar el tipo (`grep -r "type RankingEntry\|interface RankingEntry" packages/shared`) y agregarle los campos:
```ts
correctWinners: number;
exactScores: number;
exactGoalsSum: number;
```
Rebuild de shared:
```bash
pnpm --filter @prode/shared build
```

- [ ] **Step 2: Render de columnas en `RankingTable`**

En `apps/web/src/components/ranking/RankingTable.tsx`, dentro del `<li>` que renderiza cada entrada, **junto al `total`** (alrededor de la línea 49), agregar tres pequeños bloques:
```tsx
<div className="flex items-center gap-2 text-xs text-muted-foreground">
  <span title="Ganadores acertados">✓ {entry.correctWinners}</span>
  <span title="Resultados exactos">🎯 {entry.exactScores}</span>
  <span title="Suma de goles en exactos">⚽ {entry.exactGoalsSum}</span>
</div>
```
(Ubicarlo entre el username y el total, o debajo del username; mirar el layout actual y replicar la disposición de las imágenes de Prode Lemon.)

- [ ] **Step 3: Verificar typecheck y visual**

Run: `pnpm --filter @prode/web exec tsc --noEmit`
Expected: sin errores.

Run: `pnpm --filter @prode/web dev` y mirar `/ranking`.
Expected: cada fila muestra los 3 sub-stats. Hoy todos en cero (no hay partidos puntuados).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/ranking/RankingTable.tsx packages/shared
git commit -m "feat(ranking-ui): mostrar sub-stats de desempate por fila"
```

---

## Task 5: `PredictionsProgressCard`

**Files:**
- Create: `apps/web/src/components/prode/PredictionsProgressCard.tsx`

- [ ] **Step 1: Crear el componente**

Create `apps/web/src/components/prode/PredictionsProgressCard.tsx`:
```tsx
'use client';

import { useTranslations } from 'next-intl';
import { TrendingUp } from 'lucide-react';

interface Props {
  predicted: number;
  total: number;
}

export function PredictionsProgressCard({ predicted, total }: Props) {
  const t = useTranslations('prode.progress');
  const pending = Math.max(total - predicted, 0);
  const pct = total > 0 ? Math.round((predicted / total) * 100) : 0;

  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">{t('title')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('predicted', { predicted, total })}
          </p>
        </div>
        <div className="rounded-md bg-muted p-2">
          <TrendingUp size={18} />
        </div>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{t('pending', { pending })}</span>
        <span className="font-medium">{t('percent', { pct })}</span>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Agregar keys i18n**

En `apps/web/src/messages/es/prode.json` (y equivalentes en en/de), insertar:
```json
"progress": {
  "title": "Tu Progreso",
  "predicted": "{predicted} de {total} partidos pronosticados",
  "pending": "{pending} pendientes",
  "percent": "{pct}% completo"
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/prode/PredictionsProgressCard.tsx apps/web/src/messages
git commit -m "feat(prode): card de progreso"
```

---

## Task 6: `PredictionsFilterTabs`

**Files:**
- Create: `apps/web/src/components/prode/PredictionsFilterTabs.tsx`

- [ ] **Step 1: Crear el componente**

Create `apps/web/src/components/prode/PredictionsFilterTabs.tsx`:
```tsx
'use client';

import { useTranslations } from 'next-intl';

export type PredictionsFilter =
  | 'pending'
  | 'predicted'
  | 'live'
  | 'results'
  | 'topScorer';

const ORDER: PredictionsFilter[] = ['pending', 'predicted', 'live', 'results', 'topScorer'];

interface Props {
  value: PredictionsFilter;
  onChange: (v: PredictionsFilter) => void;
  counts?: Partial<Record<PredictionsFilter, number>>;
}

export function PredictionsFilterTabs({ value, onChange, counts }: Props) {
  const t = useTranslations('prode.tabs');
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <div className="flex gap-2">
        {ORDER.map((k) => {
          const active = value === k;
          const count = counts?.[k];
          return (
            <button
              key={k}
              type="button"
              onClick={() => onChange(k)}
              className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-sm transition ${
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground hover:bg-muted/80'
              }`}
            >
              <span>{t(k)}</span>
              {typeof count === 'number' && (
                <span
                  className={`rounded-full px-2 text-xs ${
                    active ? 'bg-primary-foreground/20' : 'bg-foreground/10'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Keys i18n**

En `apps/web/src/messages/es/prode.json` (y equivalentes en/de):
```json
"tabs": {
  "pending": "Pendientes",
  "predicted": "Predichos",
  "live": "En Vivo",
  "results": "Resultados",
  "topScorer": "Goleadores"
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/prode/PredictionsFilterTabs.tsx apps/web/src/messages
git commit -m "feat(prode): tabs de filtro Pendientes/Predichos/EnVivo/Resultados/Goleadores"
```

---

## Task 7: `FeaturedPickCard` (reutilizable Campeón/Goleador)

**Files:**
- Create: `apps/web/src/components/prode/FeaturedPickCard.tsx`

- [ ] **Step 1: Crear el componente**

Create `apps/web/src/components/prode/FeaturedPickCard.tsx`:
```tsx
'use client';

import Link from 'next/link';
import { Trophy, Target } from 'lucide-react';

interface Props {
  variant: 'champion' | 'topScorer';
  label: string;
  pickName: string | null;
  pickSubtitle?: string | null;
  pointsLabel: string;
  deadlineLabel: string;
  href: string;
}

export function FeaturedPickCard({
  variant, label, pickName, pickSubtitle, pointsLabel, deadlineLabel, href,
}: Props) {
  const Icon = variant === 'champion' ? Trophy : Target;
  const accent =
    variant === 'champion'
      ? 'border-amber-300/60 bg-amber-50 dark:bg-amber-950/30'
      : 'border-orange-300/60 bg-orange-50 dark:bg-orange-950/30';

  return (
    <Link
      href={href}
      className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${accent}`}
    >
      <div className="flex items-center gap-3">
        <span className="rounded-md bg-background/60 p-2"><Icon size={18} /></span>
        <div>
          <p className="text-xs font-medium">{label} · {pointsLabel}</p>
          <p className="font-semibold">{pickName ?? '—'}</p>
          {pickSubtitle && <p className="text-xs text-muted-foreground">{pickSubtitle}</p>}
        </div>
      </div>
      <span className="text-xs text-muted-foreground">{deadlineLabel}</span>
    </Link>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/prode/FeaturedPickCard.tsx
git commit -m "feat(prode): card destacada reutilizable para Campeon/Goleador"
```

---

## Task 8: Montar progreso + tabs + featured + empty state en `prode/page.tsx`

**Files:**
- Modify: `apps/web/src/app/(main)/prode/page.tsx`

- [ ] **Step 1: Imports y estado**

Agregar:
```ts
'use client';
// ...existentes...
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { PredictionsProgressCard } from '@/components/prode/PredictionsProgressCard';
import { PredictionsFilterTabs, type PredictionsFilter } from '@/components/prode/PredictionsFilterTabs';
import { FeaturedPickCard } from '@/components/prode/FeaturedPickCard';
import { bracketPick, topScorerPick, type BracketPickResponse, type TopScorerPickResponse } from '@/lib/endpoints';
```
Si la página es server component hoy, convertirla a client component (el state requiere `'use client'`). Alternativamente, dejar la página como server y montar un wrapper client interno con los datos por props. Para reducir riesgo y mantener el patrón actual, asumir client.

Agregar estado:
```ts
const [filter, setFilter] = useState<PredictionsFilter>('pending');
const [champPick, setChampPick] = useState<BracketPickResponse | null>(null);
const [topPick, setTopPick] = useState<TopScorerPickResponse | null>(null);
```

- [ ] **Step 2: Cargar picks (en el `useEffect` que ya carga `tournament` + `fixtures`)**

```ts
useEffect(() => {
  if (!tournament?.id) return;
  bracketPick.mine(tournament.id).then(setChampPick).catch(() => {});
  topScorerPick.mine(tournament.id).then(setTopPick).catch(() => {});
}, [tournament?.id]);
```

- [ ] **Step 3: Calcular conteos y filtrado**

```ts
const allMatches = useMemo(() => items.flatMap((f) => f.matches), [items]);
const predicted = allMatches.filter((m) => m.userPrediction != null).length;
const total = allMatches.length;
const live = allMatches.filter((m) => m.status === 'LIVE').length;
const finished = allMatches.filter((m) => m.status === 'FINISHED').length;
const pending = Math.max(total - predicted - live - finished, 0);

const counts = { pending, predicted, live, results: finished, topScorer: topPick ? 1 : 0 };
```
**Adaptá los nombres reales de los campos** (`m.userPrediction`, `m.status`, `items.matches`, etc.) a los que ya devuelve tu API; el comportamiento conceptual es el mismo.

- [ ] **Step 4: Render — insertar arriba de la lista de fixtures**

Inmediatamente debajo del header `<h1>PREDICCIONES</h1>`, agregar:
```tsx
<PredictionsProgressCard predicted={predicted} total={total} />

<div className="mt-3 space-y-2">
  <FeaturedPickCard
    variant="champion"
    label={tF('champion.label')}
    pointsLabel={tF('champion.points')}
    pickName={champPick?.champTeam?.name ?? null}
    deadlineLabel={tF('champion.deadline', {
      date: formatDeadline(tournament?.startDate),
    })}
    href={`/torneo/${tournament?.id ?? ''}`}
  />
  <FeaturedPickCard
    variant="topScorer"
    label={tF('topScorer.label')}
    pointsLabel={tF('topScorer.points')}
    pickName={topPick?.player?.name ?? null}
    pickSubtitle={topPick?.player?.position ?? null}
    deadlineLabel={tF('topScorer.deadline', {
      date: formatDeadline(tournament?.startDate),
    })}
    href={`/torneo/${tournament?.id ?? ''}`}
  />
</div>

<div className="mt-4">
  <PredictionsFilterTabs value={filter} onChange={setFilter} counts={counts} />
</div>
```
**Donde `tF = useTranslations('prode.featured')`** y `formatDeadline` puede ser una función local que aplique `Intl.DateTimeFormat`.

- [ ] **Step 5: Filtrar la lista renderizada**

Envolver el `.map` actual de fixtures/matches con:
```ts
const filteredItems = useMemo(() => {
  if (filter === 'topScorer') return []; // el tab Goleador no muestra partidos
  return items.map((f) => ({
    ...f,
    matches: f.matches.filter((m) => matchInFilter(m, filter)),
  })).filter((f) => f.matches.length > 0);
}, [items, filter]);

function matchInFilter(m: any, f: PredictionsFilter): boolean {
  if (f === 'pending') return m.userPrediction == null && m.status === 'PENDING';
  if (f === 'predicted') return m.userPrediction != null && m.status === 'PENDING';
  if (f === 'live') return m.status === 'LIVE';
  if (f === 'results') return m.status === 'FINISHED';
  return false;
}
```

- [ ] **Step 6: Empty state "¡Todo al día!"**

Donde hoy se renderiza el empty state actual, agregar un bloque condicional:
```tsx
{filter === 'pending' && pending === 0 && total > 0 && (
  <div className="mt-6 rounded-2xl border bg-card p-6 text-center">
    <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-md bg-muted">✓</div>
    <h3 className="text-base font-semibold">{tP('allUpToDate.title')}</h3>
    <p className="text-sm text-muted-foreground">{tP('allUpToDate.subtitle')}</p>
  </div>
)}

{filter === 'topScorer' && (
  /* aquí se mostrará la card de selección de goleador o link a /torneo/:id */
  <div className="mt-6 text-center text-sm text-muted-foreground">
    {tP('topScorerTabHint')}
  </div>
)}
```
Donde `tP = useTranslations('prode')`.

- [ ] **Step 7: Keys i18n nuevas (`prode.json` en `es/en/de`)**

```json
"featured": {
  "champion": {
    "label": "Tu Campeón",
    "points": "Vale 15 pts",
    "deadline": "Hasta {date}"
  },
  "topScorer": {
    "label": "Tu Goleador",
    "points": "Vale 15 pts",
    "deadline": "Hasta {date}"
  }
},
"allUpToDate": {
  "title": "¡Todo al día!",
  "subtitle": "Predijiste todos los partidos próximos. ¡Bien hecho!"
},
"topScorerTabHint": "Definí tu goleador desde la página del torneo."
```

- [ ] **Step 8: Verificar visualmente**

`pnpm --filter @prode/web dev` → ir a `/prode`. Esperado:
- Header + card de progreso (X/N + %)
- Cards destacadas Tu Campeón / Tu Goleador (vacías si aún no elegiste; rellenas si elegiste)
- Tabs de filtro y contadores
- Fixtures filtrados según el tab
- Si pasás todo a "Predichos" → en "Pendientes" aparece el empty state "¡Todo al día!"

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/app/\(main\)/prode/page.tsx apps/web/src/messages
git commit -m "feat(prode): card de progreso, tabs de filtro, featured picks y empty state"
```

---

## Task 9: Chips de alerta en el home del torneo

**Files:**
- Create: `apps/web/src/components/torneo/TournamentAlertChips.tsx`
- Modify: `apps/web/src/app/(main)/torneo/[id]/page.tsx`

- [ ] **Step 1: Crear el componente**

Create `apps/web/src/components/torneo/TournamentAlertChips.tsx`:
```tsx
'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface Props {
  tournamentId: string;
  unpredictedCount: number;
  missingChampion: boolean;
  missingTopScorer: boolean;
}

export function TournamentAlertChips({
  tournamentId, unpredictedCount, missingChampion, missingTopScorer,
}: Props) {
  const t = useTranslations('torneo.alerts');
  const items: { key: string; text: string; href: string }[] = [];
  if (unpredictedCount > 0) {
    items.push({
      key: 'matches',
      text: t('unpredicted', { n: unpredictedCount }),
      href: `/prode`,
    });
  }
  if (missingChampion) {
    items.push({ key: 'champion', text: t('missingChampion'), href: `/torneo/${tournamentId}#champion` });
  }
  if (missingTopScorer) {
    items.push({ key: 'topScorer', text: t('missingTopScorer'), href: `/torneo/${tournamentId}#top-scorer` });
  }
  if (!items.length) return null;

  return (
    <div className="space-y-2">
      {items.map((it) => (
        <Link
          key={it.key}
          href={it.href}
          className="flex items-center gap-2 rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm dark:bg-amber-950/30"
        >
          <AlertTriangle size={16} className="text-amber-600" />
          <span>{it.text}</span>
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Keys i18n (`apps/web/src/messages/{es,en,de}/torneo.json`)**

```json
"alerts": {
  "unpredicted": "{n} partidos sin pronosticar",
  "missingChampion": "Falta tu campeón",
  "missingTopScorer": "Falta tu goleador"
}
```

- [ ] **Step 3: Montar en la página del torneo**

En `apps/web/src/app/(main)/torneo/[id]/page.tsx`, inmediatamente después del `TournamentHero`, calcular las flags (`unpredictedCount` desde el ranking/predicciones del usuario; si no es trivial server-side, mover los chips a un client wrapper que los calcule con `apiClient`) y renderizar:
```tsx
<TournamentAlertChips
  tournamentId={id}
  unpredictedCount={unpredictedCount}
  missingChampion={!bracketPickMine}
  missingTopScorer={!topScorerPickMine}
/>
```
Las fuentes recomendadas:
- `unpredictedCount`: `tournamentApi.userProgress(id)` (si no existe, crear un endpoint mínimo `GET /tournaments/:id/me/progress` que devuelva `{ predicted, total }`), o calcularlo en el client component a partir de las predicciones ya cargadas.
- `bracketPickMine` y `topScorerPickMine`: usar `bracketPick.mine(id)` y `topScorerPick.mine(id)` ya disponibles.

- [ ] **Step 4: Verificar**

`pnpm --filter @prode/web dev` → ir a `/torneo/<id>`. Esperado: si te faltan partidos o picks, aparecen los chips amarillos.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/torneo/TournamentAlertChips.tsx apps/web/src/app/\(main\)/torneo/[id]/page.tsx apps/web/src/messages
git commit -m "feat(torneo): chips de alerta de pendientes (partidos / campeon / goleador)"
```

---

## Task 10: Smoke final + ajustes visuales

- [ ] **Step 1: Build completo del monorepo**

Run: `pnpm build`
Expected: build de shared, api y web sin errores.

- [ ] **Step 2: Recorrida manual (golden path)**

Levantar API + web. Probar en `/prode`, `/ranking`, `/torneo/<id>` que:
- FAQ se abre desde el (?) y muestra los 11 ítems en español.
- Ranking muestra ✓ 🎯 ⚽ por fila (todos en 0 si aún no hay puntuación real).
- Card de progreso refleja partidos pronosticados/pendientes.
- Tabs filtran correctamente.
- Empty state "¡Todo al día!" aparece cuando no hay pendientes.
- Chips de alerta aparecen y navegan a la sección correcta.

- [ ] **Step 3: Commit de tweaks si los hubo**

```bash
git add -p
git commit -m "chore(ui): tweaks visuales de paridad"
```

---

## Notas para el ejecutor

- Si la página `/prode` hoy es **server component**, conviene mantener el data-fetch server-side y montar **un wrapper client** que reciba `items` y `tournament` por props para manejar el estado de `filter` y los picks.
- Las traducciones EN y DE de las nuevas keys quedan a tu criterio editorial (se proveyó la versión ES completa; EN/DE deben respetar el shape y las variables `{n}`, `{date}`, etc.).
- El cálculo de `unpredictedCount` puede vivir del lado client recorriendo la respuesta de `tournamentApi.schedule(id)` si ya trae el flag de "mi predicción".
