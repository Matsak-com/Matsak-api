import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // ✅ Ne lance pas d'erreur si pas de token, retourne juste null
  handleRequest(err: any, user: any) {
    // Si l'utilisateur existe (token valide), on le retourne
    // Sinon, on retourne null (pas d'erreur)
    return user || null;
  }
}