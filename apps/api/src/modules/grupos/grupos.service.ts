import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GruposService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { name: string; description?: string }) {
    return this.prisma.group.create({ data });
  }

  async findOne(id: string) {
    return this.prisma.group.findUnique({
      where: { id },
      include: { members: { include: { user: true } }, scores: true },
    });
  }

  async join(_inviteCode: string) {
    // TODO: implement join logic with userId from JWT
    return { message: 'join' };
  }
}
