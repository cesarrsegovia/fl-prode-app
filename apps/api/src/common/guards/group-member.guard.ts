import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Verifica que el usuario autenticado sea miembro del grupo indicado en :id.
 * Si se anota el handler con @Roles(Role.ADMIN), además exige ese rol dentro del grupo.
 * Requiere que AuthGuard('jwt') se haya ejecutado antes para poblar request.user.
 */
@Injectable()
export class GroupMemberGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const userId: string | undefined = req.user?.userId;
    const groupId: string | undefined = req.params?.id ?? req.params?.groupId;

    if (!userId) throw new ForbiddenException('No autenticado');
    if (!groupId) throw new NotFoundException('groupId ausente en la ruta');

    const member = await this.prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    if (!member) throw new ForbiddenException('No sos miembro de este grupo');

    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    if (requiredRoles?.length && !requiredRoles.includes(member.role)) {
      throw new ForbiddenException('Permisos insuficientes en el grupo');
    }

    req.groupMember = member;
    return true;
  }
}
