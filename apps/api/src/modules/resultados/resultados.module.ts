import { Module } from '@nestjs/common';
import { ResultadosService } from './resultados.service';
import { GamificacionModule } from '../gamificacion/gamificacion.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { ActivityModule } from '../activity/activity.module';
import { TournamentsModule } from '../tournaments/tournaments.module';
import { RESULTS_PROVIDER } from './providers/results-provider';
import { EspnResultsProvider } from './providers/espn.provider';
import { ApiFootballResultsProvider } from './providers/api-football.provider';

@Module({
  imports: [
    GamificacionModule,
    NotificacionesModule,
    ActivityModule,
    TournamentsModule,
  ],
  providers: [
    ResultadosService,
    EspnResultsProvider,
    ApiFootballResultsProvider,
    {
      provide: RESULTS_PROVIDER,
      inject: [EspnResultsProvider, ApiFootballResultsProvider],
      useFactory: (espn: EspnResultsProvider, apiFootball: ApiFootballResultsProvider) =>
        process.env.RESULTS_PROVIDER === 'apifootball' ? apiFootball : espn,
    },
  ],
  exports: [ResultadosService],
})
export class ResultadosModule {}
