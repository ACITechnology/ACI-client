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

  private ticketsCache = new Map<string, { data: any[]; timestamp: number }>();
  private CACHE_DURATION = 60 * 60 * 1000;

  async getTicketsForUser(contactId: number, companyId: number, forceFresh = false) {
    const cacheKey = `tickets_${contactId}_${companyId}`;
    let cached: { data: any[]; timestamp: number } | null = null; 

    if (!forceFresh) {
      const entry = this.ticketsCache.get(cacheKey);
      if (entry) {
        cached = entry;
        if (Date.now() - cached.timestamp < this.CACHE_DURATION) return cached.data;
      }
    }

    if (cached && (Date.now() - cached.timestamp < 30000)) {
        this.ticketsCache.delete(cacheKey);
    }

    const headers = { 
        'ApiIntegrationCode': this.configService.get('AUTOTASK_API_INTEGRATION_CODE'), 
        'UserName': this.configService.get('AUTOTASK_USERNAME'), 
        'Secret': this.configService.get('AUTOTASK_SECRET'), 
        'Content-Type': 'application/json' 
    };
    const url = 'https://webservices16.autotask.net/ATServicesRest/V1.0/Tickets/query';
    const body = { filter: [{ op: "eq", field: "CompanyID", value: companyId }, { op: "eq", field: "ContactID", value: contactId }] };

    try {
      const response = await firstValueFrom(this.httpService.post(url, body, { headers }));
      const tickets = response.data.items || [];

      const ticketsWithNames = await Promise.all(
        tickets.map(async (ticket: any) => {
          const techResourceId = this.extractHumanResourceId(ticket);
          const assignedResourceName = await this.getAuthorName(techResourceId);
          return { ...ticket, assignedResourceName };
        }),
      );

      this.ticketsCache.set(cacheKey, { data: ticketsWithNames, timestamp: Date.now() });
      return ticketsWithNames;
    } catch (error) {
      throw new Error('Impossible de récupérer les tickets Autotask');
    }
  }

  private extractHumanResourceId(ticket: any): number | null {
    const systemIds = [4, 29682909, 29682914, 29682921, 29682931, 29682932, 29682936, 29682946, 29682961, 29682962];
    const candidates = [
      ticket.assignedResourceID,
      ticket.completedByResourceID,
      ticket.firstResponseInitiatingResourceID,
      ticket.lastActivityResourceID
    ];
    return candidates.find(id => id && !systemIds.includes(id)) || null;
  }

  // apps/backend/src/tickets/tickets.service.ts

async createTicketForUser(contactId: number, companyId: number, title: string, description: string, userId: number) {
  // 1. On crée d'abord une entrée "fantôme" ou locale dans notre DB
  // Cela permet d'avoir un ID local tout de suite.
  const temporaryTicket = await this.prisma.ticket.create({
    data: {
      title,
      description, // assure-toi d'avoir ce champ dans ton schéma
      status: 1, // "Nouveau"
      createDate: new Date(),
      userId: userId,
      ticketNumber: '...', // Temporaire
    }
  });

  try {
    // 2. Appel à l'API Autotask (la partie lente)
    const autotaskTicket = await this.createInAutotask(contactId, companyId, title, description);

    // 3. On met à jour notre ticket local avec les vraies infos d'Autotask
    const updatedTicket = await this.prisma.ticket.update({
      where: { id: temporaryTicket.id },
      data: {
        autotaskId: Number(autotaskTicket.id),
        ticketNumber: autotaskTicket.ticketNumber,
      }
    });

    return updatedTicket;
  } catch (error) {
    // Optionnel : supprimer ou marquer le ticket en "Erreur" si Autotask échoue
    await this.prisma.ticket.update({
      where: { id: temporaryTicket.id },
      data: { title: `[ÉCHEC SYNC] ${title}` }
    });
    throw error;
  }
}


  // --- LOGIQUE DE SYNCHRO OPTIMISÉE (DELTA SYNC) ---
  // --- LOGIQUE DE SYNCHRO ULTRA-RAPIDE (BASÉE SUR LASTSYNC) ---
  async syncTicketsAndMessagesForUser(userId: number, contactId: number, companyId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { autotaskContactId: true, firstName: true, lastName: true },
    });
    if (!user) throw new Error('User not found for sync');

    const authorFullName = `${user.firstName} ${user.lastName}`;
    const userDisplayLabel = `[user]: ${authorFullName}`;
    const headers = { 
        'ApiIntegrationCode': this.configService.get('AUTOTASK_API_INTEGRATION_CODE'), 
        'UserName': this.configService.get('AUTOTASK_USERNAME'), 
        'Secret': this.configService.get('AUTOTASK_SECRET'),
        'Content-Type': 'application/json'
    };

    try {
      // 1. [MODIF] RÉCUPÉRATION DE LA DATE DE DERNIÈRE SYNCHRO GLOBALE
      // On regarde quand on a synchronisé pour la dernière fois (lastSync)
      const lastGlobalSync = await this.prisma.ticket.findFirst({
        where: { userId: userId },
        orderBy: { lastSync: 'desc' },
        select: { lastSync: true }
      });

      // Si c'est la première fois, on remonte loin dans le temps
      const referenceDate = lastGlobalSync?.lastSync ? lastGlobalSync.lastSync.toISOString() : '2000-01-01T00:00:00Z';
      
      console.log(`[SYNC] Check nouveautés depuis la dernière synchro : ${referenceDate}`);

      const ticketsUrl = 'https://webservices16.autotask.net/ATServicesRest/V1.0/Tickets/query';
      const ticketsBody = { 
        filter: [
          { op: "eq", field: "CompanyID", value: companyId }, 
          { op: "eq", field: "ContactID", value: contactId },
          { op: "gt", field: "lastActivityDate", value: referenceDate } // Seule l'activité plus récente nous intéresse
        ] 
      };

      const ticketsResp = await firstValueFrom(this.httpService.post(ticketsUrl, ticketsBody, { headers }));
      const freshTickets = ticketsResp.data.items || [];

      if (freshTickets.length === 0) {
        console.log("[SYNC] Aucun mouvement sur les tickets. Terminé.");
        return; 
      }

      for (const ticket of freshTickets) {
        // [AJOUT] On compare la date d'activité d'Autotask avec notre lastSync
        // Si le ticket n'a pas bougé depuis notre dernière synchro, on passe au suivant
        const ticketActivity = new Date(ticket.lastActivityDate);
        const lastSyncDate = lastGlobalSync?.lastSync || new Date(0);

        const techResourceId = this.extractHumanResourceId(ticket);
        const techName = await this.getAuthorName(techResourceId);

        // Mise à jour du ticket (seulement si nécessaire)
        const localTicket = await this.prisma.ticket.upsert({
          where: { autotaskTicketId: ticket.id },
          update: {
            title: ticket.title,
            status: ticket.status,
            priority: ticket.priority,
            lastActivityDate: ticket.lastActivityDate,
            lastSync: new Date(), // On marque le moment de la synchro
          },
          create: {
            userId,
            autotaskTicketId: ticket.id,
            ticketNumber: ticket.ticketNumber,
            title: ticket.title,
            description: ticket.description,
            createDate: ticket.createDate,
            status: ticket.status,
            priority: ticket.priority,
            companyAutotaskId: companyId,
            contactAutotaskId: contactId,
            authorName: authorFullName,
            assignedResourceId: techResourceId,
            assignedResourceName: techName,
            lastActivityDate: ticket.lastActivityDate,
            lastSync: new Date(),
          },
        });

        // --- SYNCHRO DES MESSAGES (NOTES & TEMPS) ---
        const notesUrl = `https://webservices16.autotask.net/ATServicesRest/V1.0/Tickets/${ticket.id}/Notes`;
        const timeUrl = 'https://webservices16.autotask.net/ATServicesRest/V1.0/TimeEntries/query';
        
        const [notesResp, timeResp] = await Promise.all([
          firstValueFrom(this.httpService.get(notesUrl, { headers })),
          firstValueFrom(this.httpService.post(timeUrl, { filter: [{ op: "eq", field: "ticketID", value: ticket.id }] }, { headers }))
        ]);

        const notes = notesResp.data.items || [];
        const timeEntries = timeResp.data.items || [];

        // 2. [MODIF] FILTRE DES NOTES PAR DATE DE CRÉATION
        // On ne traite que les notes créées APRÈS notre dernière date de synchro (lastSyncDate)
        for (const note of notes) {
          const noteDate = new Date(note.createDateTime);
          if (note.publish === 1 && note.noteType !== 13 && noteDate > lastSyncDate) {
            
            console.log(`[SYNC] Nouveau message détecté (Note ID: ${note.id})`);

            const resId = note.creatorResourceID;
            const isUser = (Number(resId) === 29682975 || Number(resId) === Number(user.autotaskContactId));
            let finalAuthorName = isUser ? userDisplayLabel : await this.getAuthorName(resId);

            await this.prisma.ticketMessage.upsert({
              where: { autotaskMessageId_sourceType: { autotaskMessageId: note.id, sourceType: 'note' } },
              update: { syncedAt: new Date() }, // Si elle existe déjà, on met juste à jour la date de synchro
              create: {
                ticketId: localTicket.id,
                autotaskTicketId: Number(ticket.id),
                autotaskMessageId: note.id,
                sourceType: 'note',
                userType: isUser ? 'user' : 'technician',
                authorName: finalAuthorName,
                apiResourceId: resId || null,
                content: note.description,
                createdAt: note.createDateTime,
                syncedAt: new Date(),
              },
            });
          }
        }

        // 3. [MODIF] FILTRE DES TEMPS PASSÉS
        for (const entry of timeEntries) {
          const entryDate = new Date(entry.startDateTime);
          if (entryDate > lastSyncDate) {
            
            console.log(`[SYNC] Nouveau message détecté (TimeEntry ID: ${entry.id})`);

            const techNameEntry = await this.getAuthorName(entry.resourceID);
            const duration = entry.hoursWorked ? `[Durée: ${entry.hoursWorked}h] ` : '';
            
            await this.prisma.ticketMessage.upsert({
              where: { autotaskMessageId_sourceType: { autotaskMessageId: entry.id, sourceType: 'time_entry' } },
              update: { syncedAt: new Date() },
              create: {
                ticketId: localTicket.id,
                autotaskTicketId: Number(ticket.id),
                autotaskMessageId: entry.id,
                sourceType: 'time_entry',
                userType: 'technician',
                authorName: techNameEntry,
                apiResourceId: entry.resourceID || null,
                content: `${duration}${entry.summaryNotes || ''}`,
                createdAt: entry.startDateTime,
                syncedAt: new Date(),
              },
            });
          }
        }
      }
    } catch (error) {
      console.error(`[SYNC] Erreur:`, error);
    }
  }

    // Nouvelle méthode pour récupérer les tickets depuis la DB locale (pour le frontend)
 // ... (méthodes existantes)

  async getUserTicketsFromDb(userId: number) {
    //console.log("[SERVICE] Exécution de la requête Prisma pour userId :", userId);
    try {
      const tickets = await this.prisma.ticket.findMany({
        where: { userId: Number(userId) }, // Force conversion en nombre au cas où
        orderBy: { createDate: 'desc' },
      });
      
      //console.log(`[SERVICE] Prisma a retourné ${tickets.length} tickets`);
      return tickets;
    } catch (error) {
      //console.error("[SERVICE] Erreur Prisma lors de la lecture des tickets :", error);
      throw error;
    }
  }


}