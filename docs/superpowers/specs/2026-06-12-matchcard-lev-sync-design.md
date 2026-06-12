# MatchCard: etiquetas L/E/V y sincronización marcador ↔ resultado

**Fecha:** 2026-06-12
**Componente:** `apps/web/src/components/prode/MatchCard.tsx`

## Problema

En la tarjeta de partido el usuario puede elegir un ganador con los botones `1 / X / 2`
y, de forma independiente, cargar un marcador en el "Bonus marcador". Hoy ambos no
están relacionados, así que es posible un estado incoherente: elegir Local como ganador
pero cargar un marcador `0-1` (que implica que gana el Visitante).

## Objetivo

1. Renombrar las etiquetas de los botones de resultado: `1 / X / 2` → `L / E / V`
   (Local / Empate / Visitante).
2. Mantener marcador y resultado siempre coherentes mediante sincronización bidireccional
   con autocorrección (decisión del usuario: "Autocorregir resultado").

## Diseño

### Parte 1 — Etiquetas

Cambiar el mapa `RESULT_LABELS`:

```ts
const RESULT_LABELS: Record<Result, string> = {
  [Result.HOME]: 'L',
  [Result.DRAW]: 'E',
  [Result.AWAY]: 'V',
};
```

Los `aria-label` (`pickAria.home/draw/away` = "Gana el local / Empate / Gana el visitante")
no cambian.

### Parte 2 — Sincronización bidireccional

Helper puro para derivar el resultado de un marcador:

```ts
function resultFromScore(home?: number, away?: number): Result | undefined {
  if (home === undefined || away === undefined) return undefined;
  if (home > away) return Result.HOME;
  if (home < away) return Result.AWAY;
  return Result.DRAW;
}
```

**A) Al editar el marcador** (`setScore` / `adjustScore`):
después de actualizar los goles, si ambos campos tienen valor, derivar el `result`
con `resultFromScore` y setearlo. Si algún campo está vacío, no se fuerza el resultado
(se conserva el `result` actual, si lo hubiera).

**B) Al tocar un botón L/E/V** (`setResult`):
ajustar el marcador lo mínimo posible para que sea coherente con el resultado elegido.
Solo se ajusta si **ambos** campos del marcador ya tienen valor; si el marcador está
vacío o incompleto, el botón solo selecciona el resultado sin inventar goles.

Regla de ajuste mínimo (con `h`, `a` = goles actuales home/away):

| Botón | Condición de coherencia | Ajuste si incoherente |
|-------|-------------------------|------------------------|
| L (HOME) | `h > a` | `h = a + 1` (sube solo el local) |
| V (AWAY) | `a > h` | `a = h + 1` (sube solo el visitante) |
| E (DRAW) | `h === a` | igualar al mayor: `h = a = max(h, a)` |

Ejemplos:
- Marcador `0-1`, toca **L** → `2-1`.
- Marcador `1-1`, toca **L** → `2-1`.
- Marcador `0-1`, toca **E** → `1-1`.
- Marcador `2-0`, toca **E** → `2-2`.
- Marcador `1-0`, toca **V** → `1-2`.
- Marcador vacío, toca cualquiera → solo selecciona, sin goles.

Esto resuelve el caso de la foto: cargar `0-1` con Local elegido autoselecciona V;
o tocar L con `0-1` lleva el marcador a `2-1`.

## Implementación

Toda la lógica vive en `MatchCard.tsx`. No cambia el modelo de datos (`MatchPick`),
ni el contrato `onChange`, ni las traducciones. Las tres funciones afectadas son
`setResult`, `setScore` y `adjustScore`, más el helper `resultFromScore`.

## Testing

`resultFromScore` es una función pura y testeable. La lógica de ajuste en `setResult`
también es pura sobre `pick`. Tests unitarios cubriendo la tabla de ejemplos de arriba.
