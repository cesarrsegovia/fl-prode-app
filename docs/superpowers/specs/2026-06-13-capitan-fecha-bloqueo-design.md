# Capitán de la fecha: elegible una vez, solo partidos abiertos

**Fecha:** 2026-06-13

## Problema

El selector de "Capitán de la fecha" (dobla puntos del partido elegido) lista TODOS los
partidos de la fecha, incluidos los ya cerrados, y permite cambiar el capitán
libremente guardando otro. Debería: (1) ofrecer solo partidos no comenzados, y (2)
quedar bloqueado una vez confirmado (se elige una vez por fecha).

## Reglas

1. **Solo partidos abiertos son elegibles.** El selector lista únicamente partidos cuyo
   deadline de pronóstico no pasó (`startTime − 1h > now`). Los cerrados desaparecen.
2. **Una vez confirmado, bloqueado.** "Confirmado" = ya existe un pick **guardado** con
   `isCaptain = true` en ese fixture para el usuario. Con capitán confirmado, el selector
   se reemplaza por un indicador read-only del capitán y no se puede cambiar.

No se agrega un flag nuevo al modelo: el estado "confirmado" se deriva de la existencia
de un `Prediction` guardado con `isCaptain=true` en el fixture.

## Backend (`pronosticos.service.ts`)

El `create`/upsert ya rechaza cualquier pick sobre un partido cerrado
(`isMatchPredictionClosed`), así que **marcar capitán en un partido cerrado ya falla**.
Falta cubrir el cambio de un capitán ya confirmado:

Antes del bloque que desmarca otros capitanes (`if (data.isCaptain) ...`), agregar:

```ts
if (data.isCaptain) {
  const existingCaptain = await this.prisma.prediction.findFirst({
    where: {
      userId: data.userId,
      fixtureId: data.fixtureId,
      isCaptain: true,
      matchId: { not: data.matchId },
    },
    select: { id: true },
  });
  if (existingCaptain) {
    throw new BadRequestException(
      'El capitán de esta fecha ya fue confirmado y no se puede cambiar',
    );
  }
}
```

Con esto, el `updateMany` que desmarca otros capitanes solo actúa cuando NO había uno
previo (primera confirmación) — pero como ahora lanzamos antes si ya existe otro, ese
`updateMany` queda efectivamente para el caso de re-guardar el MISMO partido como
capitán (idempotente). Se conserva.

Caso límite: re-guardar el MISMO partido que ya es capitán (mismo `matchId`) no dispara
el error (la query excluye `matchId: { not: data.matchId }`), así que editar el marcador
del partido-capitán sin cambiar el capitán sigue funcionando.

## Frontend (`ProdeForm.tsx`)

Dos derivaciones puras nuevas (testeables, en `lib/captain.ts`):

```ts
// ¿Hay un capitán ya confirmado (guardado) en esta fecha?
export function isCaptainLocked(saved: { isCaptain?: boolean }[]): boolean {
  return saved.some((p) => p.isCaptain === true);
}

// Partidos elegibles como capitán: solo los abiertos.
export function eligibleCaptainMatches<T extends { id: string }>(
  matches: T[],
  isClosed: (id: string) => boolean,
): T[] {
  return matches.filter((m) => !isClosed(m.id));
}
```

En el componente:
- `captainLocked = isCaptainLocked(Object.values(savedPicks))`.
- Si `captainLocked`: en vez del `<select>`, mostrar el capitán confirmado (nombre del
  partido `home vs away`) en modo read-only, con un texto tipo "Capitán confirmado".
- Si no está bloqueado: el `<select>` lista solo `eligibleCaptainMatches(fixture.matches, isMatchClosed)`.
  Se conserva la opción "Sin capitán".
- El bloque de capitán sigue oculto si la fecha está toda cerrada o es eliminatoria
  (condición actual `!allClosed && !isKnockoutFixture`).

Nota: `savedPicks` ya refleja lo persistido (se actualiza en `savePick`/`saveAll`). El
bloqueo aparece recién cuando el capitán fue guardado, no al solo seleccionarlo en el UI
(coherente con "al guardar/confirmar la fecha").

## Unidades

- `isCaptainLocked`, `eligibleCaptainMatches` — funciones puras con tests.
- Validación en `pronosticos.service.create`.
- Render condicional del bloque capitán en `ProdeForm`.

## Testing

- `isCaptainLocked`: true si algún pick tiene isCaptain; false si ninguno / lista vacía.
- `eligibleCaptainMatches`: excluye los cerrados, conserva los abiertos, orden estable.
- Backend: re-marcar capitán distinto con uno ya confirmado → BadRequest; re-guardar el
  mismo partido-capitán → OK. (Test unitario si el service es testeable sin DB; si no,
  se documenta y se cubre con las funciones puras del front + verificación manual.)

## Fuera de alcance

- Cambiar capitán por partido cerrado individual (la regla es "al confirmar la fecha").
- Migrar datos existentes.
- UI para "quitar" un capitán ya confirmado (queda fijo por diseño).
