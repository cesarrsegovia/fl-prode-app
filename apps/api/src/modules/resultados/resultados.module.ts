import { Module } from '@nestjs/common';
import { ResultadosService } from './resultados.service';
import { GamificacionModule } from '../gamificacion/gamificacion.module';

@Module({
  imports: [GamificacionModule],
  providers: [ResultadosService],
  exports: [ResultadosService],
})
export class ResultadosModule {}
