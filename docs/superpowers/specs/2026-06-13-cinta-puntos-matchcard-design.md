# Cinta de puntos en MatchCard (partidos finalizados)

**Fecha:** 2026-06-13
**Componente principal:** `apps/web/src/components/prode/MatchCard.tsx`

## Objetivo

Cuando un partido pasa a estado `FINISHED`, mostrar una "banderola" vertical
pegada al borde derecho del card de pronóstico (`MatchCard`) con los puntos que
ese pronóstico le sumó al usuario, con un color distintivo según la calidad del
acierto.

De paso, corregir un texto desactualizado: el indicador "Bonus marcador (+3
pts)" que aparece en partidos abiertos, cuando el bonus por marcador exacto en
realidad vale `POINTS_EXACT_SCORE = 2`.

## Contexto del scoring (estado actual del proyecto)

Constantes en `packages/shared/src/constants/index.ts`:

- `POINTS_CORRECT_RESULT = 3` — acertar L/E/V.
- `POINTS_EXACT_SCORE = 2` — bonus por marcador exacto (además del acierto).
- `CAPTAIN_MULTIPLIER = 2` — multiplica el subtotal del partido capitán.

Totales posibles por partido: **0, 3, 5** (sin capitán) y **6, 10** (capitán).

El cálculo ya existe en `apps/web/src/lib/points-breakdown.ts`
(`pointsBreakdown(pred, match)`), que devuelve `{ winner, exact, captainBonus,
total }` o `null` si el partido no tiene resultado todavía. Se reutiliza tal
cual — no se duplica lógica.

## Comportamiento de la cinta

**Condición de visibilidad:** se renderiza solo cuando:

1. `match.status === MatchStatus.FINISHED`, y
2. `pointsBreakdown(pred, match)` devuelve un valor no-null (hay pick con
   resultado y el partido tiene marcador final).

Si no hay pick, no hay cinta (no hay nada que puntuar).

**Contenido:** el `total` (número grande) + la etiqueta "pts" (chica, debajo).
Texto vía i18n.

**Color (según componentes del breakdown, NO según el monto del total):**

| Caso                                  | Color                    |
|---------------------------------------|--------------------------|
| `exact > 0` (acertó marcador exacto)  | verde (`neon`/`success`) |
| `winner > 0 && exact === 0` (solo L/E/V) | ámbar (`citrus`)      |
| `total === 0` (no acertó)             | rojo (`destructive`)     |

Razón de usar componentes y no el total: un total de `6` puede venir de
`3+exacto` (sin capitán) o de `3 × capitán` (solo resultado). El color debe
reflejar la *calidad* del acierto, no el monto inflado por el multiplicador de
capitán. El número mostrado sigue siendo el `total` real.

**Layout:** el contenedor raíz de `MatchCard` pasa a `relative`. La cinta es un
elemento posicionado contra el borde derecho, de alto similar al bloque
central, con el número y "pts" en orientación vertical/apilada. Debe convivir
con el grid actual (banderas locales/visitante + bloque L/E/V central) sin
desplazar ni recortar ese contenido; en mobile no debe provocar overflow
horizontal. El detalle exacto de posicionamiento se resuelve en implementación
respetando esas invariantes.

## Corrección del texto de bonus

`apps/web/src/messages/es/prode.json`, clave `prode.match.scoreBonus`:

- Actual: `"Bonus marcador (+3 pts)"`.
- Nuevo: interpolar el valor real → `"Bonus marcador (+{points} pts)"`, y en
  `MatchCard.tsx` pasar `{ points: POINTS_EXACT_SCORE }` al `t('scoreBonus', …)`.

Así nunca se vuelve a desincronizar si cambia la constante.

## i18n

Nuevas claves bajo `prode.match` (locale `es`):

- `scoreBonus`: reescrita con interpolación `{points}`.
- `pointsFlag.pts` (o similar): etiqueta "pts" de la cinta.
- (Opcional) `pointsFlag.aria`: label accesible, ej. "Sumaste {points} puntos
  con este pronóstico".

## Accesibilidad

- La cinta lleva un `aria-label` descriptivo (ej. "Sumaste 5 puntos") para que
  el color no sea el único portador de información.
- Contraste de texto suficiente sobre cada color de fondo.

## Testing

- Test de render de `MatchCard` (o de un helper de color extraído) que verifique
  el mapeo color↔breakdown: exacto→verde, solo-winner→ámbar, cero→rojo.
- Verificar que la cinta NO aparece en partidos `PENDING`/`LIVE`/`CANCELLED` ni
  cuando no hay pick.

## Fuera de alcance

- No se toca el `MatchRow` del torneo (otro componente, sin pronóstico inline).
- No se cambia el sistema de puntaje ni las constantes.
- No se fuerza el esquema 6/3/0; se muestra el total real calculado.
