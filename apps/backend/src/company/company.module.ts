// src/company/company.module.ts
import { Module } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CompanyController } from './company.controller';

@Module({
  providers: [CompanyService],
  controllers: [CompanyController],
  exports: [CompanyService], // ← obligatoire pour l'exporter
})
export class CompanyModule {}