import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacionesService } from '../modules/notificaciones/notificaciones.service';
import { ResultadosService } from '../modules/resultados/resultados.service';

const CLOSING_WINDOW_MINUTES = 60;

@Injectable()
export class ResultadosCron {
  private readonly logger = new Logger(ResultadosCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly resultadosService: ResultadosService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  /**
   * Cada 15 min: avisa a usuarios con pronósticos pendientes en fechas
   * próximas a cerrar (ventana configurable). Idempotente por usuario+fixture
   * usando la tabla de notifications como registro.
   */
  @Cron('*/15 * * * *')
  async handleFixtureClosingNotifications() {
    const now = new Date();
    const upperBound = new Date(now.getTime() + CLOSING_WINDOW_MINUTES * 60_000);

    const closingFixtures = await this.prisma.fixture.findMany({
      where: { closeAt: { gt: now, lte: upperBound } },
      select: { id: true, round: true, closeAt: true },
    });

    if (!closingFixtures.length) return;

    const usersWithAccount = await this.prisma.user.findMany({
      select: { id: true },
    });

    const entries: {
      userId: string;
      type: NotificationType;
      message: string;
    }[] = [];

    for (const fixture of closingFixtures) {
      const existing = await this.prisma.notification.findMany({
        where: {
          type: NotificationType.FIXTURE_CLOSING,
          message: { contains: `#${fixture.id}` },
        },
        select: { userId: true },
      });
      const alreadyNotified = new Set(existing.map((n) => n.userId));

      const predictionsForFixture = await this.prisma.prediction.findMany({
        where: { fixtureId: fixture.id },
        select: { userId: true },
        distinct: ['userId'],
      });
      const withPrediction = new Set(predictionsForFixture.map((p) => p.userId));

      for (const user of usersWithAccount) {
        if (alreadyNotified.has(user.id) || withPrediction.has(user.id)) continue;
        entries.push({
          userId: user.id,
          type: NotificationType.FIXTURE_CLOSING,
          message: `La fecha ${fixture.round} cierra pronto. #${fixture.id}`,
        });
      }
    }

    if (entries.length) {
      const sent = await this.notificaciones.createMany(entries);
      this.logger.log(`Sent ${sent} FIXTURE_CLOSING notifications`);
    }
  }

  @Cron('*/2 * * * *')
  async handleResultPolling() {
    await this.resultadosService.fetchAndUpdateResults();
  }
}
