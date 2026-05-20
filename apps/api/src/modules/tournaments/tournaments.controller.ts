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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BracketPickDto } from './dto/bracket-pick.dto';

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

  // ---------- BracketPick ----------

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/bracket-pick/me')
  myBracketPick(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.service.getMyBracketPick(id, user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/bracket-pick')
  setBracketPick(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
    @Body() body: BracketPickDto,
  ) {
    return this.service.setBracketPick(id, user.userId, body.champTeamId);
  }

  @Get(':id/bracket-pick/aggregate')
  bracketPickAggregate(@Param('id') id: string) {
    return this.service.getBracketPickAggregate(id);
  }

  // ---------- TournamentEntry (wallet del padre) ----------

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/entry/me')
  myEntry(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.service.getMyEntry(id, user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/entry')
  joinTournament(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.service.joinTournament(id, user.userId);
  }

  // ---------- Admin ----------

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Post('worldcup/import')
  async importWorldcup(@Body() body: { withSquads?: boolean }) {
    return this.importer.importWorldCup2026({
      withSquads: body?.withSquads ?? false,
    });
  }
}
