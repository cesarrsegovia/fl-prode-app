import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminService } from './admin.service';
import { UpdateUserAdminDto } from './dto/update-user-admin.dto';

@UseGuards(AuthGuard('jwt'), AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  overview() {
    return this.adminService.overview();
  }

  @Get('users')
  listUsers(
    @Query('search') search?: string,
    @Query('cursor') cursor?: string,
    @Query('take') take?: string,
  ) {
    return this.adminService.listUsers({
      search,
      cursor,
      take: take ? Number(take) : undefined,
    });
  }

  @Get('users/:id/prode')
  userProde(
    @Param('id') id: string,
    @Query('tournamentId') tournamentId?: string,
  ) {
    return this.adminService.getUserProde(id, tournamentId);
  }

  @Patch('users/:id/admin')
  setUserAdmin(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() body: UpdateUserAdminDto,
  ) {
    return this.adminService.setUserAdmin(id, body.isAdmin, user.userId);
  }

  @Get('groups')
  listGroups(
    @Query('search') search?: string,
    @Query('cursor') cursor?: string,
    @Query('take') take?: string,
  ) {
    return this.adminService.listGroups({
      search,
      cursor,
      take: take ? Number(take) : undefined,
    });
  }

  @Delete('groups/:id')
  deleteGroup(@Param('id') id: string) {
    return this.adminService.deleteGroup(id);
  }
}
