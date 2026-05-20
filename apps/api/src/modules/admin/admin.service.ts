import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

interface ListOpts {
  search?: string;
  take?: number;
  cursor?: string;
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(opts: ListOpts = {}) {
    const take = Math.min(Math.max(opts.take ?? 30, 1), 100);
    const cursor = opts.cursor ? { id: opts.cursor } : undefined;

    const where: Prisma.UserWhereInput = opts.search
      ? {
          OR: [
            { username: { contains: opts.search, mode: 'insensitive' } },
            { email: { contains: opts.search, mode: 'insensitive' } },
          ],
        }
      : {};

    const items = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(cursor && { cursor, skip: 1 }),
      select: {
        id: true,
        email: true,
        username: true,
        avatarUrl: true,
        isAdmin: true,
        createdAt: true,
        _count: {
          select: {
            predictions: true,
            memberships: true,
          },
        },
      },
    });
    const hasMore = items.length > take;
    const rows = hasMore ? items.slice(0, take) : items;
    return {
      items: rows,
      nextCursor: hasMore ? rows[rows.length - 1].id : null,
    };
  }

  async setUserAdmin(userId: string, isAdmin: boolean, requesterId: string) {
    if (userId === requesterId && !isAdmin) {
      throw new BadRequestException('No podés quitarte el rol admin a vos mismo');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    return this.prisma.user.update({
      where: { id: userId },
      data: { isAdmin },
      select: { id: true, isAdmin: true },
    });
  }

  async listGroups(opts: ListOpts = {}) {
    const take = Math.min(Math.max(opts.take ?? 30, 1), 100);
    const cursor = opts.cursor ? { id: opts.cursor } : undefined;

    const where: Prisma.GroupWhereInput = opts.search
      ? { name: { contains: opts.search, mode: 'insensitive' } }
      : {};

    const items = await this.prisma.group.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(cursor && { cursor, skip: 1 }),
      select: {
        id: true,
        name: true,
        description: true,
        isPrivate: true,
        inviteCode: true,
        createdAt: true,
        _count: {
          select: {
            members: true,
            messages: true,
            activities: true,
          },
        },
      },
    });
    const hasMore = items.length > take;
    const rows = hasMore ? items.slice(0, take) : items;
    return {
      items: rows,
      nextCursor: hasMore ? rows[rows.length - 1].id : null,
    };
  }

  async deleteGroup(groupId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true },
    });
    if (!group) throw new NotFoundException('Grupo no encontrado');

    await this.prisma.$transaction([
      this.prisma.message.deleteMany({ where: { groupId } }),
      this.prisma.activity.deleteMany({ where: { groupId } }),
      this.prisma.groupScore.deleteMany({ where: { groupId } }),
      this.prisma.groupMember.deleteMany({ where: { groupId } }),
      this.prisma.group.delete({ where: { id: groupId } }),
    ]);
    return { id: groupId };
  }

  async overview() {
    const [users, groups, predictions, messagesCount, activitiesCount] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.group.count(),
      this.prisma.prediction.count(),
      this.prisma.message.count(),
      this.prisma.activity.count(),
    ]);
    return { users, groups, predictions, messages: messagesCount, activities: activitiesCount };
  }
}
