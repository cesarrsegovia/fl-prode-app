import { Module } from '@nestjs/common';
import { ResultadosService } from './resultados.service';
import { GamificacionModule } from '../gamificacion/gamificacion.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';

@Module({
  imports: [GamificacionModule, NotificacionesModule],
  providers: [ResultadosService],
  exports: [ResultadosService],
})
export class ResultadosModule {}
