# Prode embebido en casino (iframe + sesión sin cookie) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que `apps/web` (Prode) se renderice como vista embebida en un casino de terceros vía iframe, con sesión por token JWT en memoria (sin cookies de tercero) y un puente `postMessage`, retirando NextAuth.

**Architecture:** El backend NestJS no cambia (ya expone `/auth/provider-exchange`, `/auth/login` y JWT Bearer). En el web se introduce un store de auth (Zustand) como única fuente de verdad del token, un shim `useSession`/`signIn`/`signOut` compatible con la API de NextAuth para migrar con mínimo riesgo, un bridge `postMessage` con validación de origen, y headers CSP `frame-ancestors`. La app detecta en runtime si está embebida y obtiene el token vía `authorizationCode` (URL o `casino:auth`); standalone (`/auth`) queda reservado a admins.

**Tech Stack:** Next.js 15 (App Router) · React 19 · Zustand 5 · axios · vitest (entorno `node`, solo `*.test.ts`) · next-intl (i18n por cookie).

**Spec:** `docs/superpowers/specs/2026-06-03-prode-embebido-casino-design.md`

**Convención de tests:** `apps/web/vitest.config.mts` usa `include: ['src/**/*.test.ts']` y `environment: 'node'`. NO hay jsdom configurado → los tests son de **lógica pura** en archivos `.test.ts` (sin render de React ni DOM). Por eso cada unidad expone funciones puras testeables.

**Comando de tests (siempre desde la raíz del repo):**
`pnpm --filter @prode/web exec vitest run <ruta>`

---

### Task 1: Helpers de JWT (expiración) + estado de sesión

**Files:**
- Create: `apps/web/src/lib/jwt.ts`
- Test: `apps/web/src/lib/jwt.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```ts
// apps/web/src/lib/jwt.test.ts
import { describe, expect, it } from 'vitest';
import { isTokenExpired, deriveStatus } from './jwt';

// Helper: arma un JWT de juguete con el exp dado (segundos epoch).
function fakeJwt(exp?: number): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify(exp === undefined ? {} : { exp })).toString('base64url');
  return `${header}.${payload}.sig`;
}

describe('isTokenExpired', () => {
  it('true si exp ya pasó', () => {
    expect(isTokenExpired(fakeJwt(1000), 2000 * 1000)).toBe(true);
  });
  it('false si exp es futuro', () => {
    expect(isTokenExpired(fakeJwt(5000), 1000 * 1000)).toBe(false);
  });
  it('false si no hay exp (token no expira)', () => {
    expect(isTokenExpired(fakeJwt(undefined), 1000 * 1000)).toBe(false);
  });
  it('true si el token está malformado', () => {
    expect(isTokenExpired('no-es-un-jwt', 0)).toBe(true);
  });
});

describe('deriveStatus', () => {
  const session = { accessToken: fakeJwt(5000), user: { id: 'u1', username: 'a', isAdmin: false } };
  it('loading antes de hidratar', () => {
    expect(deriveStatus(session, 0, false)).toBe('loading');
  });
  it('unauthenticated si no hay sesión', () => {
    expect(deriveStatus(null, 0, true)).toBe('unauthenticated');
  });
  it('unauthenticated si el token expiró', () => {
    expect(deriveStatus(session, 9999 * 1000, true)).toBe('unauthenticated');
  });
  it('authenticated si hay sesión y token vigente', () => {
    expect(deriveStatus(session, 1000 * 1000, true)).toBe('authenticated');
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `pnpm --filter @prode/web exec vitest run src/lib/jwt.test.ts`
Expected: FAIL con "Cannot find module './jwt'".

- [ ] **Step 3: Implementación mínima**

```ts
// apps/web/src/lib/jwt.ts
import type { AuthSession, AuthStatus } from '@/store/auth';

function decodeBase64Url(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  if (typeof atob === 'function') return atob(base64);
  return Buffer.from(base64, 'base64').toString('binary');
}

/** true si el JWT está expirado o es inválido. Sin claim `exp` → no expira. */
export function isTokenExpired(token: string, nowMs: number): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) return true;
  try {
    const payload = JSON.parse(decodeBase64Url(parts[1])) as { exp?: number };
    if (typeof payload.exp !== 'number') return false;
    return payload.exp * 1000 <= nowMs;
  } catch {
    return true;
  }
}

/** Deriva el estado estilo NextAuth a partir del store. */
export function deriveStatus(
  session: AuthSession | null,
  nowMs: number,
  hydrated: boolean,
): AuthStatus {
  if (!hydrated) return 'loading';
  if (!session) return 'unauthenticated';
  if (isTokenExpired(session.accessToken, nowMs)) return 'unauthenticated';
  return 'authenticated';
}
```

> Nota: este archivo importa tipos de `@/store/auth` (Task 2). Implementar Task 2 inmediatamente después; el test de Task 1 compila igual porque los tipos son `import type` y el bundler de vitest los resuelve una vez creado el store. Si preferís, hacé Task 2 antes que Task 1.

- [ ] **Step 4: Correr el test y verificar que pasa** (tras crear el store en Task 2)

Run: `pnpm --filter @prode/web exec vitest run src/lib/jwt.test.ts`
Expected: PASS (4 + 4 asserts).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/jwt.ts apps/web/src/lib/jwt.test.ts
git commit -m "feat(web): helpers de expiración de JWT y derivación de estado de sesión"
```

---

### Task 2: Store de auth (Zustand) — única fuente de verdad del token

**Files:**
- Create: `apps/web/src/store/auth.ts`
- Test: `apps/web/src/store/auth.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```ts
// apps/web/src/store/auth.test.ts
import { describe, expect, it, beforeEach } from 'vitest';
import { useAuthStore, getValidToken } from './auth';

const session = {
  accessToken: 'tok-123',
  user: { id: 'u1', username: 'neo', isAdmin: false },
};

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ session: null, hydrated: false });
  });

  it('setSession guarda la sesión', () => {
    useAuthStore.getState().setSession(session);
    expect(useAuthStore.getState().session).toEqual(session);
  });

  it('clear borra la sesión', () => {
    useAuthStore.getState().setSession(session);
    useAuthStore.getState().clear();
    expect(useAuthStore.getState().session).toBeNull();
  });

  it('getValidToken devuelve el token si no expiró', () => {
    useAuthStore.getState().setSession(session); // tok-123 no tiene exp → no expira
    expect(getValidToken()).toBe('tok-123');
  });

  it('getValidToken devuelve null sin sesión', () => {
    expect(getValidToken()).toBeNull();
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `pnpm --filter @prode/web exec vitest run src/store/auth.test.ts`
Expected: FAIL con "Cannot find module './auth'".

- [ ] **Step 3: Implementación mínima**

```ts
// apps/web/src/store/auth.ts
import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { isTokenExpired } from '@/lib/jwt';

export interface AuthUser {
  id: string;
  username: string;
  isAdmin: boolean;
  email?: string | null;
  name?: string | null;
  image?: string | null;
}

export interface AuthSession {
  accessToken: string;
  user: AuthUser;
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  session: AuthSession | null;
  hydrated: boolean;
  setSession: (session: AuthSession | null) => void;
  clear: () => void;
  setHydrated: () => void;
}

// sessionStorage en cliente; noop en server para no romper SSR/tests node.
const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};
const storage = createJSONStorage<{ session: AuthSession | null }>(() =>
  typeof window !== 'undefined' ? window.sessionStorage : noopStorage,
);

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      hydrated: false,
      setSession: (session) => set({ session }),
      clear: () => set({ session: null }),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'prode.auth',
      storage,
      partialize: (s) => ({ session: s.session }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);

/** Token vigente o null (no-React, seguro para importar en el cliente axios). */
export function getValidToken(): string | null {
  const session = useAuthStore.getState().session;
  if (!session) return null;
  if (isTokenExpired(session.accessToken, Date.now())) return null;
  return session.accessToken;
}
```

- [ ] **Step 4: Correr ambos tests y verificar que pasan**

Run: `pnpm --filter @prode/web exec vitest run src/store/auth.test.ts src/lib/jwt.test.ts`
Expected: PASS en los dos archivos.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/store/auth.ts apps/web/src/store/auth.test.ts
git commit -m "feat(web): store de auth (token JWT en memoria + persistencia sessionStorage)"
```

---

### Task 3: Bridge postMessage (contrato + validación de origen)

**Files:**
- Create: `apps/web/src/lib/bridge.ts`
- Test: `apps/web/src/lib/bridge.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```ts
// apps/web/src/lib/bridge.test.ts
import { describe, expect, it } from 'vitest';
import { parseOrigins, isAllowedOrigin, buildMessage, EVENTS } from './bridge';

describe('parseOrigins', () => {
  it('separa por coma y limpia espacios/vacíos', () => {
    expect(parseOrigins(' https://a.com , https://b.com ,, ')).toEqual([
      'https://a.com',
      'https://b.com',
    ]);
  });
  it('string vacío → []', () => {
    expect(parseOrigins('')).toEqual([]);
  });
});

describe('isAllowedOrigin', () => {
  const allow = ['https://casino.com'];
  it('acepta origen en allowlist', () => {
    expect(isAllowedOrigin('https://casino.com', allow)).toBe(true);
  });
  it('rechaza origen fuera de allowlist', () => {
    expect(isAllowedOrigin('https://evil.com', allow)).toBe(false);
  });
  it('rechaza con allowlist vacía', () => {
    expect(isAllowedOrigin('https://casino.com', [])).toBe(false);
  });
});

describe('buildMessage', () => {
  it('sin payload', () => {
    expect(buildMessage(EVENTS.READY)).toEqual({ type: 'prode:ready' });
  });
  it('con payload', () => {
    expect(buildMessage(EVENTS.RESIZE, { height: 800 })).toEqual({
      type: 'prode:resize',
      payload: { height: 800 },
    });
  });
});

describe('EVENTS', () => {
  it('expone el contrato esperado', () => {
    expect(EVENTS).toMatchObject({
      READY: 'prode:ready',
      REQUEST_AUTH: 'prode:request-auth',
      RESIZE: 'prode:resize',
      REQUEST_DEPOSIT: 'prode:request-deposit',
      ERROR: 'prode:error',
      AUTH: 'casino:auth',
      BACK: 'casino:back',
    });
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `pnpm --filter @prode/web exec vitest run src/lib/bridge.test.ts`
Expected: FAIL con "Cannot find module './bridge'".

- [ ] **Step 3: Implementación mínima**

```ts
// apps/web/src/lib/bridge.ts
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

export function buildMessage(type: string, payload?: Record<string, unknown>): BridgeMessage {
  return payload ? { type, payload } : { type };
}

export const PARENT_ORIGINS = parseOrigins(process.env.NEXT_PUBLIC_PARENT_ORIGINS || '');

function isEmbedded(): boolean {
  return typeof window !== 'undefined' && window.self !== window.top;
}

let lastParentOrigin: string | null = null;
function targetOrigin(): string {
  if (lastParentOrigin) return lastParentOrigin;
  if (PARENT_ORIGINS.length === 1) return PARENT_ORIGINS[0];
  return '*';
}

export function postToParent(type: string, payload?: Record<string, unknown>): void {
  if (!isEmbedded()) return;
  window.parent.postMessage(buildMessage(type, payload), targetOrigin());
}

export function requestReauth(): void {
  postToParent(EVENTS.REQUEST_AUTH);
}

/** Suscribe a mensajes del padre validando origen. Devuelve función de baja. */
export function onParentMessage(handler: (msg: BridgeMessage) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const listener = (event: MessageEvent) => {
    if (!isAllowedOrigin(event.origin, PARENT_ORIGINS)) return;
    const data = event.data as BridgeMessage | undefined;
    if (!data || typeof data.type !== 'string' || !data.type.startsWith('casino:')) return;
    lastParentOrigin = event.origin;
    handler({ type: data.type, payload: data.payload });
  };
  window.addEventListener('message', listener);
  return () => window.removeEventListener('message', listener);
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `pnpm --filter @prode/web exec vitest run src/lib/bridge.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/bridge.ts apps/web/src/lib/bridge.test.ts
git commit -m "feat(web): bridge postMessage con contrato de eventos y validación de origen"
```

---

### Task 4: Shim de sesión compatible con NextAuth (`useSession`/`signIn`/`signOut`)

**Files:**
- Create: `apps/web/src/lib/session.tsx`
- Test: `apps/web/src/lib/session.test.ts`

- [ ] **Step 1: Escribir el test que falla** (testeamos el mapper puro `toSession`)

```ts
// apps/web/src/lib/session.test.ts
import { describe, expect, it } from 'vitest';
import { toSession } from './session';

describe('toSession', () => {
  it('mapea la respuesta del login a AuthSession', () => {
    const data = {
      accessToken: 'tok',
      user: { id: 'u1', email: 'a@b.com', username: 'neo', isAdmin: true },
    };
    expect(toSession(data)).toEqual({
      accessToken: 'tok',
      user: {
        id: 'u1',
        username: 'neo',
        isAdmin: true,
        email: 'a@b.com',
        name: 'neo',
        image: null,
      },
    });
  });

  it('usa el id como username cuando el provider no manda username', () => {
    const data = { accessToken: 'tok', user: { id: 'u2', isAdmin: false } };
    const s = toSession(data);
    expect(s.user.username).toBe('u2');
    expect(s.user.isAdmin).toBe(false);
    expect(s.user.email).toBeNull();
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `pnpm --filter @prode/web exec vitest run src/lib/session.test.ts`
Expected: FAIL con "Cannot find module './session'".

> El archivo es `.tsx` pero el test importa solo la función pura `toSession`. vitest resuelve `./session` → `session.tsx` por la config de resolución de Next/Vite. Si vitest no resolviera `.tsx`, mover `toSession` y los tipos a un `session-core.ts` e importar desde ahí en ambos. Verificar en Step 4.

- [ ] **Step 3: Implementación mínima**

```tsx
// apps/web/src/lib/session.tsx
'use client';

import { useAuthStore, type AuthSession } from '@/store/auth';
import { deriveStatus } from '@/lib/jwt';

export { getValidToken as getToken } from '@/store/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000/api';

interface ApiAuthResponse {
  accessToken: string;
  user: { id: string; email?: string | null; username?: string | null; isAdmin?: boolean };
}

/** Mapea la respuesta de /auth/login | /auth/provider-exchange a la sesión interna. */
export function toSession(data: ApiAuthResponse): AuthSession {
  const username = data.user.username ?? data.user.id;
  return {
    accessToken: data.accessToken,
    user: {
      id: data.user.id,
      username,
      isAdmin: !!data.user.isAdmin,
      email: data.user.email ?? null,
      name: username,
      image: null,
    },
  };
}

export type SignInResult = { ok: true } | { error: string };

/**
 * Compatible en firma con next-auth `signIn`. Soporta:
 *  - 'credentials'      → POST /auth/login            (admins)
 *  - 'provider-launch'  → POST /auth/provider-exchange (usuarios del casino)
 */
export async function signIn(
  provider: 'credentials' | 'provider-launch',
  creds: { email?: string; password?: string; authorizationCode?: string; redirect?: boolean },
): Promise<SignInResult> {
  try {
    let res: Response;
    if (provider === 'credentials') {
      res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: creds.email, password: creds.password }),
      });
    } else {
      res = await fetch(`${API_URL}/auth/provider-exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorizationCode: creds.authorizationCode }),
      });
    }
    if (!res.ok) return { error: 'CredentialsSignin' };
    const data = (await res.json()) as ApiAuthResponse;
    useAuthStore.getState().setSession(toSession(data));
    return { ok: true };
  } catch {
    return { error: 'Connection' };
  }
}

/** Compatible en firma con next-auth `signOut`. */
export function signOut(opts?: { callbackUrl?: string }): void {
  useAuthStore.getState().clear();
  if (typeof window !== 'undefined') {
    window.location.href = opts?.callbackUrl ?? '/';
  }
}

export interface SessionView {
  data: AuthSession | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
}

/** Hook compatible con next-auth `useSession()` respaldado por el store. */
export function useSession(): SessionView {
  const session = useAuthStore((s) => s.session);
  const hydrated = useAuthStore((s) => s.hydrated);
  const status = deriveStatus(session, Date.now(), hydrated);
  return { data: status === 'authenticated' ? session : null, status };
}

/** Reemplaza al SessionProvider de next-auth. El store es global; solo pasa children. */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `pnpm --filter @prode/web exec vitest run src/lib/session.test.ts`
Expected: PASS. Si falla por no resolver `.tsx`, extraer `toSession`, `ApiAuthResponse` y `AuthSession` re-export a `apps/web/src/lib/session-core.ts`, importarlos en `session.tsx` y en el test, y re-correr.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/session.tsx apps/web/src/lib/session.test.ts
git commit -m "feat(web): shim de sesión compatible con NextAuth respaldado por el store"
```

---

### Task 5: Cliente API — token desde el store + re-auth en 401

**Files:**
- Modify: `apps/web/src/lib/api.ts`

- [ ] **Step 1: Reemplazar el contenido de `api.ts`**

Reemplazar TODO el archivo `apps/web/src/lib/api.ts` por:

```ts
import axios from 'axios';
import { getValidToken, useAuthStore } from '@/store/auth';
import { requestReauth } from '@/lib/bridge';

// Singleton para queries del lado cliente.
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Inyecta el JWT (del store) en cada request.
apiClient.interceptors.request.use(
  (config) => {
    const token = getValidToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// En 401: limpiar sesión y, si estamos embebidos, pedir code fresco al casino.
apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401) {
      useAuthStore.getState().clear();
      requestReauth();
    }
    return Promise.reject(error);
  },
);

// Helper server-side (RSC / Server Actions) — sin auth, igual que antes.
export async function serverFetch(path: string, options?: RequestInit) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000/api';
  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
}
```

- [ ] **Step 2: Verificar typecheck del paquete web**

Run: `pnpm --filter @prode/web exec tsc --noEmit`
Expected: sin errores nuevos relacionados a `api.ts` (puede haber errores preexistentes en archivos aún no migrados que usan `next-auth`; se resuelven en Task 7/9).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/api.ts
git commit -m "feat(web): interceptor axios lee token del store y dispara re-auth en 401"
```

---

### Task 6: Hook de detección de iframe + BridgeProvider

**Files:**
- Create: `apps/web/src/hooks/useEmbed.ts`
- Create: `apps/web/src/components/providers/BridgeProvider.tsx`

- [ ] **Step 1: Crear el hook de detección**

```ts
// apps/web/src/hooks/useEmbed.ts
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
```

- [ ] **Step 2: Crear el BridgeProvider**

```tsx
// apps/web/src/components/providers/BridgeProvider.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onParentMessage, postToParent, EVENTS } from '@/lib/bridge';
import { useIsEmbedded } from '@/hooks/useEmbed';
import { signIn } from '@/lib/session';

/**
 * Monta el puente postMessage cuando la app está embebida:
 *  - emite `prode:ready` y `prode:resize` (ResizeObserver)
 *  - escucha `casino:auth` (canjea authorizationCode) y `casino:back`
 */
export function BridgeProvider({ children }: { children: React.ReactNode }) {
  const embedded = useIsEmbedded();
  const router = useRouter();

  useEffect(() => {
    if (!embedded) return;

    postToParent(EVENTS.READY);

    const off = onParentMessage((msg) => {
      if (msg.type === EVENTS.AUTH) {
        const code = msg.payload?.authorizationCode as string | undefined;
        const locale = msg.payload?.locale as string | undefined;
        if (locale) {
          document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=31536000;SameSite=None;Secure`;
        }
        if (code) void signIn('provider-launch', { authorizationCode: code });
      } else if (msg.type === EVENTS.BACK) {
        router.back();
      }
    });

    const emitResize = () =>
      postToParent(EVENTS.RESIZE, { height: document.body.scrollHeight });
    const ro = new ResizeObserver(() => requestAnimationFrame(emitResize));
    ro.observe(document.body);
    emitResize();

    return () => {
      off();
      ro.disconnect();
    };
  }, [embedded, router]);

  return <>{children}</>;
}
```

- [ ] **Step 3: Verificar typecheck**

Run: `pnpm --filter @prode/web exec tsc --noEmit`
Expected: sin errores nuevos en `useEmbed.ts` / `BridgeProvider.tsx`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/hooks/useEmbed.ts apps/web/src/components/providers/BridgeProvider.tsx
git commit -m "feat(web): detección de iframe + BridgeProvider (ready/resize/casino:auth/back)"
```

---

### Task 7: Migrar imports de NextAuth al shim + ajustar guards

**Files (Modify):**
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/(main)/layout.tsx`
- `apps/web/src/app/admin/layout.tsx`
- `apps/web/src/components/providers/RealtimeProvider.tsx`
- `apps/web/src/components/layout/Navbar.tsx`
- `apps/web/src/components/layout/BottomNav.tsx`
- `apps/web/src/app/(main)/grupos/[id]/page.tsx`
- `apps/web/src/app/(main)/home/page.tsx`
- `apps/web/src/app/(main)/perfil/[userId]/page.tsx`
- `apps/web/src/app/(main)/ranking/page.tsx`
- `apps/web/src/app/admin/usuarios/page.tsx`
- `apps/web/src/app/invitacion/[code]/page.tsx`
- `apps/web/src/components/partido/VsFriends.tsx`
- `apps/web/src/hooks/useNotifications.ts`
- `apps/web/src/app/(auth)/auth/page.tsx`

- [ ] **Step 1: Reemplazo masivo del import en todos los archivos client**

Ejecutar este script PowerShell desde la raíz del repo (cambia `from 'next-auth/react'` por `from '@/lib/session'` en todo `apps/web/src`, sin tocar `.json` ni los archivos que se eliminan en Task 9):

```powershell
Get-ChildItem -Path apps/web/src -Recurse -Include *.ts,*.tsx |
  Where-Object { $_.FullName -notmatch 'next-auth.d.ts' -and $_.FullName -notmatch '\\api\\auth\\' -and $_.Name -ne 'auth.ts' } |
  ForEach-Object {
    $c = Get-Content $_.FullName -Raw
    if ($c -match "from 'next-auth/react'") {
      ($c -replace "from 'next-auth/react'", "from '@/lib/session'") |
        Set-Content -Path $_.FullName -Encoding utf8 -NoNewline
      Write-Output "patched $($_.FullName)"
    }
  }
```

Expected: imprime cada archivo migrado (los 13 con `useSession`/`signIn`/`signOut` + `auth/page.tsx`).

- [ ] **Step 2: Reemplazar `AuthProvider` por `SessionProvider` + montar `BridgeProvider` en el root layout**

En `apps/web/src/app/layout.tsx`:

Reemplazar la línea:
```tsx
import { AuthProvider } from '@/components/providers/AuthProvider';
```
por:
```tsx
import { SessionProvider } from '@/lib/session';
import { BridgeProvider } from '@/components/providers/BridgeProvider';
```

Y reemplazar el bloque de providers:
```tsx
          <AuthProvider>
            <RealtimeProvider>
              <Navbar />
              <div id="main-content" tabIndex={-1} className="flex-1 relative z-10 pb-nav md:pb-0 outline-none">
                {children}
              </div>
              <Footer />
              <BottomNav />
            </RealtimeProvider>
          </AuthProvider>
```
por:
```tsx
          <SessionProvider>
            <BridgeProvider>
              <RealtimeProvider>
                <Navbar />
                <div id="main-content" tabIndex={-1} className="flex-1 relative z-10 pb-nav md:pb-0 outline-none">
                  {children}
                </div>
                <Footer />
                <BottomNav />
              </RealtimeProvider>
            </BridgeProvider>
          </SessionProvider>
```

- [ ] **Step 3: Ajustar `RealtimeProvider` al nuevo shape de `useSession`**

El shape (`{ data, status }`, `session.accessToken`, `session.user.id`) es idéntico, así que el único cambio es el import (ya hecho en Step 1). Verificar que `apps/web/src/components/providers/RealtimeProvider.tsx` quedó con `import { useSession } from '@/lib/session';` y nada más por tocar.

- [ ] **Step 4: Guard de `(main)/layout.tsx` — no mandar a /auth si está embebido**

Reemplazar TODO el contenido de `apps/web/src/app/(main)/layout.tsx` por:

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/session';
import { useIsEmbedded } from '@/hooks/useEmbed';
import { requestReauth } from '@/lib/bridge';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession();
  const embedded = useIsEmbedded();
  const router = useRouter();

  useEffect(() => {
    if (status !== 'unauthenticated') return;
    if (embedded) {
      // Embebido: pedir un authorizationCode fresco al casino en vez de /auth.
      requestReauth();
    } else {
      router.replace('/auth');
    }
  }, [status, embedded, router]);

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="pt-24 px-4 max-w-3xl mx-auto">
        <div
          className="h-64 rounded-2xl animate-pulse"
          style={{ background: 'var(--surface-container-low)' }}
        />
      </div>
    );
  }

  return <>{children}</>;
}
```

- [ ] **Step 5: Navbar — ocultar login/registro de invitado cuando está embebido**

En `apps/web/src/components/layout/Navbar.tsx`:

Agregar el import (debajo de los imports existentes):
```tsx
import { useIsEmbedded } from '@/hooks/useEmbed';
```

Dentro de `Navbar()`, después de `const isAdmin = ...`:
```tsx
  const embedded = useIsEmbedded();
```

Reemplazar el bloque de invitado (el `) : (` … `</>` que muestra los dos `<Link href="/auth">`) para que no se muestre embebido:
```tsx
        ) : embedded ? null : (
          <>
            <Link href="/auth">
              <Button variant="ghost" className="font-display font-semibold">
                {t('auth.login')}
              </Button>
            </Link>
            <Link href="/auth">
              <Button className="font-display font-semibold">
                {t('auth.register')}
              </Button>
            </Link>
          </>
        )}
```

- [ ] **Step 6: Verificar typecheck y tests**

Run: `pnpm --filter @prode/web exec tsc --noEmit`
Expected: sin errores en archivos migrados. (Pueden quedar errores SOLO en `lib/auth.ts`, `app/api/auth/[...nextauth]/route.ts`, `types/next-auth.d.ts` y `AuthProvider.tsx` que se eliminan en Task 9.)

Run: `pnpm --filter @prode/web exec vitest run`
Expected: PASS (incluye los tests nuevos y los preexistentes).

- [ ] **Step 7: Commit**

```bash
git add apps/web/src
git commit -m "refactor(web): migrar de next-auth/react al shim de sesión + guards embebido-aware"
```

---

### Task 8: Reescribir `/launch` para canjear contra el shim

**Files:**
- Modify: `apps/web/src/app/launch/page.tsx`

- [ ] **Step 1: Cambiar el import de `signIn`**

En `apps/web/src/app/launch/page.tsx` reemplazar:
```tsx
import { signIn } from 'next-auth/react';
```
por:
```tsx
import { signIn } from '@/lib/session';
```

- [ ] **Step 2: Ajustar el manejo del resultado de `signIn`**

El shim devuelve `{ ok: true }` o `{ error }` (en vez del objeto de next-auth). Reemplazar el bloque `.then(...)`:
```tsx
      .then((res) => {
        if (!res || res.error) {
          setError('No se pudo validar la sesión con la plataforma');
          return;
        }
        router.replace(next);
      })
```
por:
```tsx
      .then((res) => {
        if (!('ok' in res) || !res.ok) {
          setError('No se pudo validar la sesión con la plataforma');
          return;
        }
        router.replace(next);
      })
```

Y eliminar el segundo argumento `{ redirect: false }` no es necesario, pero el shim lo acepta; dejar la llamada como:
```tsx
    signIn('provider-launch', {
      authorizationCode: code,
      redirect: false,
    })
```

- [ ] **Step 3: Verificar typecheck**

Run: `pnpm --filter @prode/web exec tsc --noEmit`
Expected: sin errores en `launch/page.tsx`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/launch/page.tsx
git commit -m "refactor(web): /launch canjea authorizationCode vía el shim (sin next-auth)"
```

---

### Task 9: Retirar NextAuth por completo

**Files:**
- Delete: `apps/web/src/lib/auth.ts`
- Delete: `apps/web/src/app/api/auth/[...nextauth]/route.ts` (y la carpeta `[...nextauth]` y `api/auth` si quedan vacías)
- Delete: `apps/web/src/components/providers/AuthProvider.tsx`
- Delete: `apps/web/src/types/next-auth.d.ts`
- Modify: `apps/web/package.json` (quitar dependencia `next-auth`)

- [ ] **Step 1: Borrar los archivos de NextAuth**

```powershell
Remove-Item -Force apps/web/src/lib/auth.ts
Remove-Item -Force apps/web/src/components/providers/AuthProvider.tsx
Remove-Item -Force apps/web/src/types/next-auth.d.ts
Remove-Item -Recurse -Force "apps/web/src/app/api/auth/[...nextauth]"
```

Luego, si `apps/web/src/app/api/auth` y `apps/web/src/app/api` quedaron vacías, borrarlas:
```powershell
if ((Get-ChildItem 'apps/web/src/app/api/auth' -Force -ErrorAction SilentlyContinue | Measure-Object).Count -eq 0) { Remove-Item -Recurse -Force 'apps/web/src/app/api/auth' }
if ((Get-ChildItem 'apps/web/src/app/api' -Force -ErrorAction SilentlyContinue | Measure-Object).Count -eq 0) { Remove-Item -Recurse -Force 'apps/web/src/app/api' }
```

- [ ] **Step 2: Quitar la dependencia `next-auth`**

```bash
pnpm --filter @prode/web remove next-auth
```
Expected: actualiza `apps/web/package.json` y `pnpm-lock.yaml`.

- [ ] **Step 3: Confirmar que no queda ninguna referencia a next-auth**

Run (Grep): buscar `next-auth` en `apps/web/src`.
Expected: **0 resultados** (ni en `.ts`/`.tsx`; los `.json` de mensajes contienen la palabra "grupos"/textos, no `next-auth`).

Si aparece alguna, corregir el import al shim `@/lib/session` o eliminar el uso.

- [ ] **Step 4: Verificar typecheck, lint, tests y build**

```bash
pnpm --filter @prode/web exec tsc --noEmit
pnpm --filter @prode/web run lint
pnpm --filter @prode/web exec vitest run
pnpm --filter @prode/web run build
```
Expected: todos PASS. El `build` valida que no haya imports rotos ni rutas faltantes.

- [ ] **Step 5: Commit**

```bash
git add -A apps/web
git commit -m "chore(web): retirar NextAuth por completo (store + shim son la fuente de verdad)"
```

---

### Task 10: Headers CSP `frame-ancestors`

**Files:**
- Modify: `apps/web/next.config.ts`

- [ ] **Step 1: Agregar `headers()` con CSP en `next.config.ts`**

Reemplazar el objeto `nextConfig` para incluir `headers()`. El bloque completo del archivo `apps/web/next.config.ts` queda:

```ts
import type { NextConfig } from 'next';
import path from 'node:path';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');
const workspaceRoot = path.resolve(process.cwd(), '../..');

// Orígenes del casino autorizados a embeber Prode (coma-separados).
const parentOrigins = (process.env.NEXT_PUBLIC_PARENT_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const frameAncestors = parentOrigins.length ? parentOrigins.join(' ') : "'none'";

const nextConfig: NextConfig = {
  outputFileTracingRoot: workspaceRoot,
  turbopack: {
    root: workspaceRoot,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'flagcdn.com' },
      { protocol: 'https', hostname: 'api.dicebear.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'media.api-sports.io' },
    ],
  },
  transpilePackages: ['@prode/shared'],
  async headers() {
    return [
      {
        // La app de usuario es embebible por los orígenes del casino.
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `frame-ancestors ${frameAncestors};`,
          },
        ],
      },
      {
        // El panel admin NO debe ser embebible.
        source: '/admin/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none';" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
```

- [ ] **Step 2: Verificar que el build aplica headers**

Run: `pnpm --filter @prode/web run build`
Expected: build OK (los headers se validan en build).

- [ ] **Step 3: Commit**

```bash
git add apps/web/next.config.ts
git commit -m "feat(web): CSP frame-ancestors para permitir embeber Prode en el casino"
```

---

### Task 11: Documentar env + harness manual "mock casino"

**Files:**
- Create/Modify: `apps/web/.env.example`
- Create: `apps/web/public/mock-casino.html`

- [ ] **Step 1: Documentar la variable de entorno**

Agregar (o crear el archivo si no existe) en `apps/web/.env.example`:

```bash
# URL base de la API NestJS
NEXT_PUBLIC_API_URL=http://127.0.0.1:4000/api
# URL del WebSocket
NEXT_PUBLIC_WS_URL=http://localhost:4000
# Orígenes del casino autorizados a embeber Prode (coma-separados, sin / final)
# Ej: https://casino.com,https://staging.casino.com
NEXT_PUBLIC_PARENT_ORIGINS=
```

> Si ya existe `.env.example` con otras claves, solo agregar la línea `NEXT_PUBLIC_PARENT_ORIGINS` y su comentario.

- [ ] **Step 2: Crear el harness "mock casino"**

```html
<!-- apps/web/public/mock-casino.html -->
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Mock Casino — embeber Prode</title>
    <style>
      body { font-family: system-ui, sans-serif; margin: 0; background: #0b0b0f; color: #eaeaea; }
      header { padding: 12px 16px; background: #15151c; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
      input, button { font: inherit; padding: 8px 10px; border-radius: 8px; border: 1px solid #333; background: #1d1d27; color: #eaeaea; }
      button { cursor: pointer; }
      #log { height: 120px; overflow: auto; background: #0e0e14; padding: 8px 16px; font: 12px/1.5 monospace; white-space: pre-wrap; }
      iframe { width: 100%; height: calc(100vh - 220px); border: 0; display: block; }
    </style>
  </head>
  <body>
    <header>
      <strong>Mock Casino</strong>
      <input id="origin" size="34" placeholder="origen Prode (ej http://localhost:3000)" value="http://localhost:3000" />
      <input id="code" size="24" placeholder="authorizationCode de prueba" />
      <button id="load">Cargar iframe</button>
      <button id="auth">Enviar casino:auth</button>
      <button id="back">Enviar casino:back</button>
    </header>
    <div id="log"></div>
    <iframe id="frame" title="Prode"></iframe>
    <script>
      const log = (m) => {
        const el = document.getElementById('log');
        el.textContent += m + '\n';
        el.scrollTop = el.scrollHeight;
      };
      const frame = document.getElementById('frame');
      const prodeOrigin = () => document.getElementById('origin').value.trim();

      document.getElementById('load').onclick = () => {
        frame.src = prodeOrigin() + '/launch';
        log('iframe → ' + frame.src);
      };
      document.getElementById('auth').onclick = () => {
        frame.contentWindow.postMessage(
          { type: 'casino:auth', payload: { authorizationCode: document.getElementById('code').value, locale: 'es' } },
          prodeOrigin(),
        );
        log('→ casino:auth enviado');
      };
      document.getElementById('back').onclick = () => {
        frame.contentWindow.postMessage({ type: 'casino:back' }, prodeOrigin());
        log('→ casino:back enviado');
      };
      // Loguea todo lo que Prode emite (prode:*).
      window.addEventListener('message', (e) => {
        if (e.data && typeof e.data.type === 'string' && e.data.type.startsWith('prode:')) {
          log('← ' + e.data.type + ' ' + JSON.stringify(e.data.payload ?? {}));
        }
      });
    </script>
  </body>
</html>
```

- [ ] **Step 3: Probar manualmente el flujo end-to-end**

1. Arrancar API y web: `pnpm dev` (desde la raíz).
2. Configurar `apps/web/.env` (o `.env.local`) con `NEXT_PUBLIC_PARENT_ORIGINS` incluyendo el origen donde servirás el mock (p. ej. `http://localhost:3000` si abrís el HTML desde el propio Next via `http://localhost:3000/mock-casino.html`). Reiniciar `pnpm dev` si cambiaste env.
3. Abrir `http://localhost:3000/mock-casino.html`.
4. Click "Cargar iframe" → debe verse `/launch` y en el log debe aparecer `← prode:ready` y `← prode:request-auth` (no hay code en URL).
5. Pegar un `authorizationCode` válido de prueba en el input y click "Enviar casino:auth" → Prode debe canjearlo y navegar a `/home` dentro del iframe; deben aparecer eventos `← prode:resize`.
6. Click "Enviar casino:back" → el iframe debe navegar atrás.

Expected: el flujo arranca, autentica vía postMessage, redimensiona y responde al back. (El canje real requiere que el backend tenga la integración provider habilitada; con `PROVIDER` deshabilitado el exchange responderá error y se verá el estado de error de `/launch` — esperado en dev sin padre.)

- [ ] **Step 4: Commit**

```bash
git add apps/web/.env.example apps/web/public/mock-casino.html
git commit -m "docs(web): env NEXT_PUBLIC_PARENT_ORIGINS + harness manual mock-casino"
```

---

## Self-Review

**1. Cobertura de la spec:**
- iframe / detección embebido → Task 6 (`useEmbed`) ✓
- sesión sin cookie / store / persistencia sessionStorage → Task 2 ✓
- shim `useSession`/`signIn`/`signOut` compatible → Task 4 ✓
- retiro de NextAuth → Task 9 ✓
- contrato postMessage (eventos prode:/casino:, validación origen) → Task 3 ✓
- flujo de arranque (URL code / casino:auth / request-auth / reload) → Task 6 + Task 7 (guard main) + Task 8 (launch) ✓
- 401 → re-auth → Task 5 ✓
- login admin standalone (`/auth` vía `credentials`) → Task 7 (migración de `auth/page.tsx`) ✓; `/admin` no embebible → Task 10 ✓
- CSP frame-ancestors → Task 10 ✓
- hook de depósito (`prode:request-deposit` solo emitido) → `EVENTS.REQUEST_DEPOSIT` definido en Task 3 (sin UI, por diseño) ✓
- testing unit (origen, store, expiración, mapper) + harness manual → Tasks 1-4 + Task 11 ✓

**2. Placeholders:** Sin TBD/TODO; todo el código está completo en cada step.

**3. Consistencia de tipos:** `AuthSession`/`AuthUser`/`AuthStatus` definidos en Task 2 y usados en Tasks 1/4/5; `EVENTS`/`BridgeMessage`/`postToParent`/`requestReauth`/`onParentMessage` definidos en Task 3 y usados en Tasks 5/6/7; `signIn`/`signOut`/`useSession`/`getToken`/`toSession` definidos en Task 4 y usados en Tasks 6/7/8. `getValidToken` (store) usado por `api.ts` (Task 5) y re-exportado como `getToken` por el shim. Nombres consistentes.

**Riesgo conocido:** la convención de tests es `environment: 'node'` y solo `*.test.ts`, por eso no hay tests de render para los providers/hook (`useEmbed`, `BridgeProvider`, `useSession` hook). Se cubren con el harness manual de Task 11. Si más adelante se quiere test de componentes, habría que agregar `environment: 'jsdom'` y `*.test.tsx` al include — fuera de alcance de este plan.
