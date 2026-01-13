// src/app.module.ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { TicketsController } from './tickets/tickets.controller';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { TicketsModule } from './tickets/tickets.module';
import { AutotaskModule } from './autotask/autotask.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    UsersModule, 
    AuthModule, 
    ConfigModule.forRoot({ isGlobal: true }), 
    HttpModule, 
    TicketsModule, 
    AutotaskModule
  ],
  controllers: [AppController, TicketsController],
  providers: [AppService],  // ← PrismaService supprimé ici
})
export class AppModule {}