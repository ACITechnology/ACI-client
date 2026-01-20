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

  @UseGuards(JwtAuthGuard)
@Post('sync-status')
async syncStatus(@Req() req: any) {
  const user = req.user;
  
  // 1. On attend la fin de la synchro réelle
  await this.ticketsService.syncTicketsAndMessagesForUser(
    user.userId, 
    user.autotaskContactId, 
    user.autotaskCompanyId
  );

  // 2. IMPORTANT : On récupère l'utilisateur à jour en base
  // On utilise directement le service de tickets ou prisma pour récupérer l'user
  // car req.user contient les vieilles infos du Token JWT
  const updatedUser = await this.authService.getFreshUser(user.userId);

  return { 
    success: true, 
    user: updatedUser // <--- C'est ça qui va mettre à jour ton Frontend !
  };
}
}