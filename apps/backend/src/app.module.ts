// src/app.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { TicketsController } from './tickets/tickets.controller';
import { ConfigModule, ConfigService } from '@nestjs/config'; // <-- Ajout de ConfigService ici
import { HttpModule } from '@nestjs/axios';
import { TicketsModule } from './tickets/tickets.module';
import { AutotaskModule } from './autotask/autotask.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST') || 'redis',
          port: Number(configService.get('REDIS_PORT')) || 6379,
        },
      }),
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    UsersModule,
    AuthModule,
    HttpModule,
    TicketsModule,
    AutotaskModule,
  ],
  controllers: [AppController, TicketsController],
  providers: [AppService],
})
export class AppModule {}