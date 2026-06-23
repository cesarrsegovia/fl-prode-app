import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationType, Prisma } from '@prisma/client';
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
      select: { id: true, round: true },
    });
    if (!closingFixtures.length) return;

    const entries: {
      userId: string;
      type: NotificationType;
      message: string;
      payload: Prisma.InputJsonValue;
    }[] = [];

    for (const fixture of closingFixtures) {
      // Conjunto objetivo calculado en la DB: usuarios SIN predicción en esta
      // fixture y SIN notificación previa de cierre para ella. Antes esto
      // cargaba TODOS los usuarios a memoria y filtraba con un LIKE sobre el
      // texto del mensaje (full scan). Ahora es un solo query con anti-joins
      // sobre índices, y la idempotencia usa payload->>'fixtureId'.
      const targets = await this.prisma.$queryRaw<{ id: string }[]>`
        SELECT u.id
        FROM "User" u
        WHERE NOT EXISTS (
          SELECT 1 FROM "Prediction" p
          WHERE p."userId" = u.id AND p."fixtureId" = ${fixture.id}
        )
        AND NOT EXISTS (
          SELECT 1 FROM "Notification" n
          WHERE n."userId" = u.id
            AND n.type = 'FIXTURE_CLOSING'
            AND n.payload->>'fixtureId' = ${fixture.id}
        )
      `;

      for (const t of targets) {
        entries.push({
          userId: t.id,
          type: NotificationType.FIXTURE_CLOSING,
          message: `La fecha ${fixture.round} cierra pronto.`,
          payload: { fixtureId: fixture.id, round: fixture.round },
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
