import { ForbiddenException, Injectable } from '@nestjs/common';
import { ActivityType, Prisma } from '@prisma/client';
import { WS_EVENTS } from '@prode/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../../websocket/events.gateway';

type EmitInput = {
  groupId: string;
  userId: string;
  type: ActivityType;
  message: string;
  payload?: Prisma.InputJsonValue;
};

@Injectable()
export class ActivityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
  ) {}

  async listByGroup(groupId: string, userId: string, take = 50, cursor?: string) {
    await this.ensureMembership(groupId, userId);

    const items = await this.prisma.activity.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
      },
    });

    return items;
  }

  async emit(input: EmitInput) {
    const activity = await this.prisma.activity.create({
      data: {
        groupId: input.groupId,
        userId: input.userId,
        type: input.type,
        message: input.message,
        payload: input.payload,
      },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
      },
    });
    this.events.emitToGroup(input.groupId, WS_EVENTS.ACTIVITY_NEW, activity);
    return activity;
  }

  async emitToUserGroups(
    userId: string,
    factory: (groupId: string) => Omit<EmitInput, 'groupId'>,
  ) {
    const memberships = await this.prisma.groupMember.findMany({
      where: { userId },
      select: { groupId: true },
    });
    if (!memberships.length) return [];

    const results = await Promise.all(
      memberships.map((m) => this.emit({ groupId: m.groupId, ...factory(m.groupId) })),
    );
    return results;
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
