import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { GruposService } from './grupos.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { GroupMemberGuard } from '../../common/guards/group-member.guard';
import { CreateGrupoDto } from './dto/create-grupo.dto';
import { UpdateGrupoDto } from './dto/update-grupo.dto';
import { JoinGrupoDto } from './dto/join-grupo.dto';
import { UpdateMemberDto } from './dto/update-member.dto';

@Controller('grupos')
export class GruposController {
  constructor(private readonly gruposService: GruposService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async create(
    @CurrentUser() user: { userId: string },
    @Body() body: CreateGrupoDto,
  ) {
    return this.gruposService.create(body, user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('mine')
  async mine(@CurrentUser() user: { userId: string }) {
    return this.gruposService.findMine(user.userId);
  }

  @UseGuards(AuthGuard('jwt'), GroupMemberGuard)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.gruposService.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'), GroupMemberGuard)
  @Roles(Role.ADMIN)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: UpdateGrupoDto) {
    return this.gruposService.update(id, body);
  }

  @UseGuards(AuthGuard('jwt'), GroupMemberGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.gruposService.remove(id);
  }

  @UseGuards(AuthGuard('jwt'), GroupMemberGuard)
  @Roles(Role.ADMIN)
  @Post(':id/invite/regenerate')
  async regenerateInvite(@Param('id') id: string) {
    return this.gruposService.regenerateInviteCode(id);
  }

  @Get('preview/:inviteCode')
  async preview(@Param('inviteCode') inviteCode: string) {
    return this.gruposService.previewByInvite(inviteCode);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('join')
  async join(
    @CurrentUser() user: { userId: string },
    @Body() body: JoinGrupoDto,
  ) {
    return this.gruposService.join(body.inviteCode, user.userId);
  }

  @UseGuards(AuthGuard('jwt'), GroupMemberGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/members/:userId')
  async updateMemberRole(
    @Param('id') id: string,
    @Param('userId') memberUserId: string,
    @Body() body: UpdateMemberDto,
  ) {
    return this.gruposService.updateMemberRole(id, memberUserId, body.role);
  }

  @UseGuards(AuthGuard('jwt'), GroupMemberGuard)
  @Roles(Role.ADMIN)
  @Delete(':id/members/:userId')
  async removeMember(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Param('userId') memberUserId: string,
  ) {
    return this.gruposService.removeMember(id, memberUserId, user.userId);
  }

  @UseGuards(AuthGuard('jwt'), GroupMemberGuard)
  @Post(':id/leave')
  async leave(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.gruposService.leave(id, user.userId);
  }
}
