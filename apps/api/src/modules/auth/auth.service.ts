import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Register a new user with email/password.
   * Returns the JWT access token on success.
   */
  async register(body: { email: string; username: string; password: string }) {
    // Check for existing user
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: body.email }, { username: body.username }],
      },
    });

    if (existing) {
      throw new ConflictException(
        existing.email === body.email
          ? 'El email ya está registrado'
          : 'El nombre de usuario ya está en uso',
      );
    }

    const passwordHash = await bcrypt.hash(body.password, SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: body.email,
        username: body.username,
        passwordHash,
      },
    });

    return this.buildTokenResponse(user);
  }

  /**
   * Login with email/password.
   * Returns the JWT access token on success.
   */
  async login(body: { email: string; password: string }) {
    const user = await this.prisma.user.findUnique({
      where: { email: body.email },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    const isPasswordValid = await bcrypt.compare(
      body.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    return this.buildTokenResponse(user);
  }

  /**
   * Return current user profile from a valid JWT payload.
   */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return user;
  }

  // ───────── Private helpers ─────────

  private buildTokenResponse(user: { id: string; email: string; username: string }) {
    const payload = { sub: user.id, email: user.email, username: user.username };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    };
  }
}
