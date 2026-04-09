import { Controller, Get, Patch } from '@nestjs/common';
import { NotificacionesService } from './notificaciones.service';

@Controller('notificaciones')
export class NotificacionesController {
  constructor(
    private readonly notificacionesService: NotificacionesService,
  ) {}

  @Get()
  async findAll() {
    // TODO: extract userId from JWT
    return this.notificacionesService.findByUser('userId');
  }

  @Patch('read')
  async markAllRead() {
    // TODO: extract userId from JWT
    return this.notificacionesService.markAllRead('userId');
  }
}
