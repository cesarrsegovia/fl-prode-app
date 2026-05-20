import { Module } from '@nestjs/common';
import { ResultadosService } from './resultados.service';
import { GamificacionModule } from '../gamificacion/gamificacion.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [GamificacionModule, NotificacionesModule, ActivityModule],
  providers: [ResultadosService],
  exports: [ResultadosService],
})
export class ResultadosModule {}
