import { Controller, Get, Req, UseGuards, UnauthorizedException } from '@nestjs/common';
import { Post, Body } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { Request } from 'express';
import { Param, NotFoundException } from '@nestjs/common';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';

@Controller('tickets')
export class TicketsController {
  constructor(private ticketsService: TicketsService) {}

  @Get()
@UseGuards(JwtAuthGuard)
async getTickets(@Req() req: Request) {
  //console.log("Requête /tickets reçue");

  const user = req.user as any;
  //console.log("req.user décodé :", user); // ← on voit ce que contient le JWT

  if (!user?.autotaskContactId || !user?.autotaskCompanyId) {
    //console.log("Utilisateur non synchronisé – contactId:", user?.autotaskContactId, "companyId:", user?.autotaskCompanyId);
    throw new UnauthorizedException('Compte non synchronisé avec Autotask. Veuillez vous déconnecter et reconnecter.');
  }

  //console.log("Appel service avec contactId:", user.autotaskContactId, "companyId:", user.autotaskCompanyId);

  const tickets = await this.ticketsService.getTicketsForUser(
    user.autotaskContactId,
    user.autotaskCompanyId,
  );

  //console.log("Tickets récupérés :", tickets.length, "tickets");

  return { tickets };
}

// apps/backend/src/tickets/tickets.controller.ts

@Post()
@UseGuards(JwtAuthGuard)
async createTicket(@Body() createTicketDto: any, @Req() req: Request) {
  const user = req.user as any;
  const userId = user.userId || user.sub;

  // On ATTEND que le service ait fini (création Autotask + récupération numéro)
  const finalTicket = await this.ticketsService.createTicketForUser(
    user.autotaskContactId,
    user.autotaskCompanyId,
    createTicketDto.title,
    createTicketDto.description,
    userId
  );

  return {
    success: true,
    data: finalTicket // On renvoie le vrai ticket complet
  };
}

@Get(':id')
@UseGuards(JwtAuthGuard)
async getTicketById(@Param('id') id: string, @Req() req: Request) {
  const user = req.user as any;

  if (!user?.userId) {
    throw new UnauthorizedException('Utilisateur non authentifié');
  }

  const userId = Number(user.userId);
  const autotaskTicketId = Number(id);  // ← l'ID dans l'URL est l'autotaskTicketId

  const ticket = await this.ticketsService.getTicketByAutotaskId(autotaskTicketId, userId);

  if (!ticket) {
    throw new NotFoundException('Ticket non trouvé ou non autorisé');
  }

  return ticket;
}


@Post('db')
@UseGuards(JwtAuthGuard)
async getTicketsFromDb(@Req() req: Request, @Body() body: any) {
  const user = req.user as any;

  // On vérifie 'userId' au lieu de 'sub' car c'est ce que contient votre token
  if (!user || !user.userId) { 
    //console.error("[BACK] Erreur : L'utilisateur n'a pas de 'userId' dans son token");
    throw new UnauthorizedException('Utilisateur non identifié dans le token');
  }

  const userId = user.userId; 
  return await this.ticketsService.getUserTicketsFromDb(userId);
}

@Get(':id/messages')
@UseGuards(JwtAuthGuard)
async getTicketMessages(@Param('id') id: string, @Req() req: Request) {
  const user = req.user as any;
  const autotaskTicketId = Number(id);

  // Optionnel : on peut revérifier que le ticket appartient au user
  // Mais pas obligatoire si on fait confiance à la sécurité côté frontend

  const messages = await this.ticketsService.getTicketMessages(autotaskTicketId);

  return messages;
}

@Post(':id/notes')
@UseGuards(JwtAuthGuard)
async createNote(
  @Param('id') id: string,
  @Body() body: { content: string },
  @Req() req: any,
) {
  const user = req.user;
  const autotaskTicketId = Number(id);
  const content = body.content?.trim();

  if (!content) throw new BadRequestException('Le contenu est requis');

  // APPEL À LA QUEUE (Réponse instantanée pour le client)
  await this.ticketsService.queueCreateNote(
    autotaskTicketId,
    user.autotaskContactId,
    user.userId,
    content
  );

  return { success: true, message: "Message en cours d'envoi" };
}
}