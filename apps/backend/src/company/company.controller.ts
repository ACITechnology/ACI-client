// src/company/company.controller.ts
import { CompanyService } from './company.service';
import { Controller, Post, Get, Query } from '@nestjs/common';

@Controller('company')
export class CompanyController {
  constructor(private companyService: CompanyService) {}

  @Post('sync')
  async sync() {
    await this.companyService.syncCompaniesFromAutotask();
    return { message: 'Synchronisation des entreprises lancée avec succès' };
  }

  @Get('search')
  async search(@Query('q') query: string) {
    if (!query || query.length < 2) {
      return [];
    }
    return this.companyService.searchCompanies(query);
  }
}