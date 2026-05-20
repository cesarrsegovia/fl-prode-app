import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificacionesService } from './notificaciones.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(AuthGuard('jwt'))
@Controller('notificaciones')
export class NotificacionesController {
  constructor(
    private readonly notificacionesService: NotificacionesService,
  ) {}

  @Get()
  async findAll(@CurrentUser() user: { userId: string }) {
    return this.notificacionesService.findByUser(user.userId);
  }

  @Patch('read')
  async markAllRead(@CurrentUser() user: { userId: string }) {
    return this.notificacionesService.markAllRead(user.userId);
  }

  @Patch(':id/read')
  async markOneRead(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.notificacionesService.markOneRead(user.userId, id);
  }
}
