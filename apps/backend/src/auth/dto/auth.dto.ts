// src/auth/dto/auth.dto.ts
import { IsEmail, IsString, MinLength, IsInt, Min } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Email invalide' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Le mot de passe doit faire au moins 6 caractères' })
  password: string;

  @IsString({ message: 'Le prénom est obligatoire' })
  firstName: string;

  @IsString({ message: 'Le nom est obligatoire' })
  lastName: string;

  // NOUVEAU : l'admin choisit l'entreprise via autocomplete → on reçoit son ID local (pas id de autotask)
  @IsInt({ message: 'L\'entreprise est obligatoire et doit être valide' })
  @Min(1, { message: 'L\'entreprise est obligatoire' })
  companyId: number;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}