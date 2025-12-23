// src/autotask/autotask.service.ts
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class AutotaskService {
  private readonly logger = new Logger(AutotaskService.name);
  private readonly BASE_URL = 'https://webservices16.autotask.net/ATServicesRest/V1.0';

  // TES VRAIES CLÉS (on les mettra dans .env plus tard)
  private readonly headers = {
    ApiIntegrationCode: 'D66IA7GZJ77T3UAJOVHCVT7KKXT',
    UserName: 'e2bofpdnmykvqf6@ACITECHNOLOGY.FR',
    Secret: 'Seb12345!',
    'Content-Type': 'application/json',
  };

  // 1. Chercher un contact par email ET dans une entreprise précise
  async findContactByEmailAndCompany(email: string, companyId: number): Promise<any> {
    try {
      const response = await axios.post(
        `${this.BASE_URL}/Contacts/query`,
        {
          filter: [
            { op: 'eq', field: 'EmailAddress', value: email },
            { op: 'eq', field: 'CompanyID', value: companyId },
          ],
        },
        { headers: this.headers },
      );
      return response.data.items[0] || null;
    } catch (error) {
      this.logger.error('Erreur recherche contact par entreprise', error.response?.data);
      return null;
    }
  }

  // 2. Créer un contact dans une entreprise
  async createContact(data: { email: string; firstName: string; lastName: string; companyId: number }) {
    try {
      const payload = {
        FirstName: data.firstName,
        LastName: data.lastName,
        EmailAddress: data.email,
        CompanyID: data.companyId,
        isActive: 1,
      };

      const response = await axios.post(
        `${this.BASE_URL}/Companies/${data.companyId}/Contacts`,
        payload,
        { headers: this.headers },
      );

      this.logger.log(`Contact créé avec ID: ${response.data.itemId}`);
      return response.data.itemId;
    } catch (error) {
      this.logger.error('Erreur création contact', error.response?.data);
      throw new Error('Impossible de créer le contact dans Autotask');
    }
  }
}