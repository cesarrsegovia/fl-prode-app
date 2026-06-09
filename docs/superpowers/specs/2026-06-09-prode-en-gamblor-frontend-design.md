# Diseño — Prode embebido en gamblor (frontend)

> **Fecha:** 2026-06-09
> **Repos:** implementación en `gamblor-new-ui` (rama `feat-prode`); este spec vive en `fl-prode-app/docs/`.
> **Contrato base:** [`docs/integracion-casino.md`](../../integracion-casino.md) — fuente de verdad del contrato `postMessage` y backend.

## 1. Objetivo y alcance

Integrar Prode como un "juego" embebido en el casino gamblor, **espejo del patrón Sportsbook/Digitain** que ya existe en el repo.

**En alcance (este spec):** solo el **frontend** de `gamblor-new-ui`:
- Ruta dedicada `/[locale]/prode` con su `ProdeFrame` (iframe + listener `postMessage`).
- Obtención del `authorizationCode` reusando el `launchGame('prode')` existente.
- Listener que implementa el contrato `prode:*` / `casino:*` (validación de origen bidireccional).
- Entrada de navegación (link "Prode").

**Fuera de alcance (contrato documentado, lo implementa quien tenga el repo del backend externo):**
- El backend real vive en `NEXT_PUBLIC_API_URL` (servicio externo, **no** en `gamblor-new-ui`).
- `POST /games/launch` con `identifier='prode'` → debe mintear un `authorizationCode` de un solo uso y devolver `game_url = <PRODE_ORIGIN>/launch?authorizationCode=<code>&locale=<x>`.
- `POST /providers/prode/authenticate` y `POST /providers/prode/moveFunds` — definidos en [`integracion-casino.md`](../../integracion-casino.md) §2.3 y §2.4.

**No incluido en esta versión (decisiones cerradas):**
- `prode:resize` → **no-op** (iframe a altura fija, como SportsbookFrame).
- `prode:request-deposit` → **no-op + `console.warn`** (hook reservado; se cablea al cajero cuando Prode lo active).
- Entrada en el catálogo de juegos (`/games/list`) → se usa link de nav, no card de catálogo.

## 2. Arquitectura

```
Usuario click "Prode" (nav-data.ts)
   └─→ /[locale]/prode                 [NUEVO] page.tsx (server, Suspense)
         └─→ ProdeClient.tsx           [NUEVO] gate isConnected (espejo de SportsbookClient)
               └─→ ProdeFrame.tsx      [NUEVO] iframe + listener postMessage
                     ├─ getProdeLaunch() → { gameUrl, authorizationCode }
                     ├─ <iframe src={gameUrl}>   (altura fija; sandbox como GamePage)
                     └─ window 'message' handler (valida event.origin === PRODE_ORIGIN):
                          prode:ready          → no-op (code ya viaja en la URL, Forma A)
                          prode:request-auth   → re-llama getProdeLaunch(), postMessage
                                                 casino:auth { authorizationCode, locale }
                          prode:resize         → no-op
                          prode:request-deposit→ console.warn (hook futuro)
                          prode:error          → muestra fallback de error
```

### Flujo de sesión

- **Cold-start (Forma A):** el iframe carga con `src = gameUrl` (que ya incluye `?authorizationCode=…`). Prode lee el code de la URL y autentica. **No** se necesita `casino:auth` en este caso.
- **Re-auth (Forma B):** ante `prode:request-auth` (reload del iframe / 401 / sesión perdida), el frontend re-llama `launchGame('prode')`, obtiene un `gameUrl` **nuevo** con un code fresco, extrae el `authorizationCode` y responde con `casino:auth { authorizationCode, locale }` **sin recargar el iframe** (no se pierde el estado interno de Prode).

### Validación de origen (requisito del contrato)

- Entrante: procesar un mensaje `prode:*` **solo si** `event.origin === PRODE_ORIGIN`.
- Saliente: `iframe.contentWindow.postMessage(msg, PRODE_ORIGIN)` — `targetOrigin` exacto, **nunca** `'*'`.
- `PRODE_ORIGIN` se lee de `NEXT_PUBLIC_PRODE_ORIGIN`.

> **Acción cruzada:** el deploy de Prode debe incluir el origen de gamblor en `NEXT_PUBLIC_PARENT_ORIGINS` (CSP `frame-ancestors` + allowlist de `postMessage`), o el iframe no carga / los mensajes se descartan. Ver [`integracion-casino.md`](../../integracion-casino.md) §1.2.

## 3. Componentes (unidades)

### 3.1 `src/lib/prode.ts` [NUEVO]
**Qué hace:** wrapper sobre `launchGame('prode')` que devuelve `{ gameUrl: string, authorizationCode: string | null }`.
**Cómo se usa:** `const { gameUrl, authorizationCode } = await getProdeLaunch(isMobile, locale)`.
**Depende de:** `launchGame` de [`src/lib/games.ts`](../../../../gamblor-new-ui/src/lib/games.ts). Extrae el code con `new URL(game_url).searchParams.get('authorizationCode')`.
**Por qué existe:** centraliza el parseo frágil del code (desde el query del `game_url`) en un único lugar testeable, en vez de repetirlo en el componente.

### 3.2 `src/components/prode/ProdeFrame.tsx` [NUEVO]
**Qué hace:** monta el iframe de Prode y maneja el contrato `postMessage`. Espejo de [`SportsbookFrame.tsx`](../../../../gamblor-new-ui/src/components/sportsbook/SportsbookFrame.tsx).
**Props:** `{ mode: "authenticated" | "anonymous" }`.
**Comportamiento:**
- En mount (si `authenticated`): `getProdeLaunch()` → setea `src` del iframe. Skeleton mientras carga.
- `useEffect` con listener `message`: valida `event.origin`, switchea por `data.type` según la tabla de §2.
- `locale` vía `useLocale()`, mapeado a los locales de Prode (ver §3.5).
- UI: iframe a **altura fija** responsiva (patrón del sportsbook / `h-[70svh] sm:aspect-video`), mismo `allow` y `sandbox` que [`GamePage`](../../../../gamblor-new-ui/src/app/[locale]/games/[slug]/page.tsx) (`allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox …`).
- Si no conectado: muestra `ConnectButton` (como SportsbookFrame en `mode==="extension"`).
- Estado de error: fallback con botón "reintentar" (patrón del sportsbook).
**Depende de:** `getProdeLaunch`, `useUserData`, `useLocale`, `ConnectButton`, `NEXT_PUBLIC_PRODE_ORIGIN`.

### 3.3 `src/components/prode/ProdeClient.tsx` [NUEVO]
**Qué hace:** gate de sesión + render del frame. Copia casi literal de [`SportsbookClient.tsx`](../../../../gamblor-new-ui/src/app/[locale]/sportsbook/SportsbookClient.tsx).
**Comportamiento:** `useUserData()` → `mode = user ? "authenticated" : "anonymous"`; `key={mode}` para forzar remount al cambiar de sesión; render `<ProdeFrame mode={mode} />`. Skeleton mientras `isLoading`.

### 3.4 `src/app/[locale]/prode/page.tsx` [NUEVO]
**Qué hace:** server component con `Suspense`, render `<ProdeClient />`. Copia de [`sportsbook/page.tsx`](../../../../gamblor-new-ui/src/app/[locale]/sportsbook/page.tsx).

### 3.5 Mapeo de locale
gamblor soporta `en/es/pt/fr/it/ru/de`; Prode soporta `es/en/fr/de`. Mapa:
- `es → es`, `en → en`, `fr → fr`, `de → de`.
- `pt`, `it`, `ru` → fallback `en`.
Vive como función pura en `ProdeFrame` (o en `lib/prode.ts`). El `locale` se pasa a `launchGame` y, en re-auth, en el payload de `casino:auth`.

## 4. Ediciones a archivos existentes

### 4.1 `src/components/nav/nav-data.ts` [EDIT]
Agregar una `NavSection`: `{ label: "Prode", href: "/prode", imgIconSrc: "<svg>" }`, en el lugar del bloque comentado "Fantasy Football" ([nav-data.ts:82](../../../../gamblor-new-ui/src/components/nav/nav-data.ts#L82)). Reusar un svg-icon existente (ej. uno de fútbol/deporte) o agregar uno nuevo en `public/svg-icons/`.

### 4.2 i18n [EDIT]
Agregar las claves usadas por los nuevos componentes a los message files de gamblor (label de nav + textos del frame: `loading`, `error`, `loginRequired`, `retry`). Seguir la estructura de namespaces existente (`SportsbookFrame`, `SportsbookPage`, etc.) → crear `ProdeFrame` / `ProdePage`.

### 4.3 `.env.example` [EDIT]
Agregar `NEXT_PUBLIC_PRODE_ORIGIN=https://prode.tudominio.com` (origen del iframe de Prode, para validar `postMessage`).

## 5. Contrato de eventos (referencia)

Implementado tal cual [`integracion-casino.md`](../../integracion-casino.md) §1.4. Formato: `{ type: string, payload?: object }`.

| Dirección | `type` | Acción en el frontend de gamblor |
|---|---|---|
| Prode → casino | `prode:ready` | no-op (code ya viaja en la URL) |
| Prode → casino | `prode:request-auth` | re-mintear vía `launchGame('prode')` → `casino:auth` |
| Prode → casino | `prode:resize` | no-op |
| Prode → casino | `prode:request-deposit` | `console.warn` |
| Prode → casino | `prode:error` | mostrar fallback |
| casino → Prode | `casino:auth` | `{ authorizationCode, locale }`, `targetOrigin = PRODE_ORIGIN` |

## 6. Testing

- **`lib/prode.ts`:** unit test del parseo del `authorizationCode` desde un `game_url` (con code, sin code, URL malformada → `null`).
- **Mapeo de locale:** unit test (es/en/fr/de directos; pt/it/ru → en).
- **ProdeFrame (listener):** test del handler `message` — descarta orígenes no permitidos; en `prode:request-auth` llama al helper y postea `casino:auth` con `targetOrigin` correcto. Mockear `launchGame`.
- **Smoke manual:** usar el harness `mock-casino.html` de Prode (ver [`integracion-casino.md`](../../integracion-casino.md) §4) para validar el contrato end-to-end sin backend real, y verificar visualmente la ruta `/prode` en gamblor con un code de prueba.

## 7. Manejo de errores

- `launchGame` falla (no-ok / red) → estado de error en `ProdeFrame` con botón reintentar.
- `authorizationCode` no parseable del `game_url` → tratar como error de launch (no montar iframe roto); loguear.
- `prode:error` entrante → fallback de error.
- Mensaje `postMessage` de origen no permitido → ignorar silenciosamente (no loguear como error; es comportamiento esperado).

## 8. Riesgos / notas

- **Parseo del code desde el `game_url`:** acoplado a que el backend ponga `?authorizationCode=` en el query. Aislado en `lib/prode.ts` y cubierto por test. Si el backend prefiere otro nombre de query param, es un cambio de una línea.
- **Re-auth sin recargar:** depende de que Prode acepte `casino:auth` en caliente (lo hace, por contrato §1.4 Forma B). Si en algún caso Prode no re-renderiza, el fallback es recargar el iframe con el nuevo `gameUrl`.
- **Dependencia del backend:** sin la entrada `prode` en `/games/launch`, `launchGame('prode')` devuelve error y se ve el estado de error — esperado hasta que el backend cablee `prode`.
