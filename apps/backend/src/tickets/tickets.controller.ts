import { Controller, Get, Req, UseGuards, UnauthorizedException } from '@nestjs/common';
import { Post, Body } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { Request } from 'express';

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

  @Post()
  @UseGuards(JwtAuthGuard)
  async createTicket(@Body() createTicketDto: any, @Req() req: Request) {
    const user = req.user as any;

    if (!user?.autotaskContactId || !user?.autotaskCompanyId) {
      throw new UnauthorizedException('Compte non synchronisé avec Autotask.');
    }

    console.log('Nouvelle requête de création de ticket reçue :', createTicketDto);

        const ticket = await this.ticketsService.createTicketForUser(
      user.autotaskContactId,
      user.autotaskCompanyId,
      createTicketDto.title,
      createTicketDto.description,
    );

    return {
      success: true,
      message: 'Ticket créé avec succès dans Autotask !',
      data: ticket,
    };
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
}