// backend/src/main.ts

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TechniciansService } from './autotask/technicians.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CONFIGURATION CORS MISE À JOUR
  app.enableCors({
    origin: [
      'https://client.acitechnology.eu', // Nouveau sous-domaine
      'https://acitechnology.eu',        // Ancien domaine (au cas où)
      'http://localhost:3000'            // Dev local
      'http://localhost'        // Accès via Caddy (Local)
    ],
    credentials: true,
  });

  // Synchronisation des techniciens au démarrage
  const techniciansService = app.get(TechniciansService);
  try {
    await techniciansService.syncTechnicians();
    console.log('Techniciens synchronisés au démarrage');
  } catch (error) {
    console.error(
      'Erreur lors de la synchro techniciens au démarrage :',
      error.message,
    );
  }

  const PORT = 3001;
  // '0.0.0.0' est parfait pour Docker, ça permet d'écouter sur toutes les interfaces
  await app.listen(PORT, '0.0.0.0');

  const baseUrl =
    process.env.NODE_ENV === 'production'
      ? 'https://client.acitechnology.eu/api'
      : `http://localhost:${PORT}`;

  console.log(`Application is running on: ${baseUrl}`);
}
bootstrap();