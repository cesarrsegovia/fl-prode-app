import { Module } from '@nestjs/common';
import { ProviderService } from './provider.service';
import { ProviderClient } from './provider.client';
import { PROVIDER_CONFIG, loadProviderConfig } from './provider.config';

@Module({
  providers: [
    ProviderClient,
    ProviderService,
    {
      provide: PROVIDER_CONFIG,
      useFactory: loadProviderConfig,
    },
  ],
  exports: [ProviderService, ProviderClient, PROVIDER_CONFIG],
})
export class ProviderModule {}
