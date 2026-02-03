import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma.service';
import { InjectQueue } from '@nestjs/bullmq'; // AJOUT
import { Queue } from 'bullmq'; // AJOUT

@Injectable()
export class TicketsService {
  constructor(
    @InjectQueue('autotask-queue') private autotaskQueue: Queue,
    private configService: ConfigService,
    private httpService: HttpService,
    private prisma: PrismaService,
  ) {}

  // On crée une petite méthode de test pour vérifier que la file reçoit bien l'info
  async testQueue() {
    await this.autotaskQueue.add('test-job', { message: 'Hello Autotask' });
    return { status: 'Job ajouté à la file !' };
  }

  private ticketsCache = new Map<string, { data: any[]; timestamp: number }>();
  private CACHE_DURATION = 60 * 60 * 1000;

  async getTicketsForUser(
    contactId: number,
    companyId: number,
    forceFresh = false,
  ) {
    const cacheKey = `tickets_${contactId}_${companyId}`;
    let cached: { data: any[]; timestamp: number } | null = null;

    if (!forceFresh) {
      const entry = this.ticketsCache.get(cacheKey);
      if (entry) {
        cached = entry;
        if (Date.now() - cached.timestamp < this.CACHE_DURATION)
          return cached.data;
      }
    }

    if (cached && Date.now() - cached.timestamp < 30000) {
      this.ticketsCache.delete(cacheKey);
    }

    const headers = {
      ApiIntegrationCode: this.configService.get(
        'AUTOTASK_API_INTEGRATION_CODE',
      ),
      UserName: this.configService.get('AUTOTASK_USERNAME'),
      Secret: this.configService.get('AUTOTASK_SECRET'),
      'Content-Type': 'application/json',
    };
    const url =
      'https://webservices16.autotask.net/ATServicesRest/V1.0/Tickets/query';
    const body = {
      filter: [
        { op: 'eq', field: 'CompanyID', value: companyId },
        { op: 'eq', field: 'ContactID', value: contactId },
      ],
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, body, { headers }),
      );
      const tickets = response.data.items || [];

      // 1. On charge tous les techniciens une seule fois
      const techs = await this.prisma.technician.findMany();
      const techMap = new Map(techs.map((t) => [t.id, t.fullName]));

      // 2. On map les noms sans aucun appel SQL supplémentaire
      const ticketsWithNames = tickets.map((ticket: any) => {
        const techResourceId = this.extractHumanResourceId(ticket);

        const assignedResourceName = techResourceId
          ? techMap.get(techResourceId) || 'Inconnu'
          : 'Inconnu';

        // On retourne l'objet fusionné, sinon ticketsWithNames sera un tableau de 'undefined'
        return { ...ticket, assignedResourceName };
      });
      // 3. On met en cache le résultat

      this.ticketsCache.set(cacheKey, {
        data: ticketsWithNames,
        timestamp: Date.now(),
      });
      return ticketsWithNames;
    } catch (error) {
      throw new Error('Impossible de récupérer les tickets Autotask');
    }
  }

  private extractHumanResourceId(ticket: any): number | null {
    const systemIds = [
      4, 29682909, 29682914, 29682921, 29682931, 29682932, 29682936, 29682946,
      29682961, 29682962,
    ];
    const candidates = [
      ticket.assignedResourceID,
      ticket.completedByResourceID,
      ticket.firstResponseInitiatingResourceID,
      ticket.lastActivityResourceID,
    ];
    return candidates.find((id) => id && !systemIds.includes(id)) || null;
  }

  // apps/backend/src/tickets/tickets.service.ts

  async createTicketForUser(
    contactId: number,
    companyId: number,
    title: string,
    description: string,
    userId: number,
  ) {
    // 1. Récupérer les infos de l'utilisateur pour le authorName
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });
    const authorFullName = user
      ? `${user.firstName} ${user.lastName}`
      : 'Utilisateur Portail';

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

    console.log(
      `[QUEUE] Envoi du ticket local #${localTicket.id} vers la file d'attente...`,
    );

    // 2. AU LIEU de faire le try/catch avec l'API ici, on ajoute un JOB dans la file
    await this.autotaskQueue.add(
      'create-ticket',
      {
        localTicketId: localTicket.id, // On envoie l'ID local pour que le worker puisse le mettre à jour
        contactId,
        companyId,
        title,
        description,
        userId,
      },
      {
        attempts: 3, // Si Autotask bug, on réessaie 3 fois
        backoff: { type: 'exponential', delay: 2000 }, // Attend 2s, 4s, 8s...
      },
    );

    // On renvoie le ticket local immédiatement au controller
    console.log(`[QUEUE] Job 'create-ticket' ajouté avec succès !`);
    return localTicket;
  }

  // src/tickets/tickets.service.ts

  async finalizeTicketCreation(localTicketId: number, autotaskId: number) {
    // 1. On récupère le ticket complet depuis Autotask pour avoir le vrai TicketNumber
    const headers = {
      ApiIntegrationCode: this.configService.get(
        'AUTOTASK_API_INTEGRATION_CODE',
      ),
      UserName: this.configService.get('AUTOTASK_USERNAME'),
      Secret: this.configService.get('AUTOTASK_SECRET'),
      'Content-Type': 'application/json',
    };

    const response = await firstValueFrom(
      this.httpService.get(
        `https://webservices16.autotask.net/ATServicesRest/V1.0/Tickets/${autotaskId}`,
        { headers },
      ),
    );
    const fullTicket = response.data.item;

    // 2. On met à jour notre base de données locale
    const updated = await this.prisma.ticket.update({
      where: { id: localTicketId },
      data: {
        autotaskTicketId: BigInt(autotaskId),
        ticketNumber: fullTicket.ticketNumber,
        priority: fullTicket.priority,
        lastActivityDate: fullTicket.lastActivityDate,
        lastSync: new Date(),
      },
    });

    // 3. CRITIQUE : Conversion des BigInt en String pour le WebSocket
    // Si on renvoie l'objet 'updated' brut, le Gateway plantera à la sérialisation JSON
    return {
      ...updated,
      autotaskTicketId: updated.autotaskTicketId.toString(),
      companyAutotaskId: updated.companyAutotaskId?.toString(),
      contactAutotaskId: updated.contactAutotaskId?.toString(),
    };
  }

  // --- LOGIQUE DE SYNCHRO ULTRA-RAPIDE (BASÉE SUR LASTSYNC) ---
  async syncTicketsAndMessagesForUser(
    userId: number,
    contactId: number,
    companyId: number,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { autotaskContactId: true, firstName: true, lastName: true },
    });
    if (!user) throw new Error('User not found for sync');

    console.time(`[SYNC-TOTAL] user:${userId}`);

    try {
      const techs = await this.prisma.technician.findMany();
      const techMap = new Map(techs.map((t) => [t.id, t.fullName]));

      // 1. Déterminer la date de dernière synchronisation réussie
      const lastGlobalSync = await this.prisma.ticket.findFirst({
        where: { userId: userId },
        orderBy: { lastSync: 'desc' },
        select: { lastSync: true },
      });
      
      // Si aucune sync, on prend l'an 2000 pour tout récupérer
      const referenceDate = lastGlobalSync?.lastSync 
        ? lastGlobalSync.lastSync 
        : new Date('2000-01-01T00:00:00Z');

      const headers = {
        ApiIntegrationCode: this.configService.get('AUTOTASK_API_INTEGRATION_CODE'),
        UserName: this.configService.get('AUTOTASK_USERNAME'),
        Secret: this.configService.get('AUTOTASK_SECRET'),
        'Content-Type': 'application/json',
      };

      // 2. RÉCUPÉRATION DE TOUS LES TICKETS DU CONTACT (Sans filtre de date initial)
      // On récupère la liste complète pour voir si un vieux ticket a été modifié
      const allTicketsResp = await firstValueFrom(
        this.httpService.post(
          'https://webservices16.autotask.net/ATServicesRest/V1.0/Tickets/query',
          {
            filter: [
              { op: 'eq', field: 'CompanyID', value: companyId },
              { op: 'eq', field: 'ContactID', value: contactId },
            ],
          },
          { headers },
        ),
      );

      const allTickets = allTicketsResp.data.items || [];
      if (allTickets.length === 0) {
        console.timeEnd(`[SYNC-TOTAL] user:${userId}`);
        return;
      }

      // 3. FILTRAGE : On ne traite que les tickets modifiés depuis la dernière synchro
      const ticketsToSync = allTickets.filter((t: any) => {
        const lastActivity = new Date(t.lastActivityDate);
        return lastActivity > referenceDate;
      });

      console.log(`[SYNC] ${ticketsToSync.length} tickets à mettre à jour pour l'utilisateur ${userId}`);

      if (ticketsToSync.length === 0) {
        console.timeEnd(`[SYNC-TOTAL] user:${userId}`);
        return;
      }

      // 4. DÉCOUPAGE EN PAQUETS (CHUNKS) DE 20
      // Autotask n'aime pas les filtres "IN" avec trop d'IDs
      const chunkArray = (arr: any[], size: number) =>
        Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
          arr.slice(i * size, i * size + size),
        );

      const ticketChunks = chunkArray(ticketsToSync, 20);

      for (const chunk of ticketChunks) {
        const chunkIds = chunk.map((t) => t.id);

        // Récupération massive des notes et temps pour ce paquet de tickets
        const [notesResp, timeResp] = await Promise.all([
          firstValueFrom(
            this.httpService.post(
              'https://webservices16.autotask.net/ATServicesRest/V1.0/TicketNotes/query',
              { filter: [{ op: 'in', field: 'ticketID', value: chunkIds }] },
              { headers },
            ),
          ),
          firstValueFrom(
            this.httpService.post(
              'https://webservices16.autotask.net/ATServicesRest/V1.0/TimeEntries/query',
              { filter: [{ op: 'in', field: 'ticketID', value: chunkIds }] },
              { headers },
            ),
          ),
        ]);

        const allNotes = notesResp.data.items || [];
        const allTimeEntries = timeResp.data.items || [];

        // 5. TRAITEMENT DU PAQUET (UPSERT)
        await Promise.all(
          chunk.map(async (ticket: any) => {
            const techId = this.extractHumanResourceId(ticket);
            const techName = techId ? techMap.get(techId) || 'Inconnu' : 'Inconnu';

            // Mise à jour ou création du ticket
            const localTicket = await this.prisma.ticket.upsert({
              where: { autotaskTicketId: ticket.id },
              update: {
                status: ticket.status,
                priority: ticket.priority,
                lastActivityDate: ticket.lastActivityDate,
                assignedResourceId: techId,
                assignedResourceName: techName,
                lastSync: new Date(),
              },
              create: {
                userId,
                autotaskTicketId: ticket.id,
                ticketNumber: ticket.ticketNumber,
                title: ticket.title,
                description: ticket.description,
                createDate: new Date(ticket.createDate),
                status: ticket.status,
                priority: ticket.priority,
                companyAutotaskId: companyId,
                contactAutotaskId: contactId,
                authorName: `${user.firstName} ${user.lastName}`,
                assignedResourceId: techId,
                assignedResourceName: techName,
                lastActivityDate: ticket.lastActivityDate,
                lastSync: new Date(),
              },
            });

            const ticketNotes = allNotes.filter((n: any) => n.ticketID === ticket.id);
            const ticketTimes = allTimeEntries.filter((te: any) => te.ticketID === ticket.id);

            // Traitement des Notes
            const notePromises = ticketNotes.map((note: any) => {
              if (note.publish === 1 && note.noteType !== 13) {
                const resId = note.creatorResourceID ? Number(note.creatorResourceID) : null;
                
                let authorName: string = 'Inconnu';
                let localUserId: number | null = null;
                let authorContactId: number | null = note.creatorContactID ? Number(note.creatorContactID) : null;
                let userType: 'user' | 'technician' = 'user';

                if (resId === 29682975) { // ID de ton API User Autotask
                  authorName = `${user.firstName} ${user.lastName}`;
                  localUserId = userId;
                  authorContactId = Number(user.autotaskContactId);
                  userType = 'user';
                } else if (resId !== null) {
                  authorName = techMap.get(resId) || 'Technicien';
                  userType = 'technician';
                }

                return this.prisma.ticketMessage.upsert({
                  where: {
                    autotaskMessageId_sourceType: {
                      autotaskMessageId: note.id,
                      sourceType: 'note',
                    },
                  },
                  update: { syncedAt: new Date(), content: note.description },
                  create: {
                    ticketId: localTicket.id,
                    autotaskTicketId: BigInt(ticket.id),
                    autotaskMessageId: note.id,
                    sourceType: 'note',
                    userType,
                    apiResourceId: resId,
                    authorAutotaskContactId: authorContactId,
                    localUserId,
                    authorName,
                    content: note.description || '',
                    createdAt: new Date(note.createDateTime),
                    syncedAt: new Date(),
                  },
                });
              }
              return Promise.resolve();
            });

            // Traitement des Temps
            const timePromises = ticketTimes.map((entry: any) => {
              const resId = Number(entry.resourceID);
              const hours = entry.hoursWorked ? `[${entry.hoursWorked}h] ` : '';

              return this.prisma.ticketMessage.upsert({
                where: {
                  autotaskMessageId_sourceType: {
                    autotaskMessageId: entry.id,
                    sourceType: 'time_entry',
                  },
                },
                update: { syncedAt: new Date() },
                create: {
                  ticketId: localTicket.id,
                  autotaskTicketId: BigInt(ticket.id),
                  autotaskMessageId: entry.id,
                  sourceType: 'time_entry',
                  userType: 'technician',
                  apiResourceId: resId,
                  authorName: techMap.get(resId) || 'Technicien',
                  content: `${hours}${entry.summaryNotes || ''}`,
                  createdAt: new Date(entry.startDateTime),
                  syncedAt: new Date(),
                },
              });
            });

            await Promise.all([...notePromises, ...timePromises]);
          }),
        );
      }

      console.timeEnd(`[SYNC-TOTAL] user:${userId}`);
    } catch (error) {
      console.error(`[SYNC] Erreur :`, error.message);
      throw error;
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
      return tickets.map((ticket) => ({
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
        select: { fullName: true },
      });

      // Si on trouve le tech dans la DB, on rend son nom, sinon "Inconnu"
      return tech ? tech.fullName : 'Inconnu';
    } catch (error) {
      return 'Inconnu';
    }
  }
  async createInAutotask(
    contactId: number,
    companyId: number,
    title: string,
    description: string,
  ) {
    const headers = {
      ApiIntegrationCode: this.configService.get(
        'AUTOTASK_API_INTEGRATION_CODE',
      ),
      UserName: this.configService.get('AUTOTASK_USERNAME'),
      Secret: this.configService.get('AUTOTASK_SECRET'),
      'Content-Type': 'application/json',
    };
    const url =
      'https://webservices16.autotask.net/ATServicesRest/V1.0/Tickets';
    const body = {
      companyID: Number(companyId),
      contactID: Number(contactId),
      title: title,
      description: description,
      queueID: 29682833, // La file d'attente obligatoire
      status: 1, // Nouveau
      priority: 3, // Priorité (ton CURL utilise 3)
      source: -1, // Source
      ticketType: 1, // Type de ticket
      billingCodeID: 29682801, // Le Work Type facturable (très important pour Autotask)
    };

    const response = await firstValueFrom(
      this.httpService.post(url, body, { headers }),
    );

    // --- AJOUT DE LOGS POUR ANALYSE ---
    console.log('\n[DEBUG-AUTOTASK] Réponse brute du POST creation:');
    console.log(JSON.stringify(response.data, null, 2));
    return response.data; // Contient l'ID et le ticketNumber
  }

  async getTicketByAutotaskId(autotaskTicketId: number, userId: number) {
    return this.prisma.ticket.findFirst({
      where: {
        autotaskTicketId,
        userId, // ← sécurité : on vérifie que c'est bien le ticket de cet utilisateur
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
    if (BigInt(autotaskTicketId) < 0n) {
      return [];
    }

    return this.prisma.ticketMessage.findMany({
      where: { autotaskTicketId: BigInt(autotaskTicketId) },
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
    createdByContactID: number,
    userId: number,
    content: string,
  ) {
    try {
      let finalAutotaskId = BigInt(autotaskTicketId);

      // --- SÉCURITÉ ID NÉGATIF ---
      if (finalAutotaskId < 0n) {
        console.log(
          `[NOTE] ID temporaire détecté (${finalAutotaskId}). Tentative de récupération de l'ID réel...`,
        );

        // On cherche le ticket par son ID local (qu'on a stocké dans autotaskTicketId temporairement)
        const ticketInDb = await this.prisma.ticket.findFirst({
          where: { userId: userId, autotaskTicketId: finalAutotaskId },
          select: { autotaskTicketId: true, id: true },
        });

        // Si le ticket n'a toujours pas d'ID positif en base, c'est que le worker 'create-ticket' n'a pas fini
        if (!ticketInDb || ticketInDb.autotaskTicketId < 0n) {
          throw new Error(
            `Le ticket n'est pas encore synchronisé avec Autotask (ID: ${finalAutotaskId}). BullMQ va réessayer...`,
          );
        }

        finalAutotaskId = ticketInDb.autotaskTicketId;
        console.log(`[NOTE] ID réel trouvé : ${finalAutotaskId}. On continue.`);
      }

      // 1. Récupérer les infos de l'utilisateur
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });

      const authorFullName = user
        ? `[user]: ${user.firstName} ${user.lastName}`
        : `[user]: Client Portail`;
      const autotaskNoteTitle = user
        ? `Note par ${user.firstName} ${user.lastName}`
        : 'Note client via portail';

      const headers = {
        ApiIntegrationCode: this.configService.get(
          'AUTOTASK_API_INTEGRATION_CODE',
        ),
        UserName: this.configService.get('AUTOTASK_USERNAME'),
        Secret: this.configService.get('AUTOTASK_SECRET'),
        'Content-Type': 'application/json',
      };

      const payload = {
        createdByContactID: Number(createdByContactID),
        title: autotaskNoteTitle,
        description: content,
        noteType: 1,
        publish: 1,
      };

      // 2. Création dans Autotask avec le finalAutotaskId (qui est maintenant forcément positif)
      const response = await firstValueFrom(
        this.httpService.post(
          `https://webservices16.autotask.net/ATServicesRest/V1.0/Tickets/${finalAutotaskId}/Notes`,
          payload,
          { headers },
        ),
      );

      const autotaskNoteId = response.data.itemId;

      // 3. Récupère le ticket local pour la relation
      const localTicket = await this.prisma.ticket.findFirst({
        where: { autotaskTicketId: finalAutotaskId },
        select: { id: true },
      });

      if (!localTicket)
        throw new Error('Ticket local non trouvé après création de note');

      // 4. Enregistrement local
      return await this.prisma.ticketMessage.create({
        data: {
          autotaskMessageId: BigInt(autotaskNoteId),
          ticketId: localTicket.id,
          autotaskTicketId: finalAutotaskId,
          userType: 'user',
          authorName: authorFullName,
          authorAutotaskContactId: Number(createdByContactID),
          localUserId: userId,
          apiResourceId: 29682975,
          content: content,
          createdAt: new Date(),
          syncedAt: new Date(),
          sourceType: 'note',
        },
      });
    } catch (error) {
      // Si c'est l'erreur "Le ticket n'est pas encore prêt", on la relance pour BullMQ
      // Si c'est une erreur 500 d'Autotask, on log et on relance aussi
      console.error(
        '[CREATE NOTE] Erreur :',
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  // src/tickets/tickets.service.ts

  // --- MÉTHODES POUR AJOUTER AUX FILES (APPELÉES PAR LES CONTROLLERS) ---

  async queueSyncUser(userId: number, contactId: number, companyId: number) {
    await this.autotaskQueue.add(
      'sync-user',
      {
        userId,
        contactId,
        companyId,
      },
      {
        attempts: 2,
        backoff: { type: 'exponential', delay: 10000 },
      },
    );
  }

  async queueCreateNote(
    autotaskTicketId: number,
    contactId: number,
    userId: number,
    content: string,
  ) {
    // On ajoute le job à la file
    await this.autotaskQueue.add(
      'create-note',
      {
        autotaskTicketId,
        contactId, // correspond à createdByContactID
        userId,
        content,
      },
      {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 10000,
        },
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 100 },
      },
    );
  }

  // Garde tes méthodes originales (syncTicketsAndMessagesForUser, createNoteForTicket, etc.)
  // EXACTEMENT comme elles sont, le Worker va les appeler.
}
