// apps/backend/src/autotask/technicians.service.ts
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma.service';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class TechniciansService {
  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  @Cron('0 3 * * *') // Tous les jours à 3h du matin
  async handleDailySync() {
    console.log('Synchro quotidienne des techniciens lancée à 3h');
    await this.syncTechnicians();
  }

  async syncTechnicians() {
    const integrationCode = this.configService.get<string>('AUTOTASK_API_INTEGRATION_CODE');
    const username = this.configService.get<string>('AUTOTASK_USERNAME');
    const secret = this.configService.get<string>('AUTOTASK_SECRET');

    const url = 'https://webservices16.autotask.net/ATServicesRest/V1.0/Resources/query';

    const body = {
      filter: [
        {
          op: "gt",
          field: "id",
          value: 0,
        },
      ],
      maxRecords: 500,
    };

    const headers = {
      'ApiIntegrationCode': integrationCode,
      'UserName': username,
      'Secret': secret,
      'Content-Type': 'application/json',
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, body, { headers }),
      );

      const resources = response.data.items || [];

      console.log(`Récupéré ${resources.length} techniciens depuis Autotask`);

      for (const resource of resources) {
  if (resource.firstName && resource.lastName) {
    const fullName = `${resource.firstName} ${resource.lastName}`;

    await this.prisma.technician.upsert({
  where: { id: Number(resource.id) }, // Force la conversion en nombre
  update: {
    id: Number(resource.id),
    firstName: String(resource.firstName),
    lastName: String(resource.lastName),
    fullName: `${resource.firstName} ${resource.lastName}`,
    email: resource.emailAddress || null,
    isActive: Boolean(resource.isActive),
  },
  create: {
    id: Number(resource.id),
    firstName: String(resource.firstName),
    lastName: String(resource.lastName),
    fullName: `${resource.firstName} ${resource.lastName}`,
    email: resource.emailAddress || null,
    isActive: Boolean(resource.isActive),
  },
});
  }
}

      console.log("Synchronisation techniciens terminée");
    } catch (error) {
      console.error('Erreur synchro techniciens:', error.message);
      throw error;
    }
  }
}