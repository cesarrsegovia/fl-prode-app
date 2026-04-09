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
import { EventsGateway } from './websocket/events.gateway';
import { ResultadosCron } from './jobs/resultados.cron';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsuariosModule,
    GruposModule,
    FixturesModule,
    PronosticosModule,
    ResultadosModule,
    RankingModule,
    NotificacionesModule,
    GamificacionModule,
  ],
  providers: [EventsGateway, ResultadosCron],
})
export class AppModule {}
