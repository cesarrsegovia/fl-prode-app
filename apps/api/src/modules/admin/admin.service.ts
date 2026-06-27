import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TournamentsService } from '../tournaments/tournaments.service';
import { UsuariosService } from '../usuarios/usuarios.service';

interface ListOpts {
  search?: string;
  take?: number;
  cursor?: string;
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tournaments: TournamentsService,
    private readonly usuarios: UsuariosService,
  ) {}

  /**
   * Prode completo de un usuario para la vista de admin: NO exige compartir
   * grupo (el AdminGuard ya autorizó). Reúne campeón, goleador, clasificados a
   * R32 e historial visible de picks de partido. Si no se pasa tournamentId,
   * usa el torneo activo.
   */
  async getUserProde(userId: string, tournamentId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true, avatarUrl: true, isAdmin: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const tid =
      tournamentId ??
      (
        await this.prisma.tournament.findFirst({
          where: { isActive: true },
          select: { id: true },
        })
      )?.id;

    if (!tid) {
      return { user, tournamentId: null, champion: null, topScorer: null, r32: [], history: { items: [], nextCursor: null } };
    }

    const [champion, topScorer, r32, history] = await Promise.all([
      this.tournaments.getMyBracketPick(tid, userId),
      this.tournaments.getMyTopScorerPick(tid, userId),
      this.tournaments.getMyR32Picks(tid, userId),
      this.usuarios.getVisiblePredictionsHistory(userId, { take: 100 }),
    ]);

    return { user, tournamentId: tid, champion, topScorer, r32, history };
  }

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
