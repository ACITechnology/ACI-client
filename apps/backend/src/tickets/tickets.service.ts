import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma.service';

@Injectable()
export class TicketsService {
  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    private prisma: PrismaService,
  ) {}

    // Cache des tickets par utilisateur (clé: contactId_companyId)
  private ticketsCache = new Map<string, { data: any[]; timestamp: number }>();

  // Durée du cache en millisecondes (60 minutes = 3600000 ms)
  private CACHE_DURATION = 60 * 60 * 1000; // Change à 30*60*1000 pour 30 min, etc.

  async getTicketsForUser(contactId: number, companyId: number) {
        // Clé unique pour cet utilisateur
    const cacheKey = `tickets_${contactId}_${companyId}`;

    console.log('Récup tickets - cacheKey utilisé :', cacheKey);

    // Vérifie si on a un cache valide
    const cached = this.ticketsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log(`Tickets pour l'utilisateur ${contactId} chargés depuis le cache`);
      return cached.data;
    }
        // Force le refresh si on vient de créer un ticket (timestamp récent)
        console.log(`[CACHE DEBUG] Vérification cache pour ${contactId} – clé: ${cacheKey}`);

        if (cached) {
      const age = Date.now() - cached.timestamp;
      const ageSec = (age / 1000).toFixed(1);
      console.log(`[CACHE DEBUG] Cache trouvé – âge: ${ageSec} secondes`);

      if (age < 30000) { // ← 30 secondes (tu peux tester 60000 = 1 min)
        console.log(`[CACHE DEBUG] Cache récent (<30s) → SUPPRESSION FORCÉE`);
        this.ticketsCache.delete(cacheKey);
      } else {
        console.log(`[CACHE DEBUG] Cache trop vieux → retour direct`);
        return cached.data;
      }
    } else {
      console.log(`[CACHE DEBUG] Pas de cache → appel Autotask`);
    }

    const integrationCode = this.configService.get<string>('AUTOTASK_API_INTEGRATION_CODE');
    const username = this.configService.get<string>('AUTOTASK_USERNAME');
    const secret = this.configService.get<string>('AUTOTASK_SECRET');

    const url = 'https://webservices16.autotask.net/ATServicesRest/V1.0/Tickets/query';

    const body = {
      filter: [
        { op: "eq", field: "CompanyID", value: companyId },
        { op: "eq", field: "ContactID", value: contactId },
      ],
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

  const tickets = response.data.items || [];

  // Ajout du nom du technicien pour chaque ticket
   // Ajout du nom du technicien depuis la base de données
      const ticketsWithNames = await Promise.all(
    tickets.map(async (ticket: any) => {
      let assignedResourceName = "Non assigné";

      // Liste étendue des ID système (comptes API, monitoring, autotask, etc.)
      const systemIds = [
        4, // Autotask Administrator
        29682909, // API Automaker
        29682914, // datto rmm
        29682921, // Backup Radar
        29682931, // LASTPASS API
        29682932, // Pax8 API
        29682936, // DarkWeb ID API
        29682946, // STREAMONE API
        29682961, // ZOMMENTUM API
        29682962, // 3CX API
        // Ajoute d'autres si tu en vois dans les logs
      ];

      let resourceId = null;

      // Log pour déboguer chaque ticket
     // console.log(`Ticket ${ticket.ticketNumber}:`);
      //console.log(`  assignedResourceID: ${ticket.assignedResourceID}`);
      //console.log(`  completedByResourceID: ${ticket.completedByResourceID}`);
      //console.log(`  firstResponseInitiatingResourceID: ${ticket.firstResponseInitiatingResourceID}`);
      //console.log(`  lastActivityResourceID: ${ticket.lastActivityResourceID}`);

      // 1. Technicien assigné
      if (ticket.assignedResourceID && !systemIds.includes(ticket.assignedResourceID)) {
        resourceId = ticket.assignedResourceID;
      }

      // 2. Celui qui a résolu le ticket
      if (!resourceId && ticket.completedByResourceID && !systemIds.includes(ticket.completedByResourceID)) {
        resourceId = ticket.completedByResourceID;
      }

      // 3. Première réponse
      if (!resourceId && ticket.firstResponseInitiatingResourceID && !systemIds.includes(ticket.firstResponseInitiatingResourceID)) {
        resourceId = ticket.firstResponseInitiatingResourceID;
      }

      // 4. Dernière activité
      if (!resourceId && ticket.lastActivityResourceID && !systemIds.includes(ticket.lastActivityResourceID)) {
        resourceId = ticket.lastActivityResourceID;
      }

      if (resourceId) {
        const technician = await this.prisma.technician.findUnique({
          where: { id: resourceId },
        });
        if (technician) {
          assignedResourceName = technician.fullName;
          //console.log(`  → Technicien trouvé : ${assignedResourceName} (ID: ${resourceId})`);
        } else {
          //console.log(`  → Technicien ID ${resourceId} pas dans la base`);
        }
      } else {
       // console.log(`  → Aucun technicien humain trouvé`);
      }

      return {
        ...ticket,
        assignedResourceName,
      };
    }),
  );

      // Stocke les tickets en cache pour 60 minutes
      this.ticketsCache.set(cacheKey, {
        data: ticketsWithNames,
        timestamp: Date.now(),
      });

      console.log(`Tickets pour l'utilisateur ${contactId} mis en cache pour 60 minutes`);
  } catch (error) {
    console.error('Erreur Autotask:', error.response?.data || error.message);
    throw new Error('Impossible de récupérer les tickets Autotask');
  }
} 

  async createTicketForUser(contactId: number, companyId: number, title: string, description: string) {
    const integrationCode = this.configService.get<string>('AUTOTASK_API_INTEGRATION_CODE');
    const username = this.configService.get<string>('AUTOTASK_USERNAME');
    const secret = this.configService.get<string>('AUTOTASK_SECRET');

    const url = 'https://webservices16.autotask.net/ATServicesRest/V1.0/Tickets';

    const body = {
      companyID: companyId,
      contactID: contactId,
      title: title,
      description: description,
      queueID: 29682833,
      status: 1,
      priority: 3,
      source: -1,
      ticketType: 1,
      billingCodeID: 29682801,
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
       // Invalide directement le cache de cet utilisateur après création
    const cacheKey = `tickets_${contactId}_${companyId}`;
    console.log('Création ticket - cacheKey invalidé :', cacheKey);
    this.ticketsCache.delete(cacheKey);
    
      return response.data; // Renvoie le ticket créé par Autotask
         
    } catch (error) {
      console.error('Erreur création Autotask:', error.response?.data || error.message);
      throw new Error('Impossible de créer le ticket Autotask');
    }
  }

} 