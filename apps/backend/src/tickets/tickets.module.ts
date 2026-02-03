import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq'; // Garde-le une seule fois ici
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TicketsWorker } from './workers/tickets.worker';
import { TicketsGateway } from './tickets.gateway';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    BullModule.registerQueue({
      name: 'autotask-queue',
    }),
  ],
  controllers: [TicketsController],
  providers: [
    TicketsService,
    TicketsWorker,
    TicketsGateway
  ],
  exports: [TicketsService],
})
export class TicketsModule {}