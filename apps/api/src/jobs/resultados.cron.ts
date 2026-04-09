import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ResultadosCron {
  private readonly logger = new Logger(ResultadosCron.name);

  @Cron(CronExpression.EVERY_MINUTE)
  async handleFixtureClose() {
    // TODO: check if any fixture needs to be closed based on closeAt
    this.logger.debug('Checking for fixtures to close...');
  }

  @Cron('*/2 * * * *')
  async handleResultPolling() {
    // TODO: poll external sports API for live match results
    this.logger.debug('Polling external API for results...');
  }
}
