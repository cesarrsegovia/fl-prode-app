# Deploy de Prode

**Topología:**
- **Web** (`apps/web`, Next.js) → **Vercel**.
- **API** (`apps/api`, NestJS) + **Postgres** + **Redis** → **Render** (gestionados, mismo host).

La web y la API viven en **dominios distintos** (premisa del diseño embebido en casino). La
sesión es **cookieless/Bearer**, así que no hay cookies cross-site que configurar.

> **Orden recomendado:** desplegá primero la **API** (para tener su URL pública), después la
> **web** (que apunta a esa URL), y al final ajustá `FRONTEND_URL` en la API + rebuildeá la web.

---

## Parte A — API + Postgres + Redis en Render (Blueprint)

El repo incluye [`render.yaml`](../render.yaml) (infra como código).

1. **Render Dashboard → New → Blueprint** → conectá este repositorio → Render detecta
   `render.yaml` y propone crear: `prode-postgres`, `prode-redis`, `prode-api`.
2. Render **autoenchufa** `DATABASE_URL` y `REDIS_URL` desde los servicios gestionados, y
   **autogenera** `JWT_SECRET`. No los toques.
3. Completá las variables marcadas `sync: false` (quedan vacías hasta que las cargues):

   | Variable | Valor |
   |---|---|
   | `FRONTEND_URL` | URL pública de la web en Vercel (ej. `https://prode.vercel.app`). **CORS.** Acepta lista separada por coma. |
   | `PROVIDER_OPERATOR_NAME` | El operatorName que te asigna el casino. |
   | `OFFCHAIN_API_URL` | Base URL del backend del casino (ver `docs/integracion-casino.md`). |
   | `PROVIDER_OUTBOUND_API_KEY` | API key para llamar al casino (header `X-API-Key`). |
   | `SPORTS_API_KEY` | (Opcional) API-Football. Vacío = desactiva el cron de resultados. |
   | `SENTRY_DSN` | (Opcional) Sentry. |

   `PROVIDER_NAME` (=`prode`), `JWT_EXPIRATION` (=`7d`), `PROVIDER_TIMEOUT_MS`, `SPORTS_API_URL`
   ya vienen con default en el blueprint.
4. **Apply** → Render hace el primer build y deploy.
   - **Build:** instala el workspace, compila `@prode/shared`, `prisma generate`, `nest build`.
   - **Start:** corre `prisma migrate deploy` (aplica el baseline) y levanta la API.
   - **Health check:** `GET /api/health` → `{ "status": "ok" }`.
5. Anotá la URL pública de la API (ej. `https://prode-api.onrender.com`). El prefijo de rutas
   es **`/api`** (ej. `https://prode-api.onrender.com/api/auth/login`).

### Planes (importante para producción)
El blueprint usa `plan: free` para arrancar/probar. **Para producción (casino, dinero real):**
- **Web service free se duerme** por inactividad → corta las conexiones WebSocket (Socket.io).
  Subí a un plan pago (always-on).
- **Postgres free expira** a los ~30 días. Usá un plan pago para persistencia.
- En planes pagos podés mover `prisma migrate deploy` del `startCommand` a un
  **`preDeployCommand`** (más limpio para multi-instancia). Ver comentario en `render.yaml`.

---

## Parte B — Web en Vercel

El repo incluye [`apps/web/vercel.json`](../apps/web/vercel.json).

1. **Vercel → Add New Project** → importá este repositorio.
2. **Settings → Root Directory = `apps/web`.** (Vercel detecta el workspace pnpm en la raíz
   para instalar dependencias.) Framework: **Next.js** (autodetectado).
3. El `vercel.json` ya define el build: compila `@prode/shared` y luego `next build`
   (necesario porque `@prode/shared` resuelve a `dist/`, que no se versiona).
4. **Environment Variables** (Production y Preview):

   | Variable | Valor | Nota |
   |---|---|---|
   | `NEXT_PUBLIC_API_URL` | `https://prode-api.onrender.com/api` | Base de la API (con `/api`). |
   | `NEXT_PUBLIC_WS_URL` | `https://prode-api.onrender.com` | WebSocket (sin `/api`). |
   | `NEXT_PUBLIC_PARENT_ORIGINS` | `https://casino.com,https://staging.casino.com` | Orígenes del casino que pueden embeber Prode. |

   > ⚠️ **`NEXT_PUBLIC_PARENT_ORIGINS` se hornea en build.** Si cambian los orígenes del
   > casino, **redeployá** la web (rebuild). No alcanza con cambiar la env en runtime.
5. **Deploy.** Anotá la URL pública (ej. `https://prode.vercel.app`).

---

## Parte C — Cablear ambos lados

1. En **Render → prode-api → Environment**, poné `FRONTEND_URL` = URL de Vercel y redeployá la
   API (para que CORS acepte a la web).
2. En **Vercel**, confirmá que `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_WS_URL` apunten a la API de
   Render, y que `NEXT_PUBLIC_PARENT_ORIGINS` tenga los orígenes del casino. Redeployá si
   cambiaste algo.
3. Pasale al equipo del casino la **URL de la web** (para el `src` del iframe y su
   `targetOrigin`) — ver `docs/integracion-casino.md`.

---

## Migraciones de base de datos

- Se versiona **una migración baseline squashed** en
  `apps/api/prisma/migrations/20260603120000_init/` que refleja el **schema completo**
  (incluye las tablas de wallet/provider que en dev se habían aplicado por `db push`).
- En cada deploy, el `startCommand` corre `prisma migrate deploy` (idempotente).
- **Base de datos nueva (prod en Render):** funciona directo, aplica el baseline.
- **Base existente que YA tiene datos/migraciones** (p. ej. tu DB local de dev): no apliques el
  baseline encima; marcalo como ya aplicado:
  ```bash
  pnpm --filter @prode/api exec prisma migrate resolve --applied 20260603120000_init
  ```
- **Cambios de schema futuros:** generá una migración nueva en dev
  (`pnpm --filter @prode/api exec prisma migrate dev --name <cambio>`), versionala (el
  `.gitignore` sólo trackea el baseline; agregá la nueva carpeta con `git add -f` o ajustá el
  patrón) y `migrate deploy` la aplicará en prod.

---

## Checklist post-deploy

- [ ] `GET https://prode-api.onrender.com/api/health` → `{ "status": "ok" }`.
- [ ] La web carga en su URL de Vercel.
- [ ] `FRONTEND_URL` (Render) = URL de la web → no hay errores de CORS en la consola del browser.
- [ ] `NEXT_PUBLIC_PARENT_ORIGINS` incluye el/los orígenes del casino.
- [ ] Probar el embedding: el casino abre `https://<web>/launch?authorizationCode=...` en un
      iframe (o vía `casino:auth`). Ver `docs/integracion-casino.md`.
- [ ] (Si aplica) `OFFCHAIN_API_URL`, `PROVIDER_OPERATOR_NAME`, `PROVIDER_OUTBOUND_API_KEY`
      cargadas para que el canje de `authorizationCode` y el wallet funcionen.

---

## Variables de entorno — referencia rápida

**API (Render):** `DATABASE_URL`*, `REDIS_URL`*, `JWT_SECRET`*, `JWT_EXPIRATION`,
`FRONTEND_URL`, `PROVIDER_NAME`, `PROVIDER_OPERATOR_NAME`, `OFFCHAIN_API_URL`,
`PROVIDER_OUTBOUND_API_KEY`, `PROVIDER_TIMEOUT_MS`, `SPORTS_API_KEY`, `SPORTS_API_URL`,
`SENTRY_DSN`, `PORT`** (*=auto por Render, **=lo setea Render).

**Web (Vercel):** `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`, `NEXT_PUBLIC_PARENT_ORIGINS`.
