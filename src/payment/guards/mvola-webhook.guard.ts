import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Request } from 'express';

// IPs officielles de l'API Mvola (sandbox + production)
// À mettre à jour si Mvola change son infrastructure.
// Laisser vide ([]) pour désactiver le whitelist (non recommandé en production).
const MVOLA_ALLOWED_IPS: string[] = (process.env.MVOLA_ALLOWED_IPS || '')
  .split(',')
  .map((ip) => ip.trim())
  .filter(Boolean);

@Injectable()
export class MvolaWebhookGuard implements CanActivate {
  private readonly logger = new Logger(MvolaWebhookGuard.name);
  private readonly webhookSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.webhookSecret = this.configService.get<string>(
      'MVOLA_WEBHOOK_SECRET',
      '',
    );

    // Fail-fast au démarrage : sans secret configuré le guard est inutile
    if (!this.webhookSecret) {
      this.logger.error(
        'MVOLA_WEBHOOK_SECRET non configuré — le callback endpoint est non sécurisé',
      );
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // ── 1. Vérification IP (si whitelist configurée) ───────────────────────
    if (MVOLA_ALLOWED_IPS.length > 0) {
      const clientIp =
        (request.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ??
        request.socket.remoteAddress ??
        '';

      if (!MVOLA_ALLOWED_IPS.includes(clientIp)) {
        this.logger.warn(`Callback rejeté — IP non autorisée: ${clientIp}`);
        throw new UnauthorizedException('IP non autorisée');
      }
    }

    // ── 2. Secret configuré ? ─────────────────────────────────────────────
    if (!this.webhookSecret) {
      this.logger.error('Callback rejeté — MVOLA_WEBHOOK_SECRET manquant');
      throw new UnauthorizedException('Configuration webhook manquante');
    }

    // ── 3. Présence de la signature ───────────────────────────────────────
    const signature = request.headers['x-mvola-signature'] as string;

    if (!signature) {
      this.logger.warn('Callback reçu sans signature');
      throw new UnauthorizedException('Signature manquante');
    }

    // ── 4. Vérification HMAC-SHA256 ───────────────────────────────────────
    // IMPORTANT : utiliser le raw body (Buffer) et non JSON.stringify(req.body)
    // pour éviter les divergences de sérialisation (ordre des clés, espaces).
    // Nécessite rawBody dans main.ts :
    //   app.use(express.json({ verify: (req, _, buf) => { req.rawBody = buf } }))
    const rawBody: Buffer | undefined = (request as any).rawBody;
    const payload = rawBody
      ? rawBody
      : Buffer.from(JSON.stringify(request.body));

    if (!rawBody) {
      this.logger.warn(
        'rawBody non disponible — fallback sur JSON.stringify (risque de divergence)',
      );
    }

    const expected = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex');

    // timingSafeEqual exige des buffers de même longueur
    // → comparer les hex strings encodées en Buffer évite le crash
    // si la signature reçue a une longueur différente
    const sigBuffer = Buffer.from(signature);
    const expBuffer = Buffer.from(expected);

    if (sigBuffer.length !== expBuffer.length) {
      this.logger.warn('Callback reçu avec signature de longueur incorrecte');
      throw new UnauthorizedException('Signature invalide');
    }

    const valid = crypto.timingSafeEqual(sigBuffer, expBuffer);

    if (!valid) {
      this.logger.warn('Callback reçu avec signature invalide');
      throw new UnauthorizedException('Signature invalide');
    }

    this.logger.log('Callback Mvola authentifié avec succès');
    return true;
  }
}
