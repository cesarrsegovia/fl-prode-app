import { Controller, Get, Patch, Param, Body } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';

@Controller('users')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.usuariosService.findOne(id);
  }

  @Patch('me')
  async updateMe(@Body() body: Record<string, unknown>) {
    // TODO: extract userId from JWT
    return this.usuariosService.update('userId', body);
  }
}
