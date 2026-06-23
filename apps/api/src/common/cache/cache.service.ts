import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';

/**
 * Caché de aplicación sobre Redis con degradación elegante.
 *
 * - Reusa una única conexión (no crea un cliente por request).
 * - Si Redis no está disponible, todas las operaciones se vuelven no-op y la
 *   app sirve directo desde la DB (igual que el RedisIoAdapter de WebSockets).
 * - `wrap()` implementa el patrón cache-aside: lee de caché o computa+guarda.
 *
 * No usamos @nestjs/cache-manager para no agregar dependencias; ioredis ya
 * está en el proyecto.
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly client: Redis;
  private healthy = false;

  constructor() {
    this.client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      retryStrategy: (times) => Math.min(times * 100, 3000),
      maxRetriesPerRequest: 1,
      // No bloquear el arranque esperando a Redis.
      lazyConnect: false,
      enableOfflineQueue: false,
    });
    this.client.on('ready', () => {
      this.healthy = true;
      this.logger.log('Cache Redis conectado.');
    });
    this.client.on('error', () => {
      // Silencioso: el fallback (DB directa) cubre la ausencia de Redis.
      this.healthy = false;
    });
    this.client.on('end', () => {
      this.healthy = false;
    });
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.healthy) return null;
    try {
      const raw = await this.client.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (!this.healthy) return;
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      // ignorar: la caché es best-effort
    }
  }

  /** Borra claves por patrón (ej. "ranking:global:*"). Best-effort. */
  async delByPattern(pattern: string): Promise<void> {
    if (!this.healthy) return;
    try {
      const stream = this.client.scanStream({ match: pattern, count: 100 });
      const pipeline = this.client.pipeline();
      let pending = 0;
      for await (const keys of stream as AsyncIterable<string[]>) {
        for (const k of keys) {
          pipeline.del(k);
          pending++;
        }
      }
      if (pending) await pipeline.exec();
    } catch {
      // ignorar
    }
  }

  /**
   * Cache-aside: devuelve el valor cacheado o ejecuta `producer`, cachea su
   * resultado y lo devuelve. Si Redis está caído, ejecuta `producer` directo.
   */
  async wrap<T>(
    key: string,
    ttlSeconds: number,
    producer: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const fresh = await producer();
    // No cacheamos null/undefined para no envenenar con vacíos transitorios.
    if (fresh !== null && fresh !== undefined) {
      await this.set(key, fresh, ttlSeconds);
    }
    return fresh;
  }

  onModuleDestroy() {
    this.client.removeAllListeners();
    void this.client.quit().catch(() => this.client.disconnect());
  }
}
