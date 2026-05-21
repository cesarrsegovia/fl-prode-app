import { Module } from '@nestjs/common';
import { ResultadosService } from './resultados.service';
import { GamificacionModule } from '../gamificacion/gamificacion.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { ActivityModule } from '../activity/activity.module';
import { TournamentsModule } from '../tournaments/tournaments.module';

@Module({
  imports: [
    GamificacionModule,
    NotificacionesModule,
    ActivityModule,
    TournamentsModule,
  ],
  providers: [ResultadosService],
  exports: [ResultadosService],
})
export class ResultadosModule {}
