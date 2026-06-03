// Contrato postMessage entre Prode (iframe) y el shell del casino (parent).
// Outbound: payloads SIN secretos (el token nunca sale de Prode) → target '*' es aceptable
// hasta conocer el origen real del padre. Inbound: SIEMPRE valida origin contra allowlist.

export const EVENTS = {
  // Prode → Casino
  READY: 'prode:ready',
  REQUEST_AUTH: 'prode:request-auth',
  RESIZE: 'prode:resize',
  REQUEST_DEPOSIT: 'prode:request-deposit',
  ERROR: 'prode:error',
  // Casino → Prode
  AUTH: 'casino:auth',
  BACK: 'casino:back',
} as const;

export type EventType = (typeof EVENTS)[keyof typeof EVENTS];

export interface BridgeMessage {
  type: string;
  payload?: Record<string, unknown>;
}

export function parseOrigins(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isAllowedOrigin(origin: string, allow: string[]): boolean {
  return allow.includes(origin);
}

export function buildMessage(type: EventType, payload?: Record<string, unknown>): BridgeMessage {
  return payload ? { type, payload } : { type };
}

export const PARENT_ORIGINS = parseOrigins(process.env.NEXT_PUBLIC_PARENT_ORIGINS || '');

function isEmbedded(): boolean {
  return typeof window !== 'undefined' && window.self !== window.top;
}

// Origen real del padre, fijado por el PRIMER mensaje válido (first-wins) para no
// poder ser "repintado" por otro origen permitido en configuraciones multi-origen.
let lastParentOrigin: string | null = null;
function targetOrigin(): string {
  if (lastParentOrigin) return lastParentOrigin;
  if (PARENT_ORIGINS.length === 1) return PARENT_ORIGINS[0];
  return '*';
}

export function postToParent(type: EventType, payload?: Record<string, unknown>): void {
  if (!isEmbedded()) return;
  window.parent.postMessage(buildMessage(type, payload), targetOrigin());
}

export function requestReauth(): void {
  postToParent(EVENTS.REQUEST_AUTH);
}

let warnedEmptyAllowlist = false;

/** Suscribe a mensajes del padre validando origen. Devuelve función de baja. */
export function onParentMessage(handler: (msg: BridgeMessage) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  if (
    process.env.NODE_ENV !== 'production' &&
    !warnedEmptyAllowlist &&
    isEmbedded() &&
    PARENT_ORIGINS.length === 0
  ) {
    warnedEmptyAllowlist = true;
    console.warn(
      '[bridge] App embebida pero NEXT_PUBLIC_PARENT_ORIGINS está vacío: ' +
        'todos los mensajes del padre se descartarán. Configurá los orígenes del casino.',
    );
  }

  const listener = (event: MessageEvent) => {
    if (!isAllowedOrigin(event.origin, PARENT_ORIGINS)) return;
    const data = event.data as BridgeMessage | undefined;
    if (!data || typeof data.type !== 'string' || !data.type.startsWith('casino:')) return;
    if (!lastParentOrigin) lastParentOrigin = event.origin;
    handler({ type: data.type, payload: data.payload });
  };
  window.addEventListener('message', listener);
  return () => window.removeEventListener('message', listener);
}
