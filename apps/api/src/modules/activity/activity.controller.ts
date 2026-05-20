import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ActivityService } from './activity.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(AuthGuard('jwt'))
@Controller('grupos/:groupId/activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  async list(
    @CurrentUser() user: { userId: string },
    @Param('groupId') groupId: string,
    @Query('cursor') cursor?: string,
    @Query('take') take?: string,
  ) {
    const limit = Math.min(Math.max(Number(take) || 50, 1), 100);
    return this.activityService.listByGroup(groupId, user.userId, limit, cursor);
  }
}
