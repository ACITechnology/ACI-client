import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AutotaskModule } from '../autotask/autotask.module';
import { CompanyModule } from '../company/company.module';
import { TicketsModule } from '../tickets/tickets.module';
import { ConfigModule, ConfigService } from '@nestjs/config'; // <-- Ajoute ceci

@Module({
  imports: [
    // On remplace JwtModule.register par JwtModule.registerAsync
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'), // Lit le .env
        signOptions: { expiresIn: '2h' },
      }),
    }),
    AutotaskModule,
    CompanyModule,
    TicketsModule,
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}