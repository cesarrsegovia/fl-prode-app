import { Module } from '@nestjs/common';
import { TournamentsController } from './tournaments.controller';
import { TournamentsService } from './tournaments.service';
import { ImporterModule } from '../importer/importer.module';
import { ProviderModule } from '../provider/provider.module';
import { GruposModule } from '../grupos/grupos.module';
import { AdminGuard } from '../../common/guards/admin.guard';

@Module({
  imports: [ImporterModule, ProviderModule, GruposModule],
  controllers: [TournamentsController],
  providers: [TournamentsService, AdminGuard],
  exports: [TournamentsService],
})
export class TournamentsModule {}
