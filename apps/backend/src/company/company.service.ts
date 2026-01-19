// src/company/company.service.ts
import { PrismaService } from '../prisma.service';
import axios from 'axios';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class CompanyService implements OnModuleInit{
  private readonly logger = new Logger(CompanyService.name);

   // TES CLÉS AUTOTASK (on les mettra dans .env plus tard)
  private readonly BASE_URL = 'https://webservices16.autotask.net/ATServicesRest/V1.0';
  private readonly headers = {
    ApiIntegrationCode: 'D66IA7GZJ77T3UAJOVHCVT7KKXT',
    UserName: 'e2bofpdnmykvqf6@ACITECHNOLOGY.FR',
    Secret: 'Seb12345!',
    'Content-Type': 'application/json',
  };

  async onModuleInit() {
    this.logger.log('Démarrage initial : synchronisation des entreprises Autotask');
    await this.syncCompaniesFromAutotask();
  }

  constructor(private prisma: PrismaService) {}

  // Recherche intelligente – autocomplete
  async searchCompanies(query: string) {
    if (!query || query.length < 2) {
      return [];
    }

    const normalized = this.normalizeString(query);

    return this.prisma.company.findMany({
      where: {
        nameNormalized: {
          startsWith: normalized,
          mode: 'insensitive',
        },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        autotaskId: true,
      },
      orderBy: {
        name: 'asc',
      },
      take: 10,
    });
  }

  // Normalise pour enlever accents + minuscule
  private normalizeString(str: string): string {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  // Récupère une entreprise par ID (pour le register)
  async getCompanyById(id: number) {
    return this.prisma.company.findUnique({
      where: { id },
    });
  }

    // SYNCHRO AUTOMATIQUE DES ENTREPRISES AUTOTASK
  async syncCompaniesFromAutotask() {
    this.logger.log('Début de la synchronisation des entreprises Autotask...');

    try {
      const response = await axios.post(
        `${this.BASE_URL}/Companies/query`,
        {
          filter: [{ op: 'eq', field: 'IsActive', value: true }],
          includeFields: ['id', 'companyName'],
          orderBy: [{ field: 'companyName', direction: 'asc' }],
        },
        { headers: this.headers },
      );

      const companies = response.data.items || [];

      for (const company of companies) {
        const normalized = this.normalizeString(company.companyName);

        await this.prisma.company.upsert({
          where: { autotaskId: company.id },
          update: {
            name: company.companyName,
            nameNormalized: normalized,
          },
          create: {
            autotaskId: company.id,
            name: company.companyName,
            nameNormalized: normalized,
          },
        });
      }

      this.logger.log(`Synchronisation terminée : ${companies.length} entreprises mises à jour`);
    } catch (error) {
      this.logger.error('Erreur lors de la synchro Autotask', error.response?.data || error.message);
    }
  }

    @Cron('0 4 * * *') // ← tous les jours à 4h00
  async syncDaily() {
    this.logger.log('Cron quotidien : synchronisation des entreprises Autotask');
    await this.syncCompaniesFromAutotask();
  }
}