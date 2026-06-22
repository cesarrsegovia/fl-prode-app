# Mantener `prode-api` despierto en Render Free

**Fecha:** 2026-06-22
**Estado:** Aprobado, listo para implementar

## Problema

El servicio `prode-api` en Render (plan **Free**) se cayó en producción con:

```
ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL @prode/api@0.1.0 start:prod: `node dist/main`
Command failed with signal "SIGTERM"
```

## Diagnóstico (causa raíz confirmada)

El SIGTERM **no es un bug de la aplicación**. El log del arranque muestra que la app
levanta correctamente:

```
[NestApplication] Nest application successfully started +807ms
API running on http://localhost:10000
... 12 segundos después ...
SIGTERM
```

Es el **spin-down por inactividad del Free tier de Render**: sin requests entrantes,
Render duerme el web service. El banner del dashboard lo confirma: *"Your free instance
will spin down with inactivity, which can delay requests by 50 seconds or more."*

Solo duerme el web service `prode-api`. Los servicios `prode-postgres` (PostgreSQL 18) y
`prode-redis` (Valkey 8) figuran "Available" de forma continua — **Render Postgres no se
autosuspende** como Neon.

### Consecuencias del spin-down
- El primer request tras dormir tarda ~50s (cold start).
- El cron interno (`@nestjs/schedule`: resumen diario de notificaciones en TZ Argentina)
  no se ejecuta mientras el servicio duerme.

### Restricción
No es viable cambiar de plan. La solución debe funcionar dentro del Free tier.

## Solución

### 1. Cron externo (mecanismo principal — cero código)

Un pinger externo gratuito (cron-job.org o UptimeRobot) hace:

```
GET https://<dominio-render>/api/health   cada 10 minutos
```

Render cuenta cualquier request entrante como actividad, manteniendo el servicio
despierto 24/7. Esto también mantiene vivo el cron interno de notificaciones.

El endpoint ya existe en [`health.controller.ts`](../../../apps/api/src/common/health.controller.ts):
`GET /api/health` responde `{ status: 'ok' }` sin auth y sin tocar la DB. Es liviano y
barato de pingear. **No requiere cambios de código.**

### 2. Robustez de arranque (cambio mínimo)

Envolver `bootstrap()` en `.catch()` en
[`main.ts`](../../../apps/api/src/main.ts). Hoy un fallo de arranque muere como unhandled
rejection con log poco claro. Con el catch:

```ts
bootstrap().catch((err) => {
  console.error('Fallo al iniciar la API:', err);
  process.exit(1);
});
```

Cualquier fallo de arranque queda logueado explícitamente y sale con exit code 1 limpio.
Defensa para el día en que la DB no esté lista al despertar.

## Fuera de alcance (YAGNI)

- **Retry de conexión de Prisma:** `prode-postgres` está "Available" siempre; no se
  autosuspende. Innecesario hoy.
- **Self-ping interno:** si Render ya durmió el proceso, no hay nadie despierto para
  disparar el ping. El cron externo es estrictamente más confiable.
- **Modificar `DbKeepaliveCron`:** sus comentarios hablan de Neon (etapa anterior). No
  aplica a la DB de producción actual en Render. Opcionalmente se pueden actualizar sus
  comentarios para evitar confusión, pero es cosmético y no bloquea esta tarea.

## Criterios de éxito

1. `main.ts` envuelve `bootstrap()` en `.catch()` con log explícito y `process.exit(1)`.
2. El proyecto compila (`pnpm --filter @prode/api build`).
3. Existe una guía paso a paso para configurar el cron externo contra
   `GET /api/health` cada 10 min.
4. Tras configurar el cron externo, `prode-api` deja de aparecer como "Failed service" por
   inactividad.
