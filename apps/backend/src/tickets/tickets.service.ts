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

  async createTicketForUser(contactId: number, companyId: number, title: string, description: string) {
    const url = 'https://webservices16.autotask.net/ATServicesRest/V1.0/Tickets';
    const body = { companyID: companyId, contactID: contactId, title, description, queueID: 29682833, status: 1, priority: 3, source: -1, ticketType: 1, billingCodeID: 29682801 };
    const headers = { 
        'ApiIntegrationCode': this.configService.get('AUTOTASK_API_INTEGRATION_CODE'), 
        'UserName': this.configService.get('AUTOTASK_USERNAME'), 
        'Secret': this.configService.get('AUTOTASK_SECRET'), 
        'Content-Type': 'application/json' 
    };

    const response = await firstValueFrom(this.httpService.post(url, body, { headers }));
    this.ticketsCache.delete(`tickets_${contactId}_${companyId}`);
    return response.data;
  }

  private async getAuthorName(resourceId: number | null) {
    if (!resourceId) return "Non assigné";
    const tech = await this.prisma.technician.findUnique({ where: { id: resourceId }, select: { fullName: true } });
    return tech?.fullName || "Inconnu";
  }

  // --- LOGIQUE DE SYNCHRO CORRIGÉE ---
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
      const ticketsUrl = 'https://webservices16.autotask.net/ATServicesRest/V1.0/Tickets/query';
      const ticketsBody = { filter: [{ op: "eq", field: "CompanyID", value: companyId }, { op: "eq", field: "ContactID", value: contactId }] };
      const ticketsResp = await firstValueFrom(this.httpService.post(ticketsUrl, ticketsBody, { headers }));
      const freshTickets = ticketsResp.data.items || [];

      for (const ticket of freshTickets) {
        const techResourceId = this.extractHumanResourceId(ticket);
        const techName = await this.getAuthorName(techResourceId);

        const localTicket = await this.prisma.ticket.upsert({
          where: { autotaskTicketId: ticket.id },
          update: {
            title: ticket.title,
            description: ticket.description,
            status: ticket.status,
            priority: ticket.priority,
            authorName: authorFullName,
            assignedResourceId: techResourceId,
            assignedResourceName: techName,
            lastActivityDate: ticket.lastActivityDate,
            lastSync: new Date(),
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
          },
        });

        // Récupération Notes et TimeEntries
        const notesUrl = `https://webservices16.autotask.net/ATServicesRest/V1.0/Tickets/${ticket.id}/Notes`;
        const timeUrl = 'https://webservices16.autotask.net/ATServicesRest/V1.0/TimeEntries/query';
        
        const [notesResp, timeResp] = await Promise.all([
          firstValueFrom(this.httpService.get(notesUrl, { headers })),
          firstValueFrom(this.httpService.post(timeUrl, { filter: [{ op: "eq", field: "ticketID", value: ticket.id }] }, { headers }))
        ]);

        const notes = notesResp.data.items || [];
        const timeEntries = timeResp.data.items || [];

        // Synchro des Notes (avec récupération des IDs manquants)
        for (const note of notes) {
          if (note.publish === 1 && note.noteType !== 13) {
            const resId = note.creatorResourceID;
            const isUser = (Number(resId) === 29682975 || Number(resId) === Number(user.autotaskContactId));
            
            let finalAuthorName = "Inconnu";
            let localUserId: number | null = null;
let authorAutotaskContactId: number | null = null;

            if (isUser) {
                finalAuthorName = userDisplayLabel;
                localUserId = userId;
                authorAutotaskContactId = user.autotaskContactId;
            } else if (resId) {
                finalAuthorName = await this.getAuthorName(resId);
            }

            await this.prisma.ticketMessage.upsert({
              where: { autotaskMessageId_sourceType: { autotaskMessageId: note.id, sourceType: 'note' } },
              update: {
                content: note.description,
                authorName: finalAuthorName,
                userType: isUser ? 'user' : 'technician',
                apiResourceId: resId || null, // On remet l'ID technicien ici
                authorAutotaskContactId: authorAutotaskContactId,
                localUserId: localUserId,
                syncedAt: new Date(),
              },
              create: {
                ticketId: localTicket.id,
                autotaskTicketId: Number(ticket.id),
                autotaskMessageId: note.id,
                sourceType: 'note',
                userType: isUser ? 'user' : 'technician',
                authorName: finalAuthorName,
                apiResourceId: resId || null, // On remet l'ID technicien ici
                authorAutotaskContactId: authorAutotaskContactId,
                localUserId: localUserId,
                title: note.title,
                content: note.description,
                createdAt: note.createDateTime,
              },
            });
          }
        }

        // Synchro des TimeEntries
        for (const entry of timeEntries) {
          const resId = entry.resourceID;
          const techNameEntry = await this.getAuthorName(resId);
          const duration = entry.hoursWorked ? `[Durée: ${entry.hoursWorked}h] ` : '';
          
          await this.prisma.ticketMessage.upsert({
            where: { autotaskMessageId_sourceType: { autotaskMessageId: entry.id, sourceType: 'time_entry' } },
            update: {
              content: `${duration}${entry.summaryNotes || ''}`,
              authorName: techNameEntry,
              apiResourceId: resId || null, // On remet l'ID technicien ici
              syncedAt: new Date(),
            },
            create: {
              ticketId: localTicket.id,
              autotaskTicketId: Number(ticket.id),
              autotaskMessageId: entry.id,
              sourceType: 'time_entry',
              userType: 'technician',
              authorName: techNameEntry,
              apiResourceId: resId || null, // On remet l'ID technicien ici
              content: `${duration}${entry.summaryNotes || ''}`,
              createdAt: entry.startDateTime,
            },
          });
        }
      }
    } catch (error) {
      console.error(`[SYNC] Erreur:`, error);
    }
  }
}