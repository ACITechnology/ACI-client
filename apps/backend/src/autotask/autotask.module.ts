// src/autotask/autotask.module.ts
import { Module } from '@nestjs/common';
import { AutotaskService } from './autotask.service';
import { TechniciansService } from './technicians.service'; // ← AJOUTE CET IMPORT
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [
    AutotaskService,
    TechniciansService, // ← AJOUTE LE SERVICE ICI
  ],
  exports: [
    AutotaskService,
    TechniciansService, // ← TRÈS IMPORTANT : on exporte le service pour que AuthModule puisse l'utiliser
  ],
})
export class AutotaskModule {}