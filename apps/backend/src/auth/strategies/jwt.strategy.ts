// src/auth/strategies/jwt.strategy.ts
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
// Supprime l'import de jwtConstants si tu ne l'utilises plus ici

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  ignoreExpiration: false,
  secretOrKey: process.env.JWT_SECRET!, // On ajoute le ! ici
});
  }

  async validate(payload: any) {
    return { 
      userId: payload.sub, 
      email: payload.email,
      role: payload.role,
      autotaskContactId: payload.autotaskContactId,
      autotaskCompanyId: payload.autotaskCompanyId 
    };
  }
}