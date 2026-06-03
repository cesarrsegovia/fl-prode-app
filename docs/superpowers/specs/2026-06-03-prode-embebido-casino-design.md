# Prode embebido en casino — iframe + sesión sin cookie

**Fecha:** 2026-06-03
**Estado:** Diseño aprobado

## Objetivo

Permitir que la app Prode (`apps/web`) se renderice como una "vista" (juego) dentro
del shell de un casino online de terceros, embebida en un `<iframe>` en un **dominio
distinto** al del casino. El casino aporta los usuarios y el saldo; Prode aporta la
experiencia de pronósticos/torneos.

El backend NestJS (`apps/api`) **no se modifica** en este trabajo: ya implementa el
contrato de agregador estilo Lucky Streak (`provider-exchange` para canjear el
`authorizationCode`, JWT Bearer, y wallet `moveFunds` Debit/Credit). Todo el alcance
es del lado web + headers de servidor de Next.

## Contexto y restricciones (decisiones tomadas)

- **Control del shell del casino:** parcial / vía spec. El casino es de un tercero pero
  implementará de su lado un contrato `postMessage` que definimos nosotros.
- **Dominio:** Prode vive en un dominio totalmente distinto al del casino. Por lo tanto
  **no podemos depender de cookies de tercero** (Safari iOS las bloquea de plano).
- **Sesión:** Enfoque B — sin cookie, token JWT en memoria + handshake de re-launch vía
  `postMessage`. Robusto en todos los navegadores, incluido Safari iOS.
- **Usuarios finales:** entran exclusivamente por el casino (`authorizationCode` →
  `provider-exchange`). No tienen login propio.
- **Admins:** conservan un único login email/password reservado a `/admin`, no enlazado
  desde la UI de usuario. `isAdmin` viaja en el JWT.
- **NextAuth se retira por completo** del proyecto web. Hoy se usa solo client-side
  (13 `useSession`, cero `getServerSession`) y la API ya es Bearer puro, así que no hay
  sesión de servidor que preservar.
- **Depósito / saldo insuficiente:** queda como **hook extensible** documentado en el
  contrato (`prode:request-deposit` solo se emite), sin construir la UI de flujo todavía.

## Arquitectura general

El casino embebe `https://prode-app.com` en un iframe. Prode detecta en runtime que está
embebido (`window.self !== window.top`) y activa el **modo embebido**:

- Sesión por token en memoria (no cookie).
- Puente `postMessage` activo con validación estricta de origen.
- Navegación de usuario sin login propio.

La misma app sigue sirviendo el panel `/admin` en modo standalone (no embebido), con su
propio login.

## Sesión sin cookie (Enfoque B)

### Store de auth (única fuente de verdad)

- Nuevo store Zustand (`store/auth.ts`) con `{ token, user, status, setSession, clear }`.
- `user` incluye `id`, `username`, `isAdmin`.
- Persistencia en `sessionStorage` (sobrevive reload dentro de la pestaña; al estar
  embebido es almacenamiento particionado = first-party al documento del iframe).
- Dos vías de poblado:
  1. **Usuario final (embebido):** `authorizationCode` → `POST /auth/provider-exchange`.
  2. **Admin (standalone):** form email/password → `POST /auth/login`.

### Shim de sesión (`lib/session.ts`)

- Expone `useSession()` y `SessionProvider` con la **misma forma que NextAuth**
  (`{ data, status }`, donde `status ∈ 'loading' | 'authenticated' | 'unauthenticated'`)
  respaldados por el store. Migración mecánica del import en los 13 archivos que hoy
  usan `useSession` de `next-auth/react`.
- Expone helpers `getToken()` y `signOut()`.

### Cliente API

- El interceptor de `lib/api.ts` lee el token del store (en vez de `getSession()` de
  NextAuth) y lo manda como `Authorization: Bearer <token>`.
- En respuesta `401`: limpiar el store y disparar el handshake de re-launch
  (`prode:request-auth`) si estamos embebidos; si es standalone (admin), redirigir al
  login admin.

### Retiro de NextAuth

- Se elimina la dependencia `next-auth`, el route handler `app/api/auth/[...nextauth]`,
  `lib/auth.ts`, `components/providers/AuthProvider.tsx` (reemplazado por `SessionProvider`),
  y `types/next-auth.d.ts`.
- El provider `provider-launch` de NextAuth se reemplaza por una llamada directa del
  `/launch` a `POST /auth/provider-exchange`.

## Contrato postMessage

El casino implementa su lado según esta spec. **Toda recepción valida `event.origin`**
contra una allowlist configurable por env (`NEXT_PUBLIC_PARENT_ORIGINS`, lista separada
por comas). Mensajes de origen no permitido se ignoran silenciosamente.

Formato de mensaje: `{ type: string, payload?: object }`.

### Prode → Casino (prefijo `prode:`)

| Evento | Payload | Cuándo |
|---|---|---|
| `prode:ready` | — | App montada; inicia el handshake |
| `prode:request-auth` | — | Cold-load / reload sin token válido / tras 401 → pide code fresco |
| `prode:resize` | `{ height: number }` | Cambió el alto del contenido (ResizeObserver) |
| `prode:request-deposit` | `{ amount: number, currency: string }` | **HOOK** saldo insuficiente (solo se emite; sin UI de flujo) |
| `prode:error` | `{ code: string, message: string }` | Error fatal no recuperable |

### Casino → Prode (prefijo `casino:`)

| Evento | Payload | Efecto |
|---|---|---|
| `casino:auth` | `{ authorizationCode: string, locale?: string, theme?: string }` | Provee/refresca el code → Prode canjea y guarda el token; aplica locale/theme si vienen |
| `casino:back` | — | Navega Prode atrás; si no hay historia interna, va a `/home` |

## Flujo de arranque (embebido)

1. El iframe carga → Prode emite `prode:ready`.
2. Obtención del `authorizationCode`:
   - Por **URL** (`?authorizationCode=...`), ya soportado por `middleware.ts` que reenvía
     a `/launch`; **o**
   - Por `casino:auth`.
   - Si no llega por ninguno en un timeout corto → `prode:request-auth` y se espera
     `casino:auth`.
3. Canje: `POST /auth/provider-exchange` con el code → token + user al store → render
   normal de la app.
4. **Reload:** si `sessionStorage` tiene un token no expirado, se reusa; si falta o
   expiró → `prode:request-auth`.
5. **401 de la API:** limpiar store → `prode:request-auth` (re-launch). Si el canje
   posterior falla → estado de error con botón "reintentar" que reemite `prode:request-auth`.

## Detección de modo embebido

- `hooks/useEmbed.ts`: detecta `window.self !== window.top`, expone `isEmbedded`, el
  origen del padre validado, y el estado del puente.
- En modo embebido: se monta el bridge, se ocultan accesos a login de usuario, y la
  ausencia de token dispara el handshake (no redirige a un login).
- En modo standalone (admin): sin bridge; ausencia de token en rutas `/admin` redirige al
  login admin.

## Headers de servidor (Next)

- `next.config.ts` → `headers()` agrega
  `Content-Security-Policy: frame-ancestors <orígenes del casino>` para las rutas de la app
  (orígenes desde env, p. ej. `PARENT_ORIGINS`).
- No se setea `X-Frame-Options` (su presencia con `DENY/SAMEORIGIN` rompería el iframe;
  `frame-ancestors` es el mecanismo moderno y se usa en su lugar).
- Las rutas `/admin` pueden recibir `frame-ancestors 'none'` para no ser embebibles.

## Componentes nuevos / modificados

**Nuevos:**
- `lib/bridge.ts` — envío/suscripción tipados del contrato postMessage + validación de origen.
- `store/auth.ts` — token store + persistencia en sessionStorage.
- `lib/session.ts` — shim `useSession`/`SessionProvider`/`getToken`/`signOut`.
- `hooks/useEmbed.ts` — detección de iframe + estado del puente.
- `components/providers/BridgeProvider.tsx` — monta el bridge, emite `ready`/`resize`,
  escucha `casino:auth`/`casino:back`.
- Página/form de login admin (reusa la lógica existente de `/auth`, pero contra el store).

**Modificados:**
- `next.config.ts` — `headers()` con CSP.
- `lib/api.ts` — interceptor lee del store; manejo de 401.
- `app/launch/page.tsx` — canje directo a `provider-exchange`, sin `signIn` de NextAuth.
- `components/providers/RealtimeProvider.tsx` — toma el token del store.
- Los 13 archivos con `useSession` — cambian el import a `@/lib/session`.

**Eliminados:**
- `lib/auth.ts`, `app/api/auth/[...nextauth]`, `components/providers/AuthProvider.tsx`,
  `types/next-auth.d.ts`, dependencia `next-auth`.

## Manejo de errores

- **Origen inválido en postMessage:** el mensaje se ignora silenciosamente.
- **Canje de code falla:** estado de error en `/launch` + botón reintentar que reemite
  `prode:request-auth`.
- **401 de la API:** limpiar store y re-launch (embebido) o redirigir a login (admin).
- **No embebido y sin token (ruta de usuario):** estado de error "abrir desde el casino"
  (no hay login de usuario).
- **No embebido y sin token (ruta /admin):** redirige al login admin.

## Testing

- **Unit (vitest):**
  - `lib/bridge.ts` — valida origen (acepta allowlist, rechaza el resto), serializa eventos.
  - `store/auth.ts` — set/clear, persistencia, expiración de token.
  - `lib/session.ts` — el shim devuelve la forma correcta según el estado del store.
  - Lógica de `/launch` — canje OK, canje fallido, idempotencia, re-launch en 401.
- **Harness manual:** una página HTML "mock casino" que embebe el iframe de Prode, manda
  `casino:auth` con un `authorizationCode` de prueba y loguea los eventos `prode:*`.
  Permite validar el flujo end-to-end (arranque, resize, reload, request-auth) sin el
  casino real.

## Fuera de alcance (YAGNI)

- UI del flujo de depósito / cajero (solo se emite el evento `prode:request-deposit`).
- Cambios en el backend NestJS.
- Persistencia de sesión cross-tab o "recordarme" para admins (sessionStorage alcanza).
- Module Federation / micro-frontend / reverse-proxy (otras opciones de integración
  descartadas a favor del iframe).
