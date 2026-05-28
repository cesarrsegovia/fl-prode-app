import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error(
        'JWT_SECRET no está configurado. AuthModule firma con env.JWT_SECRET; ' +
          'sin él la firma y la validación divergen y todo da 401.',
      );
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: {
    sub: string;
    email: string;
    isAdmin?: boolean;
  }) {
    return {
      userId: payload.sub,
      email: payload.email,
      isAdmin: !!payload.isAdmin,
    };
  }
}
