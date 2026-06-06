# Guía de integración — Prode embebido en el casino

> **Audiencia:** equipo/agente que integra Prode **del lado del casino** (la plataforma padre).
> **Objetivo:** embeber Prode como una vista (juego) dentro del casino, en un iframe, con
> sesión sin cookies y saldo gestionado por el casino.

Prode se integra como un **juego estilo agregador (Lucky Streak)**. Hay **dos superficies**
que el casino debe implementar:

1. **Frontend — embedding por iframe + `postMessage`.** Cómo se muestra Prode y cómo se le
   entrega la sesión del usuario.
2. **Backend — API de wallet/identidad.** Endpoints que el **backend de Prode llama al
   backend del casino** para validar al usuario y mover saldo.

Podés integrar primero el frontend (con un `authorizationCode` de prueba) y dejar el backend
para después, pero **para producción ambas son necesarias**.

---

## 0. Glosario y modelo mental

| Término | Significado |
|---|---|
| **Padre / casino** | Tu plataforma. Es el host que embebe el iframe y es **dueño del saldo y de la identidad** del usuario. |
| **Prode** | La app embebida. Vive en su propio dominio (ej. `https://prode.tudominio.com`). |
| **`authorizationCode`** | Token **de un solo uso y corta vida** que el casino genera para autorizar a *un* usuario a entrar a Prode. Prode lo canjea contra tu backend para obtener los datos del usuario. |
| **`operatorName`** | Identificador del operador/casino, acordado entre ambas partes. Viaja en las llamadas backend. |
| **`providerUserId` / `username`** | El ID estable del usuario **en tu sistema**. Prode lo usa como identidad del usuario. |

**Flujo de alto nivel:**

```
Usuario en el casino → click "Prode"
   │
   ├─ (1) Casino genera un authorizationCode para ese usuario
   │
   ├─ (2) Casino abre iframe de Prode y le pasa el code
   │        (por URL  ?authorizationCode=...  o por postMessage  casino:auth)
   │
   ├─ (3) Backend de Prode canjea el code contra TU backend (POST /authenticate)
   │        → obtiene { userName, currency, language, balance }
   │        → crea/actualiza el usuario y emite su propio JWT interno
   │
   └─ (4) Prode funciona. Para mover saldo (entrar a torneos, premios),
            el backend de Prode llama a TU backend (POST /moveFunds, Debit/Credit).
```

---

# PARTE 1 — Frontend: embedding por iframe

## 1.1. Requisitos del iframe

Prode corre en **un dominio distinto** al del casino. Embebelo así:

```html
<iframe
  src="https://prode.tudominio.com/launch?authorizationCode=ABC123"
  title="Prode"
  style="width:100%; height:100%; border:0;"
  allow="clipboard-write"
></iframe>
```

- **No** hace falta `sandbox`. Si lo usás, incluí como mínimo
  `allow-scripts allow-same-origin allow-forms allow-popups` o el flujo se romperá.
- Prode **no usa cookies de tercero**: la sesión vive en memoria/`sessionStorage` del iframe
  y la identidad llega por el `authorizationCode`. No necesitás habilitar cookies cross-site.

## 1.2. Allowlist de orígenes (lo configura Prode, pero te afecta)

Prode valida el origen del casino de dos maneras y **rechaza** lo que no esté en la allowlist:

- **CSP `frame-ancestors`**: Prode sólo se deja embeber por los orígenes configurados.
- **`postMessage` entrante**: Prode ignora todo mensaje cuyo `event.origin` no esté en la
  allowlist.

➡️ **Acción requerida:** pasale al equipo de Prode **el/los orígenes exactos** desde los que
vas a embeber (esquema + host + puerto, **sin** barra final), por ejemplo:

```
https://casino.com
https://staging.casino.com
```

Se configuran en la env `NEXT_PUBLIC_PARENT_ORIGINS` (coma-separada) del deploy de Prode.
Si no coinciden exactamente, el iframe no carga (CSP) o los mensajes se descartan en silencio.

## 1.3. Cómo entregar la sesión (el `authorizationCode`)

Hay **dos formas**, elegí UNA (no mandes las dos a la vez con codes distintos):

### Forma A — por URL (la más simple)
Abrí el iframe directamente en `/launch` con el code en la query:

```
https://prode.tudominio.com/launch?authorizationCode=ABC123
```

Opcional: `&next=/home` para indicar a qué ruta interna ir tras autenticar (default `/home`;
sólo se permiten rutas internas que empiecen con `/`).

> Nota: si por error abrís otra ruta (`/`, `/home`, etc.) **con** `?authorizationCode=...`,
> Prode reenruta automáticamente a `/launch`. Aun así, preferí apuntar directo a `/launch`.

### Forma B — por `postMessage` (para shells dinámicos / refresco de sesión)
Abrí el iframe en `/launch` **sin** code, esperá el evento `prode:ready`, y respondé con
`casino:auth`. Esta forma es la que se usa también cuando Prode **pide** un code nuevo
(reload, expiración) emitiendo `prode:request-auth` — ver §1.4.

## 1.4. Contrato `postMessage`

Formato de todo mensaje (en ambos sentidos):

```ts
{ type: string, payload?: object }
```

Reglas de seguridad (las aplica Prode; replicalas vos):
- Validá **siempre** `event.origin` contra tu allowlist de orígenes de Prode antes de
  procesar un mensaje `prode:*`.
- Enviá tus mensajes `casino:*` con el `targetOrigin` exacto de Prode (no uses `'*'`).

### Eventos que **Prode emite** (`prode:*`) → el casino escucha

| `type` | `payload` | Cuándo / qué debe hacer el casino |
|---|---|---|
| `prode:ready` | — | El iframe montó y está listo. Si usás la Forma B, recién acá mandá `casino:auth`. |
| `prode:request-auth` | — | Prode necesita un `authorizationCode` **fresco** (cold-start sin code, reload, o sesión expirada/401). Respondé con `casino:auth` y un code nuevo. |
| `prode:resize` | `{ height: number }` | Cambió el alto del contenido. Ajustá la altura del iframe a `height` px (si tu layout lo requiere). |
| `prode:request-deposit` | `{ amount: number, currency: string }` | **Hook (reservado, aún no activo).** En el futuro: abrir tu cajero/depósito. Por ahora podés ignorarlo o loguearlo. |
| `prode:error` | `{ code: string, message: string }` | Error no recuperable en Prode. Mostrá un fallback o cerrá la vista. |

### Eventos que **el casino emite** (`casino:*`) → Prode escucha

| `type` | `payload` | Efecto en Prode |
|---|---|---|
| `casino:auth` | `{ authorizationCode: string, locale?: string, theme?: string }` | Prode canjea el code y arranca la sesión. `locale` (ej. `"es"`, `"en"`) fija el idioma (cookie `NEXT_LOCALE`). `theme` se acepta a futuro. |
| `casino:back` | — | Prode navega "atrás" en su historial interno. Útil para tu botón de volver. |

> **Importante sobre `authorizationCode`:** es de **un solo uso**. Cada vez que Prode pida
> auth (`prode:request-auth`), generá uno **nuevo**. El backend de Prode es idempotente para
> el *mismo* code (devuelve la misma sesión), pero no reutilices codes entre sesiones.

## 1.5. Secuencias

**Cold-start (Forma B):**
```
Casino: abre iframe en /launch (sin code)
Prode → casino: prode:ready
Casino → Prode: casino:auth { authorizationCode: "fresh-1", locale: "es" }
Prode: canjea contra su backend → render de la app
Prode → casino: prode:resize { height: 1240 }   (continuo, ante cambios)
```

**Reload / sesión perdida:**
```
(usuario recarga el iframe; el token en memoria se pierde)
Prode → casino: prode:request-auth
Casino → Prode: casino:auth { authorizationCode: "fresh-2" }
Prode: re-autentica → render
```

**Expiración / 401 desde la API de Prode:**
```
Prode: detecta 401 → limpia sesión
Prode → casino: prode:request-auth
Casino → Prode: casino:auth { authorizationCode: "fresh-3" }
```

**Botón volver del casino:**
```
Casino → Prode: casino:back   → Prode hace history.back() (o va a /home)
```

## 1.6. Ejemplo mínimo del lado casino (shell)

```html
<iframe id="prode" src="https://prode.tudominio.com/launch" style="width:100%;height:100%;border:0"></iframe>
<script>
  const PRODE_ORIGIN = 'https://prode.tudominio.com';
  const iframe = document.getElementById('prode');

  // Pedí a TU backend un authorizationCode fresco para el usuario logueado.
  async function getAuthCode() {
    const r = await fetch('/api/prode/auth-code', { method: 'POST' }); // endpoint TUYO
    const { authorizationCode } = await r.json();
    return authorizationCode;
  }

  window.addEventListener('message', async (e) => {
    if (e.origin !== PRODE_ORIGIN) return;           // ← validación de origen obligatoria
    const { type, payload } = e.data || {};
    switch (type) {
      case 'prode:ready':
      case 'prode:request-auth': {
        const authorizationCode = await getAuthCode();
        iframe.contentWindow.postMessage(
          { type: 'casino:auth', payload: { authorizationCode, locale: 'es' } },
          PRODE_ORIGIN,                                // ← targetOrigin exacto, nunca '*'
        );
        break;
      }
      case 'prode:resize':
        // iframe.style.height = payload.height + 'px';  // si tu layout lo necesita
        break;
      case 'prode:request-deposit':
        // futuro: abrir cajero. Por ahora opcional.
        break;
      case 'prode:error':
        console.error('Prode error', payload);
        break;
    }
  });
</script>
```

---

# PARTE 2 — Backend: API de wallet / identidad

Esto lo expone **tu backend (el casino)** y lo consume el **backend de Prode** vía HTTP.
Es el contrato estilo *Lucky Streak*. Todas las respuestas (salvo `/games/launch`) van
**envueltas** en `{ data, errors }`.

## 2.1. Autenticación de las llamadas

El backend de Prode llama a tu API con:

- **Base URL:** la tuya (se la pasás a Prode como `OFFCHAIN_API_URL` / `PROVIDER_BASE_URL`).
- **Header `X-API-Key`:** una API key que vos generás y le entregás a Prode
  (`PROVIDER_OUTBOUND_API_KEY`). Validala en cada request.
- **`Content-Type: application/json`.**
- **`operatorName`:** identificador del operador, acordado (Prode lo manda en el body de
  `/authenticate` y lo configura como `PROVIDER_OPERATOR_NAME`).
- **`{provider}`** en el path es el nombre del proveedor (Prode), acordado
  (`PROVIDER_NAME`, ej. `prode`).

## 2.2. Envoltorio y errores

```jsonc
// Éxito
{ "data": { /* ... */ }, "errors": null }

// Error
{ "data": null, "errors": [ { "code": "INSUFFICIENT_FUNDS", "title": "...", "detail": "..." } ] }
```

Si `errors` viene con elementos, Prode trata la operación como fallida y lo propaga.

## 2.3. `POST /providers/{provider}/authenticate`

Valida un `authorizationCode` y devuelve los datos del usuario. **Idempotente**: si Prode
reenvía el mismo code, devolvé el mismo usuario.

**Request:**
```json
{
  "data": {
    "operatorName": "tu-operador",
    "authorizationCode": "ABC123"
  }
}
```

**Response (`data`):**
```json
{
  "userName": "user-id-estable-en-tu-sistema",
  "currency": "USD",
  "language": "es",
  "nickname": "ElNeo",
  "balance": 1500.00,
  "balanceTimestamp": "2026-06-03T12:00:00.000Z"
}
```

- `userName` es el **ID estable** del usuario en tu sistema → Prode lo persiste como
  `providerUserId` (identidad del usuario).
- `language` fija el idioma inicial (`es`, `en`, `fr`, `de`).
- `balance` es informativo en este paso; el saldo "real" se mueve con `/moveFunds`.

## 2.4. `POST /providers/{provider}/moveFunds`

Debita o acredita saldo del usuario. **El saldo es tuyo: vos sos la fuente de verdad.**

**Request:**
```json
{
  "data": {
    "transactionRequestId": "uuid-generado-por-prode",
    "username": "user-id-estable-en-tu-sistema",
    "direction": "Debit",
    "amount": 100.0,
    "currency": "USD",
    "eventId": "torneo-123",
    "gameId": "torneo-123",
    "gameType": "ProdePrediction",
    "eventDetails": {
      "roundId": "torneo-123",
      "refTransactionId": "uuid-del-debit-original-si-es-un-credit"
    }
  }
}
```

- `direction`: `"Debit"` (cobro, ej. entrada a torneo) o `"Credit"` (pago, ej. premio).
- `transactionRequestId`: **clave de idempotencia**. Si recibís el mismo dos veces, no
  vuelvas a mover saldo; devolvé el resultado original.
- En un `Credit` que liquida un `Debit` previo, `eventDetails.refTransactionId` referencia
  al `transactionRequestId` del Debit original.

**Response (`data`):**
```json
{
  "refTransactionId": "tu-id-de-transaccion",
  "currency": "USD",
  "balance": 1400.00,
  "balanceTimestamp": "2026-06-03T12:05:00.000Z"
}
```

**Errores típicos a devolver** (en `errors[]`): saldo insuficiente, usuario inválido,
moneda no soportada, transacción duplicada con datos distintos.

## 2.5. `POST /games/launch` (opcional)

Sólo si querés que **Prode** actúe como launcher (flujo inverso, poco común — normalmente
el casino redirige al usuario directamente). Devuelve `{ game_url, sessionId }`. La mayoría
de las integraciones **no** lo necesitan.

---

# PARTE 3 — Checklist de integración

**Frontend**
- [ ] Decidir dominio de Prode (ej. `https://prode.tudominio.com`).
- [ ] Entregar a Prode tu(s) origen(es) exactos para `NEXT_PUBLIC_PARENT_ORIGINS`.
- [ ] Embeber el iframe apuntando a `/launch`.
- [ ] Generar `authorizationCode` por usuario y entregarlo (URL **o** `casino:auth`).
- [ ] Escuchar `prode:ready` / `prode:request-auth` y responder con `casino:auth`.
- [ ] (Opcional) Manejar `prode:resize` y `casino:back`.
- [ ] Validar `event.origin` en todo `message`; enviar con `targetOrigin` exacto.

**Backend**
- [ ] Exponer `POST /providers/{provider}/authenticate` (idempotente por code).
- [ ] Exponer `POST /providers/{provider}/moveFunds` (idempotente por `transactionRequestId`).
- [ ] Validar `X-API-Key` en cada request.
- [ ] Acordar `operatorName`, `{provider}` y la API key con el equipo de Prode.
- [ ] Endpoint de generación de `authorizationCode` (de un solo uso, corta vida).

**Datos a intercambiar entre equipos**
| Dato | Quién lo define | Dónde se usa |
|---|---|---|
| Orígenes del casino | Casino | `NEXT_PUBLIC_PARENT_ORIGINS` (Prode) |
| Base URL del backend casino | Casino | `OFFCHAIN_API_URL` (Prode) |
| API key outbound | Casino | header `X-API-Key` + `PROVIDER_OUTBOUND_API_KEY` (Prode) |
| `operatorName` | Acordado | body `/authenticate` + `PROVIDER_OPERATOR_NAME` (Prode) |
| `{provider}` (nombre) | Acordado | path de los endpoints + `PROVIDER_NAME` (Prode) |
| Dominio de Prode | Prode | `src` del iframe + `targetOrigin` (casino) |

---

# PARTE 4 — Probar el embedding sin backend real

Prode incluye un harness para validar el contrato `postMessage` end-to-end:

1. Corré Prode en local (`pnpm dev`, queda en `http://localhost:3000`).
2. Asegurate de que `NEXT_PUBLIC_PARENT_ORIGINS` incluya el origen donde abrís el harness
   (ej. `http://localhost:3000` si lo servís desde el propio Prode).
3. Abrí `http://localhost:3000/mock-casino.html`.
4. "Cargar iframe" → deberías ver en el log `← prode:ready` y `← prode:request-auth`.
5. Pegá un `authorizationCode` de prueba y "Enviar casino:auth" → Prode canjea y navega.
6. "Enviar casino:back" → el iframe navega atrás.

(El canje real requiere que el backend de Prode tenga la integración provider habilitada y
que tu `/authenticate` responda; sin eso, verás el estado de error de `/launch`, lo cual es
esperado en dev sin backend padre.)

---

# PARTE 5 — Seguridad (resumen)

- **Validación de origen bidireccional**: nunca proceses un `postMessage` sin chequear
  `event.origin`; nunca envíes con `targetOrigin: '*'`.
- **`authorizationCode`**: de un solo uso, vida corta, generado por usuario y por sesión.
- **API key (`X-API-Key`)**: secreta, rotable, validada en cada request del backend.
- **Sin cookies de tercero**: el token de Prode nunca sale del iframe; el casino sólo
  entrega el `authorizationCode`.
- **`/admin` de Prode no es embebible** (`frame-ancestors 'none'`): es sólo para
  administradores de Prode, no para usuarios del casino.
- **Saldo**: el casino es la única fuente de verdad; Prode nunca almacena saldo real, sólo
  debita/acredita vía `/moveFunds`.
```
