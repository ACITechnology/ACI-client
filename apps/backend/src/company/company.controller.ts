// src/company/company.controller.ts
import { Controller, Post } from '@nestjs/common';
import { CompanyService } from './company.service';

@Controller('company')
export class CompanyController {
  constructor(private companyService: CompanyService) {}

  @Post('sync')
  async sync() {
    await this.companyService.syncCompaniesFromAutotask();
    return { message: 'Synchronisation des entreprises lancée avec succès' };
  }
}