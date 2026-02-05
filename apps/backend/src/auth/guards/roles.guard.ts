import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as any;

    if (!user || user.role !== 'admin') {
      throw new ForbiddenException('Accès réservé aux administrateurs');
    }

    return true;
  }
}