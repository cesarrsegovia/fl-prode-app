import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ActivityType, Role } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { CreateGrupoDto } from './dto/create-grupo.dto';
import { UpdateGrupoDto } from './dto/update-grupo.dto';

@Injectable()
export class GruposService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {}

  async create(data: CreateGrupoDto, userId: string) {
    return this.prisma.group.create({
      data: {
        name: data.name,
        description: data.description,
        isPrivate: data.isPrivate ?? true,
        members: { create: { userId, role: Role.ADMIN } },
      },
      include: { members: true },
    });
  }

  async findOne(id: string) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: { select: { id: true, username: true, avatarUrl: true } },
          },
        },
        scores: true,
      },
    });
    if (!group) throw new NotFoundException('Grupo no encontrado');
    return group;
  }

  async findMine(userId: string) {
    const memberships = await this.prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: {
          include: { _count: { select: { members: true } } },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });
    return memberships.map((m) => ({
      role: m.role,
      joinedAt: m.joinedAt,
      group: m.group,
    }));
  }

  async update(id: string, data: UpdateGrupoDto) {
    await this.ensureExists(id);
    return this.prisma.group.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.$transaction([
      this.prisma.groupScore.deleteMany({ where: { groupId: id } }),
      this.prisma.groupMember.deleteMany({ where: { groupId: id } }),
      this.prisma.group.delete({ where: { id } }),
    ]);
    return { id };
  }

  async regenerateInviteCode(id: string) {
    await this.ensureExists(id);
    const newCode = randomBytes(8).toString('hex');
    return this.prisma.group.update({
      where: { id },
      data: { inviteCode: newCode },
      select: { id: true, inviteCode: true },
    });
  }

  /** Vista pública (sin auth) para la landing de invitación. */
  async previewByInvite(inviteCode: string) {
    const group = await this.prisma.group.findUnique({
      where: { inviteCode },
      select: {
        id: true,
        name: true,
        description: true,
        isPrivate: true,
        createdAt: true,
        _count: { select: { members: true } },
      },
    });
    if (!group) throw new NotFoundException('Código de invitación inválido');
    return group;
  }

  async join(inviteCode: string, userId: string) {
    const group = await this.prisma.group.findUnique({ where: { inviteCode } });
    if (!group) throw new NotFoundException('Código de invitación inválido');

    const existing = await this.prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId: group.id } },
    });
    if (existing) throw new ConflictException('Ya sos miembro de este grupo');

    await this.prisma.groupMember.create({
      data: { userId, groupId: group.id, role: Role.MEMBER },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });
    await this.activity.emit({
      groupId: group.id,
      userId,
      type: ActivityType.MEMBER_JOINED,
      message: `${user?.username ?? 'Un usuario'} se unió al grupo`,
    });

    return group;
  }

  async updateMemberRole(groupId: string, memberUserId: string, role: Role) {
    const target = await this.prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: memberUserId, groupId } },
    });
    if (!target) throw new NotFoundException('El usuario no es miembro del grupo');

    if (target.role === Role.ADMIN && role === Role.MEMBER) {
      await this.ensureAnotherAdmin(groupId, memberUserId);
    }

    return this.prisma.groupMember.update({
      where: { id: target.id },
      data: { role },
    });
  }

  async removeMember(groupId: string, memberUserId: string, requesterId: string) {
    const target = await this.prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: memberUserId, groupId } },
    });
    if (!target) throw new NotFoundException('El usuario no es miembro del grupo');

    if (target.role === Role.ADMIN && memberUserId !== requesterId) {
      throw new BadRequestException('No podés expulsar a otro admin');
    }
    if (target.role === Role.ADMIN) {
      await this.ensureAnotherAdmin(groupId, memberUserId);
    }

    await this.prisma.groupMember.delete({ where: { id: target.id } });
    return { id: target.id };
  }

  async leave(groupId: string, userId: string) {
    return this.removeMember(groupId, userId, userId);
  }

  private async ensureExists(id: string) {
    const g = await this.prisma.group.findUnique({ where: { id }, select: { id: true } });
    if (!g) throw new NotFoundException('Grupo no encontrado');
  }

  private async ensureAnotherAdmin(groupId: string, excludingUserId: string) {
    const others = await this.prisma.groupMember.count({
      where: { groupId, role: Role.ADMIN, userId: { not: excludingUserId } },
    });
    if (others === 0) {
      throw new BadRequestException(
        'El grupo debe conservar al menos un admin. Promové a otro miembro antes de continuar.',
      );
    }
  }
}
