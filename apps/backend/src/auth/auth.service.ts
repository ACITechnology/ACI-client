// src/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { AutotaskService } from '../autotask/autotask.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { CompanyService } from '../company/company.service';
import { TicketsService } from '../tickets/tickets.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private autotask: AutotaskService,
    private company: CompanyService,
    private ticketsService: TicketsService,
  ) {}

  // INSCRIPTION – admin seulement (on mettra un guard plus tard)
     async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new BadRequestException('Cet email est déjà utilisé');
    }

    const company = await this.prisma.company.findUnique({
      where: { id: dto.companyId },
    });

    if (!company) {
      throw new BadRequestException('Entreprise non trouvée');
    }

    const hashed = await bcrypt.hash(dto.password, 10);

    let user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        password: hashed,
        firstName: dto.firstName,
        lastName: dto.lastName,
        companyId: company.id,
        autotaskCompanyId: company.autotaskId,
        // companyName supprimé — on le récupérera via la relation company
      },
    });

    const { password, ...result } = user;
    return result;
  }

    // CONNEXION + SYNCHRO/CREATION CONTACT AUTOTASK
 async login(dto: LoginDto) {
    let user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { company: true }, // on récupère l'entreprise
    });

    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

  //   if (user.autotaskContactId && user.company?.autotaskId) {
  //   await this.ticketsService.syncTicketsAndMessagesForUser(
  //     user.id,
  //     user.autotaskContactId,
  //     user.company.autotaskId,
  //   );
  // }

    // Synchro Autotask au premier login
    if (!user.autotaskContactId) {
      console.log("Première connexion pour", user.email, "- début synchro Autotask");

      if (!user.companyId || !user.autotaskCompanyId) {
        throw new BadRequestException('Entreprise non définie');
      }

      let contact = await this.autotask.findContactByEmailAndCompany(
        user.email,
        user.autotaskCompanyId,
      );

      console.log("Contact trouvé ?", contact ? "Oui (ID: " + contact.id + ")" : "Non");

      if (!contact) {
        const newContactId = await this.autotask.createContact({
          email: user.email,
          firstName: user.firstName || 'Client',
          lastName: user.lastName || 'Portail',
          companyId: user.autotaskCompanyId,
        });
        console.log("Nouveau contact créé – ID:", newContactId);
        contact = { id: newContactId, companyID: user.autotaskCompanyId };
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          autotaskContactId: contact.id,
          phone: contact.phone || user.phone, // ← on récupère le téléphone si présent
        },
      });
      console.log("Utilisateur mis à jour en base – autotaskContactId:", contact.id);

            // RECHARGE L'UTILISATEUR DEPUIS LA BASE POUR AVOIR LES DONNÉES À JOUR
      user = await this.prisma.user.findUnique({
        where: { id: user.id },
        include: { company: true },
      });

      if (!user) {
        throw new Error('Utilisateur non trouvé après synchro');
      }

      console.log("Utilisateur rechargé – autotaskContactId:", user.autotaskContactId);
    }

    const payload = { 
      sub: user.id, 
      email: user.email,
      autotaskContactId: user.autotaskContactId,
      autotaskCompanyId: user.autotaskCompanyId 
    };
    return {
      access_token: this.jwt.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        companyName: user.company?.name || 'Inconnu', // ← on récupère depuis la relation
        autotaskContactId: user.autotaskContactId, // ← AJOUTE ÇA
    autotaskCompanyId: user.autotaskCompanyId, // ← AJOUTE ÇA
      },
    };
  }

  async getFreshUser(userId: number) {
  // 1. On récupère l'utilisateur
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    include: { company: true },
  });

  // 2. Correction Erreur TS18047: 'user' is possibly 'null'
  // On vérifie si l'utilisateur existe vraiment avant de continuer
  if (!user) {
    throw new NotFoundException('Utilisateur non trouvé');
  }

  // 3. Correction Erreur TS2339: Property 'password'
  // On extrait le mot de passe pour ne pas le renvoyer au frontend
  const { password, ...result } = user;

  // 4. On renvoie l'objet propre
  return {
    ...result,
    companyName: user.company?.name || 'Inconnu'
  };
}
}