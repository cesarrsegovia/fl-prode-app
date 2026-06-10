import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Keep-alive de la base de datos (Neon free se autosuspende a los ~5 min de
 * inactividad, lo que provoca cold starts y P1001 transitorios).
 *
 * Un SELECT 1 cada 4 minutos mantiene el compute despierto MIENTRAS la API
 * esté corriendo. Activar con DB_KEEPALIVE=1 en .env.
 *
 * ⚠️ Costo: Neon free incluye ~190 compute-hours/mes; mantener la BD despierta
 * 24/7 las agota a mitad de mes. Usarlo en dev (la API local corre solo
 * mientras trabajás) o en prod solo si se monitorea el consumo. Para
 * producción real conviene plan pago de Neon con autosuspend ajustado.
 */
@Injectable()
export class DbKeepaliveCron {
  private readonly logger = new Logger(DbKeepaliveCron.name);
  private readonly enabled = process.env.DB_KEEPALIVE === '1';
  private failures = 0;

  constructor(private readonly prisma: PrismaService) {
    if (this.enabled) {
      this.logger.log('DB keep-alive activo (ping cada 4 min).');
    }
  }

  @Cron('*/4 * * * *')
  async ping() {
    if (!this.enabled) return;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      if (this.failures > 0) {
        this.logger.log(`DB de vuelta en línea tras ${this.failures} fallos.`);
        this.failures = 0;
      }
    } catch (err) {
      this.failures++;
      // Un fallo aislado es normal justo cuando Neon despierta; logueamos
      // como warning recién al segundo consecutivo.
      const msg = `Keep-alive falló (${this.failures} seguidos): ${(err as Error).message}`;
      if (this.failures >= 2) this.logger.warn(msg);
      else this.logger.debug(msg);
    }
  }
}
