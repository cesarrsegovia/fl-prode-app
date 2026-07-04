import { Module } from '@nestjs/common';
import { FixturesController } from './fixtures.controller';
import { FixturesService } from './fixtures.service';
import { AdminGuard } from '../../common/guards/admin.guard';
import { ResultadosModule } from '../resultados/resultados.module';

@Module({
  imports: [ResultadosModule],
  controllers: [FixturesController],
  providers: [FixturesService, AdminGuard],
  exports: [FixturesService],
})
export class FixturesModule {}
