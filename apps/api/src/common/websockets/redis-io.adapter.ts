import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor!: ReturnType<typeof createAdapter>;

  async connectToRedis(): Promise<void> {
    const pubClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      retryStrategy: (times) => Math.min(times * 100, 3000),
      maxRetriesPerRequest: null, // Allow retrying in background, but the boot won't wait
    });
    
    // CRITICAL: Handle error events to prevent Node process from crashing
    pubClient.on('error', (err) => {
      // SILENT: We know we might not have Redis. Fallback logic handles this.
    });

    const subClient = pubClient.duplicate();
    subClient.on('error', (err) => {
      // SILENT
    });

    try {
      await Promise.race([
        Promise.all([
          new Promise<void>((resolve) => pubClient.once('ready', resolve)),
          new Promise<void>((resolve) => subClient.once('ready', resolve)),
        ]),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Redis connection timeout')), 2000)),
      ]);

      this.adapterConstructor = createAdapter(pubClient, subClient);
      console.log('Redis WebSockets adapter connected successfully.');
    } catch (err) {
      console.warn('Failed to connect to Redis for WebSockets. Falling back to local memory adapter. (Redis must be running for multi-instance scaling)');
      // We don't disconnect so it can reconnect if Redis comes up later, 
      // but we don't use it for the adapter constructor.
      pubClient.disconnect();
      subClient.disconnect();
    }
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
