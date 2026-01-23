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
  // 1. Récupérer les infos de l'utilisateur pour le authorName
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true }
  });
  const authorFullName = user ? `${user.firstName} ${user.lastName}` : 'Utilisateur Portail';

  const tempUniqueId = BigInt(-Date.now());

  // 2. Création initiale avec les infos que l'on possède déjà
  const localTicket = await this.prisma.ticket.create({
    data: {
      userId: userId,
      title: title,
      description: description,
      status: 1,
      priority: 3, // Priorité par défaut
      createDate: new Date(),
      lastSync: new Date(),
      autotaskTicketId: tempUniqueId,
      ticketNumber: `TEMP-${Date.now()}`,
      authorName: authorFullName,
      companyAutotaskId: BigInt(companyId),
      contactAutotaskId: BigInt(contactId),
    },
  });

  try {
    const headers = {
      'ApiIntegrationCode': this.configService.get('AUTOTASK_API_INTEGRATION_CODE'),
      'UserName': this.configService.get('AUTOTASK_USERNAME'),
      'Secret': this.configService.get('AUTOTASK_SECRET'),
      'Content-Type': 'application/json',
    };

    const payload = {
      companyID: Number(companyId),
      contactID: Number(contactId),
      title: title,
      description: description,
      queueID: 29682833,
      status: 1,
      priority: 3,
      source: -1,
      ticketType: 1,
      billingCodeID: 29682801
    };

    // Création dans Autotask
    const response = await firstValueFrom(
      this.httpService.post(
        'https://webservices16.autotask.net/ATServicesRest/V1.0/Tickets',
        payload,
        { headers }
      )
    );

    const autotaskId = response.data.itemId;

    // 3. RÉCUPÉRATION DU TICKET COMPLET (pour avoir le vrai ticketNumber)
    // L'API POST ne renvoie que l'ID, on fait un GET pour avoir le reste (T2026...)
    const getTicketUrl = `https://webservices16.autotask.net/ATServicesRest/V1.0/Tickets/${autotaskId}`;
    const fullTicketResp = await firstValueFrom(
      this.httpService.get(getTicketUrl, { headers })
    );
    const fullTicket = fullTicketResp.data.item;

    // 4. Mise à jour finale de la DB locale avec toutes les infos
    return await this.prisma.ticket.update({
      where: { id: localTicket.id },
      data: {
        autotaskTicketId: BigInt(autotaskId),
        ticketNumber: fullTicket.ticketNumber, // Exemple: T20260121.0024
        priority: fullTicket.priority,
        lastActivityDate: fullTicket.lastActivityDate,
        lastSync: new Date(),
      },
    });

  } catch (error) {
    console.error("ERREUR AUTOTASK API:", error.response?.data?.errors || error.message);
    
    await this.prisma.ticket.delete({
      where: { id: localTicket.id }
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
        // --- Dans syncTicketsAndMessagesForUser, section NOTES ---
for (const note of notes) {
  const noteDate = new Date(note.createDateTime);
  if (note.publish === 1 && note.noteType !== 13 && noteDate > lastSyncDate) {
    
    const resId = note.creatorResourceID ? Number(note.creatorResourceID) : null;
    
    // Cas 1 : Message de l'utilisateur via l'app (ID fixe 29682975)
    const isAppUser = (resId === 29682975);
    // Cas 2 : Message du contact direct (via email/portail Autotask)
    const isDirectContact = (resId === Number(user.autotaskContactId));

    let finalAuthorName: string;
    let localUserIdToStore: number | null = null;
    let contactIdToStore: number | null = null;

    if (isAppUser || isDirectContact) {
      // C'est l'utilisateur
      finalAuthorName = `[user]: ${user.firstName} ${user.lastName}`;
      localUserIdToStore = userId; // ID local de l'user connecté
      contactIdToStore = Number(user.autotaskContactId); // ID Autotask du contact
    } else {
      // C'est un technicien ou autre
      finalAuthorName = await this.getAuthorName(resId);
    }

    await this.prisma.ticketMessage.upsert({
      where: { autotaskMessageId_sourceType: { autotaskMessageId: note.id, sourceType: 'note' } },
      update: { syncedAt: new Date() },
      create: {
        ticketId: localTicket.id,
        autotaskTicketId: Number(ticket.id),
        autotaskMessageId: note.id,
        sourceType: 'note',
        userType: (isAppUser || isDirectContact) ? 'user' : 'technician',
        authorName: finalAuthorName,
        apiResourceId: resId, // On stocke le resourceId original
        authorAutotaskContactId: contactIdToStore, // Stocké seulement si c'est l'utilisateur
        localUserId: localUserIdToStore,           // Stocké seulement si c'est l'utilisateur
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
  try {
    const tickets = await this.prisma.ticket.findMany({
      where: { userId: Number(userId) },
      orderBy: { createDate: 'desc' },
    });
    
    // MODIF ICI : Convertir les BigInt pour éviter l'erreur de sérialisation JSON
    return tickets.map(ticket => ({
      ...ticket,
      autotaskTicketId: ticket.autotaskTicketId.toString(),
      companyAutotaskId: ticket.companyAutotaskId?.toString(),
      contactAutotaskId: ticket.contactAutotaskId?.toString(),
    }));
  } catch (error) {
    throw error;
  }
}

// À ajouter à la fin de la classe TicketsService
private async getAuthorName(resourceId: number | null): Promise<string> {
  // Si l'id est null, on retourne "Inconnu" comme demandé
  if (!resourceId) return 'Inconnu';

  try {
    const tech = await this.prisma.technician.findUnique({
      where: { id: Number(resourceId) },
      select: { fullName: true }
    });

    // Si on trouve le tech dans la DB, on rend son nom, sinon "Inconnu"
    return tech ? tech.fullName : 'Inconnu';
  } catch (error) {
    return 'Inconnu';
  }
}
private async createInAutotask(contactId: number, companyId: number, title: string, description: string) {
  const headers = { 
    'ApiIntegrationCode': this.configService.get('AUTOTASK_API_INTEGRATION_CODE'), 
    'UserName': this.configService.get('AUTOTASK_USERNAME'), 
    'Secret': this.configService.get('AUTOTASK_SECRET'),
    'Content-Type': 'application/json'
  };
  const url = 'https://webservices16.autotask.net/ATServicesRest/V1.0/Tickets';
  const body = {
    title,
    description,
    companyID: companyId,
    contactID: contactId,
    status: 1, // Nouveau
    priority: 1, // Normale
  };
  
  const response = await firstValueFrom(this.httpService.post(url, body, { headers }));
  return response.data; // Contient l'ID et le ticketNumber
}


async getTicketByAutotaskId(autotaskTicketId: number, userId: number) {
  return this.prisma.ticket.findFirst({
    where: {
      autotaskTicketId,
      userId,  // ← sécurité : on vérifie que c'est bien le ticket de cet utilisateur
    },
    select: {
      id: true,
      autotaskTicketId: true,
      ticketNumber: true,
      title: true,
      description: true,
      createDate: true,
      lastActivityDate: true,
      status: true,
      priority: true,
      assignedResourceName: true,
      assignedResourceId: true,
    },
  });
}

async getTicketMessages(autotaskTicketId: number) {
  return this.prisma.ticketMessage.findMany({
    where: { autotaskTicketId },
    orderBy: { createdAt: 'asc' }, // Chronologique
    select: {
      id: true,
      userType: true,
      authorName: true,
      content: true,
      createdAt: true,
      sourceType: true, // 'note' ou 'time_entry'
      apiResourceId: true,
      localUserId: true,
    },
  });
}

async createNoteForTicket(
  autotaskTicketId: number,
  createdByContactID: number, // autotaskContactId (Int dans votre schéma User)
  userId: number,             // id local de l'utilisateur (Int)
  content: string,
) {
  try {
    // 1. Récupérer les infos de l'utilisateur pour le nom complet
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true }
    });

    // Formatage du nom de l'auteur tel que demandé
    const authorFullName = user 
      ? `[user]: ${user.firstName} ${user.lastName}` 
      : `[user]: Client Portail`;

    const headers = {
      'ApiIntegrationCode': this.configService.get('AUTOTASK_API_INTEGRATION_CODE'),
      'UserName': this.configService.get('AUTOTASK_USERNAME'),
      'Secret': this.configService.get('AUTOTASK_SECRET'),
      'Content-Type': 'application/json',
    };

    const payload = {
      createdByContactID: Number(createdByContactID),
      title: "Note client via portail",
      description: content,
      noteType: 1,
      publish: 1,
    };

    // 2. Création dans Autotask
    const response = await firstValueFrom(
      this.httpService.post(
        `https://webservices16.autotask.net/ATServicesRest/V1.0/Tickets/${autotaskTicketId}/Notes`,
        payload,
        { headers }
      )
    );

    // L'ID de la note renvoyé par Autotask
    const autotaskNoteId = response.data.itemId;

    // 3. Récupère le ticket local (Ici on utilise BigInt car votre schéma Ticket le demande)
    const localTicket = await this.prisma.ticket.findFirst({
      where: { autotaskTicketId: BigInt(autotaskTicketId) },
      select: { id: true },
    });

    if (!localTicket) throw new Error('Ticket local non trouvé');

    // 4. Création dans ticket_messages
    // ATTENTION : On convertit tout en Number() pour correspondre à votre schema.prisma actuel
    return await this.prisma.ticketMessage.create({
      data: {
        autotaskMessageId: Number(autotaskNoteId), 
        ticketId: localTicket.id,
        autotaskTicketId: Number(autotaskTicketId), 
        userType: 'user',
        authorName: authorFullName, 
        authorAutotaskContactId: Number(createdByContactID), 
        localUserId: userId,
        content: content,
        createdAt: new Date(),
        syncedAt: new Date(),
        sourceType: 'note',
      },
    });
  } catch (error) {
    console.error('[CREATE NOTE] Erreur :', error.response?.data || error.message);
    throw error;
  }
}

}