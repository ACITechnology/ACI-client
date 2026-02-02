import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

@Processor('autotask-queue', {
  concurrency: 3, // C'est ICI qu'on bloque à 3 appels simultanés
})
export class TicketsProcessor extends WorkerHost {
  
  // Cette méthode s'exécute dès qu'un job sort de la file
  async process(job: Job<any, any, string>): Promise<any> {
    console.log(`[QUEUE] Traitement du job ${job.id} de type ${job.name}`);
    
    // Pour l'instant on simule un travail de 2 secondes
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log(`[QUEUE] Job ${job.id} terminé !`);
    return { success: true };
  }
}