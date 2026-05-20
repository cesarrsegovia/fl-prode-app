import { Injectable } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { WS_EVENTS } from '@prode/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../../websocket/events.gateway';

@Injectable()
export class NotificacionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
  ) {}

  async findByUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  async markOneRead(userId: string, id: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
  }

  async create(userId: string, type: NotificationType, message: string) {
    const notification = await this.prisma.notification.create({
      data: { userId, type, message },
    });
    this.events.emitToUser(userId, WS_EVENTS.NOTIFICATION_NEW, notification);
    return notification;
  }

  async createMany(
    entries: { userId: string; type: NotificationType; message: string }[],
  ) {
    if (!entries.length) return 0;
    const created = await this.prisma.notification.createManyAndReturn({
      data: entries,
    });
    for (const n of created) {
      this.events.emitToUser(n.userId, WS_EVENTS.NOTIFICATION_NEW, n);
    }
    return created.length;
  }
}
