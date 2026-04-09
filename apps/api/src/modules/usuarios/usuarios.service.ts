import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async update(id: string, data: Record<string, unknown>) {
    return this.prisma.user.update({
      where: { id },
      data: data as { username?: string; avatarUrl?: string; bio?: string },
    });
  }
}
