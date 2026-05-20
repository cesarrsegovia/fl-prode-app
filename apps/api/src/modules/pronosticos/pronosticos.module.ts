import { Module } from '@nestjs/common';
import { PronosticosController } from './pronosticos.controller';
import { PronosticosService } from './pronosticos.service';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [ActivityModule],
  controllers: [PronosticosController],
  providers: [PronosticosService],
  exports: [PronosticosService],
})
export class PronosticosModule {}
