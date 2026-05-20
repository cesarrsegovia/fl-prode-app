import { Controller, Get, Param, Query } from '@nestjs/common';
import { TeamsService } from './teams.service';

@Controller('teams')
export class TeamsController {
  constructor(private readonly service: TeamsService) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get(':id/matches')
  matches(
    @Param('id') id: string,
    @Query('tournamentId') tournamentId: string,
  ) {
    return this.service.getMatches(id, tournamentId);
  }

  @Get(':id/squad')
  squad(
    @Param('id') id: string,
    @Query('tournamentId') tournamentId: string,
  ) {
    return this.service.getSquad(id, tournamentId);
  }
}
