'use client';

import { useSyncExternalStore } from 'react';

// Snapshot estable; no cambia en runtime. Server snapshot = false (evita mismatch de hidratación).
function subscribe() {
  return () => {};
}
function getSnapshot(): boolean {
  return window.self !== window.top;
}
function getServerSnapshot(): boolean {
  return false;
}

/** true si la app corre dentro de un iframe (embebida en el casino). */
export function useIsEmbedded(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
