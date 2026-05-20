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

  /**
   * Canjea un authorizationCode emitido por la plataforma padre por un JWT propio.
   * El frontend llama este endpoint cuando aterriza con `?authorizationCode=...`.
   */
  @Post('provider-exchange')
  async providerExchange(@Body() body: { authorizationCode: string }) {
    return this.authService.loginWithProviderCode(body?.authorizationCode);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async me(@Request() req: any) {
    return this.authService.getProfile(req.user.userId);
  }
}
