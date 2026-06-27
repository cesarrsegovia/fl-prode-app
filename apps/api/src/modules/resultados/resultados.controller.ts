import { Controller, Get, Query } from '@nestjs/common';
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
}
