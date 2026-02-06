// src/auth/auth.controller.ts

import { 
  Controller, Post, Body, HttpCode, HttpStatus, 
  UseGuards, Req, UnauthorizedException 
} from '@nestjs/common'; // Ajout de Req, UseGuards
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard'; // Vérifie que le chemin est correct
import { TicketsService } from '../tickets/tickets.service';
// import { UsersService } from '../users/users.service'; // Si tu veux renvoyer l'user mis à jour

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private ticketsService: TicketsService, // Injectez le service ici
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

// @UseGuards(JwtAuthGuard)
@Post('sync-status')
async syncStatus(@Body() body: any) {
  const user = body.user;
  
  // AJOUTE CE LOG ICI POUR VOIR DANS LE TERMINAL
  console.log('--- DEBUG SYNC ---');
  console.log('Payload reçu:', JSON.stringify(body));
  console.log('Body complet reçu:', body); // Vérifie si tu vois { user: {...} }
  
  if (!user) {
    throw new UnauthorizedException('Utilisateur non fourni pour la synchro');
  }

  const finalId = user.id || user.userId;
  console.log('ID Utilisateur détecté:', finalId);

  await this.ticketsService.queueSyncUser(
    finalId, 
    user.autotaskContactId, 
    user.autotaskCompanyId
  );

  return { success: true };
}
}