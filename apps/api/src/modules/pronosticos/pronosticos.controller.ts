import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { PronosticosService } from './pronosticos.service';

@Controller('pronosticos')
export class PronosticosController {
  constructor(private readonly pronosticosService: PronosticosService) {}

  @Post()
  async create(@Body() body: Record<string, unknown>) {
    return this.pronosticosService.create(body);
  }

  @Get('me/:fechaId')
  async findMyPredictions(@Param('fechaId') fechaId: string) {
    // TODO: extract userId from JWT
    return this.pronosticosService.findByUserAndFixture('userId', fechaId);
  }
}
