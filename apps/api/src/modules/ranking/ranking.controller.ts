import { Controller, Get, Param, Query } from '@nestjs/common';
import { RankingService } from './ranking.service';

@Controller('ranking')
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

  @Get('global')
  async getGlobal(@Query('tournamentId') tournamentId?: string) {
    return this.rankingService.getGlobalRanking(tournamentId);
  }

  @Get('grupo/:id')
  async getByGroup(
    @Param('id') id: string,
    @Query('tournamentId') tournamentId?: string,
  ) {
    return this.rankingService.getGroupRanking(id, tournamentId);
  }
}
