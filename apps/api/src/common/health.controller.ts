import { Controller, Get } from '@nestjs/common';

/**
 * Health check liviano para los load balancers / plataformas de deploy (Render).
 * Sin auth, sin DB: responde 200 mientras el proceso esté vivo.
 * Ruta final: GET /api/health (por el global prefix 'api').
 */
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok' };
  }
}
