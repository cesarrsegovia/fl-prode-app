import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ResultadosService } from '../modules/resultados/resultados.service';

@Injectable()
export class ResultadosCron {
  private readonly logger = new Logger(ResultadosCron.name);

  constructor(private readonly resultadosService: ResultadosService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleFixtureClose() {
    this.logger.debug('Checking for fixtures to close...');
    // closeAt is enforced by FixturesService.findActive() (where closeAt > now)
    // No extra action needed here unless sending closing notifications
  }

  @Cron('*/2 * * * *')
  async handleResultPolling() {
    this.logger.debug('Polling external API for results...');
    await this.resultadosService.fetchAndUpdateResults();
  }
}
