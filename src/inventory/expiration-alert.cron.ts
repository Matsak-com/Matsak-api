// expiration-alert.cron.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ExpirationAlertService } from './expiration-alert.service';
import { ExpirationAlertLevel } from './dto/expiration-alert.dto';

@Injectable()
export class ExpirationAlertCron {
  private readonly logger = new Logger(ExpirationAlertCron.name);

  constructor(private readonly alertService: ExpirationAlertService) {}

  @Cron('0 8 * * *')
  async runDailyCheck() {
    const alerts = await this.alertService.getExpiringLots();

    const critical = alerts.filter(
      (a) =>
        a.level === ExpirationAlertLevel.EXPIRED ||
        a.level === ExpirationAlertLevel.ONE_WEEK,
    );

    if (critical.length > 0) {
      this.logger.warn(
        `${critical.length} lot(s) expiré(s) ou expirant sous 7 jours`,
      );
      // await this.notificationService.sendExpirationAlert(critical);
    }
  }
}
