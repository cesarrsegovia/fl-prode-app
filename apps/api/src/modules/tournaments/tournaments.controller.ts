import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TournamentsService } from './tournaments.service';
import { GruposService } from '../grupos/grupos.service';
import { WorldCupImporterService } from '../importer/worldcup-importer.service';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BracketPickDto } from './dto/bracket-pick.dto';
import { R32QualifierPicksDto } from './dto/r32-picks.dto';
import { TopScorerPickDto } from './dto/top-scorer-pick.dto';
import { SetTopScorerDto } from './dto/set-top-scorer.dto';

@Controller('tournaments')
export class TournamentsController {
  constructor(
    private readonly service: TournamentsService,
    private readonly importer: WorldCupImporterService,
    private readonly grupos: GruposService,
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
  @Get(':id/bracket-pick/user/:userId')
  async userBracketPick(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Query('groupId') groupId: string,
    @CurrentUser() user: { userId: string },
  ) {
    await this.grupos.assertSharesGroup(user.userId, userId, groupId);
    return this.service.getMyBracketPick(id, userId);
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

  @Get(':id/bracket-pick/deadline')
  async bracketDeadline(@Param('id') id: string) {
    const deadline = await this.service.getChampionDeadline(id);
    return { deadline };
  }

  @Get(':id/bracket-pick/aggregate')
  bracketPickAggregate(@Param('id') id: string) {
    return this.service.getBracketPickAggregate(id);
  }

  // ---------- R32 picks (clasificados a 16vos) ----------

  @Get(':id/r32-picks/deadline')
  async r32Deadline(@Param('id') id: string) {
    const deadline = await this.service.getR32Deadline(id);
    return { deadline };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/r32-picks/me')
  myR32Picks(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.service.getMyR32Picks(id, user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/r32-picks/user/:userId')
  async userR32Picks(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Query('groupId') groupId: string,
    @CurrentUser() user: { userId: string },
  ) {
    await this.grupos.assertSharesGroup(user.userId, userId, groupId);
    return this.service.getMyR32Picks(id, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/r32-picks')
  setR32Picks(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
    @Body() body: R32QualifierPicksDto,
  ) {
    return this.service.setR32Picks(id, user.userId, body.picks);
  }

  // ---------- Top Scorer (Goleador) ----------

  @Get(':id/players')
  players(@Param('id') id: string) {
    return this.service.getTournamentPlayers(id);
  }

  @Get(':id/top-scorer-pick/deadline')
  async topScorerDeadline(@Param('id') id: string) {
    const deadline = await this.service.getTopScorerDeadline(id);
    return { deadline };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/top-scorer-pick/me')
  myTopScorerPick(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.service.getMyTopScorerPick(id, user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/top-scorer-pick/user/:userId')
  async userTopScorerPick(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Query('groupId') groupId: string,
    @CurrentUser() user: { userId: string },
  ) {
    await this.grupos.assertSharesGroup(user.userId, userId, groupId);
    return this.service.getMyTopScorerPick(id, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':id/top-scorer-pick')
  setTopScorerPick(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
    @Body() body: TopScorerPickDto,
  ) {
    return this.service.setTopScorerPick(id, user.userId, body.playerId);
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Patch(':id/top-scorer')
  setTopScorerWinner(
    @Param('id') id: string,
    @Body() body: SetTopScorerDto,
  ) {
    return this.service.setTournamentTopScorer(id, body.playerId ?? null);
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
