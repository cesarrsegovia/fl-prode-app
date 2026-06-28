import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../../common/guards/admin.guard';
import { ResultadosService } from './resultados.service';

@Controller('resultados')
export class ResultadosController {
  constructor(private readonly resultados: ResultadosService) {}

  /** Máximos goleadores del torneo (público, cacheado). */
  @Get('top-scorers')
  topScorers(@Query('limit') limit?: string) {
    const n = limit ? Math.min(Math.max(Number(limit) || 5, 1), 20) : 5;
    return this.resultados.getTopScorers(n);
  }

  /**
   * Admin: sincroniza los cruces de R32 desde ESPN (llaves cerradas oficiales),
   * resolviendo terceros y slots mal asignados, y publica las llaves.
   */
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Post('sync-r32-espn')
  syncR32(@Query('tournamentId') tournamentId?: string) {
    return this.resultados.syncR32FromEspn(tournamentId);
  }
}
