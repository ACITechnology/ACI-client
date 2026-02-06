// src/main.ts

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TechniciansService } from './autotask/technicians.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: ['https://acitechnology.eu', 'http://localhost:3000'], // autorise seulement le frontend
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

  // LA LIGNE QUI RÉSOUT TOUT SOUS WSL2
 const PORT = 3001; // Définis la variable ici
  await app.listen(PORT, '0.0.0.0');

  const baseUrl =
    process.env.NODE_ENV === 'production'
      ? 'https://acitechnology.eu/api'
      : `http://localhost:${PORT}`;

  console.log(`Application is running on: ${baseUrl}`);
}
bootstrap();
