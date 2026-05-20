import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

import { RedisIoAdapter } from './common/websockets/redis-io.adapter';

/**
 * Construye el callback CORS aceptando una lista de orígenes permitidos.
 * En dev cubrimos localhost y 127.0.0.1 en cualquier puerto frecuente
 * para que el browser no rechace requests por mismatch de host.
 */
function buildCorsOrigin() {
  const explicit = (process.env.FRONTEND_URL ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const devOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
  ];

  const allowed = new Set([...explicit, ...devOrigins]);

  return (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return cb(null, true); // requests sin Origin (curl, server-side)
    if (allowed.has(origin)) return cb(null, true);
    return cb(new Error(`Origin "${origin}" no permitido por CORS`));
  };
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: buildCorsOrigin(),
    credentials: true,
  });

  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}`);
}
bootstrap();
