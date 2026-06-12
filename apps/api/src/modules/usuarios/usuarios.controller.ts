import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsuariosService } from './usuarios.service';
import { GruposService } from '../grupos/grupos.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsuariosController {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly grupos: GruposService,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Patch('me')
  async updateMe(
    @CurrentUser() user: { userId: string },
    @Body() body: UpdateUserDto,
  ) {
    return this.usuariosService.update(user.userId, body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me/achievements')
  achievements(@CurrentUser() user: { userId: string }) {
    return this.usuariosService.getAchievements(user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me/predictions')
  predictionsHistory(
    @CurrentUser() user: { userId: string },
    @Query('cursor') cursor?: string,
    @Query('take') take?: string,
  ) {
    return this.usuariosService.getPredictionsHistory(user.userId, {
      cursor,
      take: take ? Number(take) : undefined,
    });
  }

  @Get(':id/stats')
  stats(@Param('id') id: string) {
    return this.usuariosService.getStats(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id/predictions')
  async userPredictions(
    @Param('id') id: string,
    @Query('groupId') groupId: string,
    @CurrentUser() user: { userId: string },
    @Query('cursor') cursor?: string,
    @Query('take') take?: string,
  ) {
    await this.grupos.assertSharesGroup(user.userId, id, groupId);
    return this.usuariosService.getVisiblePredictionsHistory(id, {
      cursor,
      take: take ? Number(take) : undefined,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.usuariosService.findOne(id);
  }
}
