import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    // IMPORTANT : Dans Docker, on utilise le nom du service 'aci_postgres'
    // et le port interne 5432
    const pool = new Pool({
      host: 'aci_postgres', 
      port: 5432,
      user: 'aci',
      password: '123456',
      database: 'aci_portal',
    });

    const adapter = new PrismaPg(pool);

    super({
      adapter,
      log: ['info', 'warn', 'error'],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      console.log('✅ PrismaService connecté avec succès via Adapter');
    } catch (error) {
      console.error('❌ Erreur de connexion Prisma:', error.message);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}