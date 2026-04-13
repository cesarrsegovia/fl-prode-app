import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GruposService } from './grupos.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('grupos')
export class GruposController {
  constructor(private readonly gruposService: GruposService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async create(
    @CurrentUser() user: { userId: string },
    @Body() body: { name: string; description?: string },
  ) {
    return this.gruposService.create(body, user.userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.gruposService.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('join')
  async join(
    @CurrentUser() user: { userId: string },
    @Body() body: { inviteCode: string },
  ) {
    return this.gruposService.join(body.inviteCode, user.userId);
  }
}
