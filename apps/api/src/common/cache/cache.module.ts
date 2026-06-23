import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';

/**
 * Módulo global de caché: expone CacheService a toda la app sin necesidad de
 * re-importar en cada feature module.
 */
@Global()
@Module({
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
