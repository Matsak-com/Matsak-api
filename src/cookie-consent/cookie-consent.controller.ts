import { Controller, Post, Res, HttpStatus, Get, Req } from '@nestjs/common';
import { Response, Request } from 'express';

@Controller('cookie-consent')
export class CookieConsentController {
  /**
   * Endpoint pour accepter les cookies
   * POST /api/cookie-consent/accept
   */
  @Post('accept')
  acceptCookies(@Res() res: Response) {
    // Créer le cookie de consentement
    res.cookie('cookieConsent', 'accepted', {
      httpOnly: false, // Accessible en JS pour vérification côté client
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 365, // 1 an
      path: '/',
    });

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Consentement des cookies enregistré',
      consent: 'accepted',
    });
  }

  /**
   * Endpoint pour refuser les cookies
   * POST /api/cookie-consent/reject
   */
  @Post('reject')
  rejectCookies(@Res() res: Response) {
    // Supprimer les cookies non essentiels
    res.clearCookie('sessionId', { path: '/' });

    // Enregistrer le refus
    res.cookie('cookieConsent', 'rejected', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 365, // 1 an
      path: '/',
    });

    return res.status(HttpStatus.OK).json({
      success: true,
      message: 'Cookies refusés',
      consent: 'rejected',
    });
  }

  /**
   * Endpoint pour vérifier l'état du consentement
   * GET /api/cookie-consent/status
   */
  @Get('status')
  getConsentStatus(@Req() req: Request, @Res() res: Response) {
    const cookieConsent = req.cookies?.cookieConsent;

    return res.status(HttpStatus.OK).json({
      hasConsent: cookieConsent === 'accepted',
      consent: cookieConsent || null,
    });
  }
}
