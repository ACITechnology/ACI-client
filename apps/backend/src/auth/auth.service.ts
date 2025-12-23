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

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private autotask: AutotaskService,
    private company: CompanyService,
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

    const user = await this.prisma.user.create({
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
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { company: true }, // on récupère l'entreprise
    });

    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    // Synchro Autotask au premier login
    if (!user.autotaskContactId) {
      if (!user.companyId || !user.autotaskCompanyId) {
        throw new BadRequestException('Entreprise non définie');
      }

      let contact = await this.autotask.findContactByEmailAndCompany(
        user.email,
        user.autotaskCompanyId,
      );

      if (!contact) {
        const newContactId = await this.autotask.createContact({
          email: user.email,
          firstName: user.firstName || 'Client',
          lastName: user.lastName || 'Portail',
          companyId: user.autotaskCompanyId,
        });

        contact = { id: newContactId, companyID: user.autotaskCompanyId };
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          autotaskContactId: contact.id,
          phone: contact.phone || user.phone, // ← on récupère le téléphone si présent
        },
      });
    }

    const payload = { sub: user.id, email: user.email };
    return {
      access_token: this.jwt.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        companyName: user.company?.name || 'Inconnu', // ← on récupère depuis la relation
      },
    };
  }
}