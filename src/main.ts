import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import { corsConfig } from './configs/cors/cors.config';
import * as express from 'express';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  // bodyParser désactivé pour le configurer manuellement
  // → permet d'exposer req.rawBody pour la vérification HMAC du webhook Mvola
  const app = await NestFactory.create(AppModule, {
    cors: corsConfig,
    bodyParser: false,
  });

  app.setGlobalPrefix('api');

  // Body parser JSON avec capture du raw body (Buffer)
  // req.rawBody est utilisé par MvolaWebhookGuard pour vérifier la signature HMAC
  app.use(
    express.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  // Body parser URL-encoded (formulaires)
  app.use(express.urlencoded({ extended: true }));

  app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

  app.use(cookieParser());

  await app.listen(process.env.PORT ?? 8080);
}
bootstrap();