// src/autotask/autotask.module.ts
import { Module } from '@nestjs/common';
import { AutotaskService } from './autotask.service';

@Module({
  providers: [AutotaskService],
  exports: [AutotaskService], // ← TRÈS IMPORTANT : on exporte le service pour que AuthModule puisse l'utiliser
})
export class AutotaskModule {}