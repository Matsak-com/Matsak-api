import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class SessionMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SessionMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    // Vérifier le consentement des cookies
    const cookieConsent = req.cookies?.cookieConsent;

    // ⚠️ Si l'utilisateur n'a pas encore décidé (undefined) ou a refusé
    if (cookieConsent === 'rejected') {
      if (req.cookies.sessionId) {
        res.clearCookie('sessionId', { path: '/' });
      }
      next();
      return;
    }
    // ⚠️ Si l'utilisateur n'a pas encore décidé (undefined)
    if (!cookieConsent) {
      next();
      return;
    }

    // ✅ Si consentement accepté
    if (cookieConsent === 'accepted') {
      // Créer sessionId uniquement si accepté et qu'il n'existe pas
      if (!req.cookies.sessionId) {
        const sessionId = randomUUID();

        res.cookie('sessionId', sessionId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 1000 * 60 * 60 * 24 * 7, // 7 jours
          path: '/',
        });

        req.cookies.sessionId = sessionId;
      }
    }

    next();
  }
}
