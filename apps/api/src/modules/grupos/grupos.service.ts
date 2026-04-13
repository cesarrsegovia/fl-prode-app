import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GruposService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { name: string; description?: string }, userId: string) {
    return this.prisma.group.create({
      data: {
        ...data,
        members: {
          create: { userId, role: 'ADMIN' },
        },
      },
      include: { members: true },
    });
  }

  async findOne(id: string) {
    return this.prisma.group.findUnique({
      where: { id },
      include: { members: { include: { user: true } }, scores: true },
    });
  }

  async join(inviteCode: string, userId: string) {
    const group = await this.prisma.group.findUnique({ where: { inviteCode } });
    if (!group) throw new NotFoundException('Código de invitación inválido');

    const existing = await this.prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId: group.id } },
    });
    if (existing) throw new ConflictException('Ya eres miembro de este grupo');

    await this.prisma.groupMember.create({
      data: { userId, groupId: group.id, role: 'MEMBER' },
    });

    return group;
  }
}
