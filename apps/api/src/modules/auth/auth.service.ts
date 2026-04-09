import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(_body: { email: string; password: string }) {
    // TODO: implement login logic
    return { message: 'login' };
  }

  async register(_body: {
    email: string;
    username: string;
    password: string;
  }) {
    // TODO: implement register logic
    return { message: 'register' };
  }

  async refresh(_refreshToken: string) {
    // TODO: implement refresh logic
    return { message: 'refresh' };
  }
}
