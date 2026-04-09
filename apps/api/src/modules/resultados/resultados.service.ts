import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ResultadosService {
  private readonly logger = new Logger(ResultadosService.name);

  constructor(private readonly prisma: PrismaService) {}

  async fetchAndUpdateResults() {
    // TODO: call external sports API, update match scores
    this.logger.log('Fetching results from external API...');
  }

  async calculatePoints(_fixtureId: string) {
    // TODO: calculate points for all predictions in fixture
    this.logger.log('Calculating points...');
  }
}
