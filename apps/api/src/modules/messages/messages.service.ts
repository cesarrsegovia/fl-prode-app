import { ForbiddenException, Injectable } from '@nestjs/common';
import { WS_EVENTS } from '@prode/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../../websocket/events.gateway';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
  ) {}

  async listByGroup(groupId: string, userId: string, take = 50, cursor?: string) {
    await this.ensureMembership(groupId, userId);

    const items = await this.prisma.message.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
      },
    });

    // Return chronological (oldest -> newest) for easier rendering
    return items.reverse();
  }

  async send(groupId: string, userId: string, content: string) {
    await this.ensureMembership(groupId, userId);

    const trimmed = content.trim();
    const message = await this.prisma.message.create({
      data: { groupId, userId, content: trimmed },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
      },
    });

    this.events.emitToGroup(groupId, WS_EVENTS.MESSAGE_NEW, message);
    return message;
  }

  private async ensureMembership(groupId: string, userId: string) {
    const membership = await this.prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
      select: { id: true },
    });
    if (!membership) {
      throw new ForbiddenException('No sos miembro de este grupo');
    }
  }
}
