// src/tickets/workers/tickets.worker.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { TicketsService } from '../tickets.service';

@Processor('autotask-queue', {
  concurrency: 3, 
})
@Injectable()
export class TicketsWorker extends WorkerHost {
  constructor(private ticketsService: TicketsService) {
    super();
  }

  async process(job: Job): Promise<any> {
    const { name, data } = job;
    const startTime = Date.now();

    console.log(`\n[BULLMQ-WORKER] 🚀 START: Job #${job.id} | Type: ${name}`);

    try {
      switch (name) {
        case 'create-ticket':
          console.log(`[BULLMQ-WORKER] 🎫 Création Ticket Autotask pour localId: ${data.localTicketId}`);
          const created = await this.ticketsService.createInAutotask(
            data.contactId,
            data.companyId,
            data.title,
            data.description,
          );
          
          await this.ticketsService.finalizeTicketCreation(
            data.localTicketId,
            created.itemId,
          );
          break;

        case 'sync-user':
          console.log(`[BULLMQ-WORKER] 🔄 Synchro Complète pour User: ${data.userId}`);
          console.log(`[BULLMQ-WORKER] ⏳ Appel API Autotask en cours...`);
          
          await this.ticketsService.syncTicketsAndMessagesForUser(
            data.userId,
            data.contactId,
            data.companyId,
          );
          break;

        case 'create-note':
          console.log(`[BULLMQ-WORKER] 📝 Ajout Note sur Ticket Autotask #${data.autotaskTicketId}`);
          await this.ticketsService.createNoteForTicket(
            data.autotaskTicketId,
            data.contactId,
            data.userId,
            data.content
          );
          break;

        default:
          throw new Error(`Type de job inconnu : ${name}`);
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`[BULLMQ-WORKER] ✅ SUCCESS: Job #${job.id} terminé en ${duration}s\n`);
      return { success: true };

    } catch (err) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.error(`[BULLMQ-WORKER] ❌ FAILED: Job #${job.id} après ${duration}s`);
      
      if (err.response?.data) {
        console.error(`[BULLMQ-WORKER] 🔴 Détails API Autotask:`, JSON.stringify(err.response.data));
      }
      console.error(`[BULLMQ-WORKER] 🔴 Message:`, err.message);
      
      throw err; // Permet à BullMQ de retenter le job
    }
  }
}