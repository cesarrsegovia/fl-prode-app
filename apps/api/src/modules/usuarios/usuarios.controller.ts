import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsuariosService } from './usuarios.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('users')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.usuariosService.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('me')
  async updateMe(
    @CurrentUser() user: { userId: string },
    @Body() body: Record<string, unknown>,
  ) {
    return this.usuariosService.update(user.userId, body);
  }
}
