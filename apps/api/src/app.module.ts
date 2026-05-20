import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { GruposModule } from './modules/grupos/grupos.module';
import { FixturesModule } from './modules/fixtures/fixtures.module';
import { PronosticosModule } from './modules/pronosticos/pronosticos.module';
import { ResultadosModule } from './modules/resultados/resultados.module';
import { RankingModule } from './modules/ranking/ranking.module';
import { NotificacionesModule } from './modules/notificaciones/notificaciones.module';
import { GamificacionModule } from './modules/gamificacion/gamificacion.module';
import { TournamentsModule } from './modules/tournaments/tournaments.module';
import { ImporterModule } from './modules/importer/importer.module';
import { MatchesModule } from './modules/matches/matches.module';
import { TeamsModule } from './modules/teams/teams.module';
import { ActivityModule } from './modules/activity/activity.module';
import { MessagesModule } from './modules/messages/messages.module';
import { AdminModule } from './modules/admin/admin.module';
import { ProviderModule } from './modules/provider/provider.module';
import { WebsocketModule } from './websocket/websocket.module';
import { ResultadosCron } from './jobs/resultados.cron';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    WebsocketModule,
    AuthModule,
    UsuariosModule,
    GruposModule,
    FixturesModule,
    PronosticosModule,
    ResultadosModule,
    RankingModule,
    NotificacionesModule,
    GamificacionModule,
    TournamentsModule,
    ImporterModule,
    MatchesModule,
    TeamsModule,
    ActivityModule,
    MessagesModule,
    AdminModule,
    ProviderModule,
  ],
  providers: [ResultadosCron],
})
export class AppModule {}
