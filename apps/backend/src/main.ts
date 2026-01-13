// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TechniciansService } from './autotask/technicians.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: 'http://localhost:3000', // autorise seulement le frontend
    credentials: true,
  });

  // Synchronisation des techniciens au démarrage
  const techniciansService = app.get(TechniciansService);
  try {
    await techniciansService.syncTechnicians();
    console.log("Techniciens synchronisés au démarrage");
  } catch (error) {
    console.error("Erreur lors de la synchro techniciens au démarrage :", error.message);
  }
  
  // LA LIGNE QUI RÉSOUT TOUT SOUS WSL2
  await app.listen(3001, '0.0.0.0');
  
  console.log('API disponible sur http://localhost:3001');
}
bootstrap();