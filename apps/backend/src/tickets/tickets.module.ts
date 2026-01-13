import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { HttpModule } from '@nestjs/axios'; // ← AJOUT
import { ConfigModule } from '@nestjs/config'; // ← AJOUT

@Module({
    imports: [
    HttpModule,         // ← AJOUT
    ConfigModule,       // ← AJOUT
  ],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService], // ← important si tu veux l'utiliser ailleurs plus tard
})
export class TicketsModule {}