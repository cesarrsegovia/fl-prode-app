import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FixturesService {
  constructor(private readonly prisma: PrismaService) {}

  async findActive() {
    return this.prisma.fixture.findMany({
      where: { closeAt: { gt: new Date() } },
      include: { matches: true },
      orderBy: { closeAt: 'asc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.fixture.findUnique({
      where: { id },
      include: { matches: true },
    });
  }
}
