import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body);
  }

  @Post('register')
  async register(
    @Body() body: { email: string; username: string; password: string },
  ) {
    return this.authService.register(body);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async me(@Request() req: any) {
    return this.authService.getProfile(req.user.userId);
  }
}
