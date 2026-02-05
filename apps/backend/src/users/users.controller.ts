import { Controller, Get, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UsersService } from './users.service';
import type { Request } from 'express';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('admin/list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getAllUsers(@Req() req: Request) {
    const user = req.user as any;

    // Redondance avec RolesGuard (optionnel mais très sécurisé)
    if (user.role !== 'admin') {
      throw new ForbiddenException('Accès réservé aux administrateurs');
    }

    return this.usersService.getAllUsers();
  }
}