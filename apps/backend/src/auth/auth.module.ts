import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from './jwt.config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AutotaskModule } from '../autotask/autotask.module';
import { CompanyModule } from '../company/company.module';
import { TicketsModule } from '../tickets/tickets.module';

@Module({
  imports: [
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '2h' },
    }),
    AutotaskModule,
    CompanyModule,
    TicketsModule,
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}