import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PronosticosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Record<string, unknown>) {
    // TODO: validate fixture is open, create prediction
    return { message: 'create', data };
  }

  async findByUserAndFixture(userId: string, fixtureId: string) {
    return this.prisma.prediction.findMany({
      where: { userId, fixtureId },
      include: { match: true },
    });
  }
}
