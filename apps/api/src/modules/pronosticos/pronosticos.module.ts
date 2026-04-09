import { Module } from '@nestjs/common';
import { PronosticosController } from './pronosticos.controller';
import { PronosticosService } from './pronosticos.service';

@Module({
  controllers: [PronosticosController],
  providers: [PronosticosService],
  exports: [PronosticosService],
})
export class PronosticosModule {}
