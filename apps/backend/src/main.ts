// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // LA LIGNE QUI RÉSOUT TOUT SOUS WSL2
  await app.listen(3001, '0.0.0.0');
  
  console.log('API disponible sur http://localhost:3001');
}
bootstrap();