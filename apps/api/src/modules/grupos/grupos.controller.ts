import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { GruposService } from './grupos.service';

@Controller('grupos')
export class GruposController {
  constructor(private readonly gruposService: GruposService) {}

  @Post()
  async create(@Body() body: { name: string; description?: string }) {
    return this.gruposService.create(body);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.gruposService.findOne(id);
  }

  @Post('join')
  async join(@Body() body: { inviteCode: string }) {
    return this.gruposService.join(body.inviteCode);
  }
}
