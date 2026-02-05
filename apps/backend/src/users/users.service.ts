import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service'; // ← AJOUTE CET IMPORT

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {} // ← AJOUTE LE CONSTRUCTOR

  async getAllUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        autotaskContactId: true, // On ajoute l'ID Autotask
        company: {
          select: { name: true },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [
      { role: 'asc' }, // 'admin' vient avant 'user' alphabétiquement
      { createdAt: 'desc' }
    ],
    });
  }

  // Plus tard tu ajouteras : createUser, updateUser, deleteUser, etc.
}