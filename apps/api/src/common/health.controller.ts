import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Health check liviano para los load balancers / plataformas de deploy (Render).
 * Sin auth, sin DB: responde 200 mientras el proceso esté vivo.
 * Ruta final: GET /api/health (por el global prefix 'api').
 *
 * GET /api/health/db toca la base con SELECT 1: pensado para pingers externos
 * (UptimeRobot, cron-job.org) que quieran mantener despiertos la API y el
 * compute de Neon a la vez. No usarlo como healthCheckPath de Render: un
 * cold start de la BD no debe marcar la API como caída.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  check() {
    return { status: 'ok' };
  }

  @Get('db')
  async checkDb() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', db: 'up' };
    } catch {
      throw new ServiceUnavailableException({ status: 'error', db: 'down' });
    }
  }
}
