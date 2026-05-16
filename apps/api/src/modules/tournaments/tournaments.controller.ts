import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TournamentsService } from './tournaments.service';
import { WorldCupImporterService } from '../importer/worldcup-importer.service';
import { AdminGuard } from '../../common/guards/admin.guard';

@Controller('tournaments')
export class TournamentsController {
  constructor(
    private readonly service: TournamentsService,
    private readonly importer: WorldCupImporterService,
  ) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('active')
  findActive() {
    return this.service.findActive();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get(':id/groups')
  groups(@Param('id') id: string) {
    return this.service.getGroupsWithStandings(id);
  }

  @Get(':id/schedule')
  schedule(@Param('id') id: string) {
    return this.service.getSchedule(id);
  }

  @Get(':id/venues')
  venues(@Param('id') id: string) {
    return this.service.getVenues(id);
  }

  @Get(':id/teams')
  teams(@Param('id') id: string) {
    return this.service.getTeams(id);
  }

  @Get(':id/bracket')
  bracket(@Param('id') id: string) {
    return this.service.getBracket(id);
  }

  /** Admin: dispara el import del Mundial 2026 desde API-Football. */
  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Post('worldcup/import')
  async importWorldcup(@Body() body: { withSquads?: boolean }) {
    return this.importer.importWorldCup2026({
      withSquads: body?.withSquads ?? false,
    });
  }
}
