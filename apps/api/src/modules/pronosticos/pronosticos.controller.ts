import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PronosticosService } from './pronosticos.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreatePronosticoDto } from './dto/create-pronostico.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('pronosticos')
export class PronosticosController {
  constructor(private readonly pronosticosService: PronosticosService) {}

  @Post()
  async create(
    @CurrentUser() user: { userId: string },
    @Body() body: CreatePronosticoDto,
  ) {
    return this.pronosticosService.create({ ...body, userId: user.userId });
  }

  @Get('me/:fechaId')
  async findMyPredictions(
    @CurrentUser() user: { userId: string },
    @Param('fechaId') fechaId: string,
  ) {
    return this.pronosticosService.findByUserAndFixture(user.userId, fechaId);
  }
}
