import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MatchesService } from './matches.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('matches')
export class MatchesController {
  constructor(private readonly service: MatchesService) {}

  @Get('today')
  findToday() {
    return this.service.findToday();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get(':id/predictions/aggregate')
  aggregate(@Param('id') id: string) {
    return this.service.getPredictionsAggregate(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/predictions/me')
  myPrediction(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.service.getMyPrediction(user.userId, id);
  }

  @Get(':id/predictions/group/:groupId')
  groupAggregate(
    @Param('id') id: string,
    @Param('groupId') groupId: string,
  ) {
    return this.service.getGroupAggregate(id, groupId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/predictions/group/:groupId/picks')
  groupPicks(
    @Param('id') id: string,
    @Param('groupId') groupId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.service.getGroupPicks(id, groupId, user.userId);
  }
}
