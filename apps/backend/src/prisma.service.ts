// src/prisma.service.ts
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
    const pool = new Pool({
      host: 'localhost',
      port: 5433,
      user: 'aci',
      password: '123456',
      database: 'aci_portal',
      max: 10,
    });

    const adapter = new PrismaPg(pool);

    super({
      adapter, // ← LA LIGNE MAGIQUE
      log: ['query', 'info', 'warn', 'error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
    console.log('PrismaService connected to database successfully');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}