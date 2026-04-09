import { Controller, Get, Param } from '@nestjs/common';
import { RankingService } from './ranking.service';

@Controller('ranking')
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

  @Get('global')
  async getGlobal() {
    return this.rankingService.getGlobalRanking();
  }

  @Get('grupo/:id')
  async getByGroup(@Param('id') id: string) {
    return this.rankingService.getGroupRanking(id);
  }
}
