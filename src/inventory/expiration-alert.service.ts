// expiration-alert.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { StockLotRepository } from './stock-lot.repository';
import {
  ExpirationAlertDto,
  ExpirationAlertLevel,
} from './dto/expiration-alert.dto';

@Injectable()
export class ExpirationAlertService {
  private readonly logger = new Logger(ExpirationAlertService.name);

  constructor(private readonly stockLotRepo: StockLotRepository) {}

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  private levelFromDays(daysUntilExpiration: number): ExpirationAlertLevel {
    if (daysUntilExpiration < 0) return ExpirationAlertLevel.EXPIRED;
    if (daysUntilExpiration <= 7) return ExpirationAlertLevel.ONE_WEEK;
    if (daysUntilExpiration <= 30) return ExpirationAlertLevel.ONE_MONTH;
    return ExpirationAlertLevel.THREE_MONTHS;
  }

  private toAlertDto(lot: any, now: Date): ExpirationAlertDto {
    const daysUntilExpiration = Math.ceil(
      (new Date(lot.expirationDate).getTime() - now.getTime()) /
        (1000 * 60 * 60 * 24),
    );

    return {
      lotId: lot._id.toString(),
      productId: lot.product?._id?.toString() ?? lot.product?.toString(),
      productName: lot.product?.detail?.name ?? 'Produit inconnu',
      lotNumber: lot.lotNumber,
      quantity: lot.quantity,
      expirationDate: lot.expirationDate,
      daysUntilExpiration,
      level: this.levelFromDays(daysUntilExpiration),
    };
  }

  async getExpiringLots(teamId?: string): Promise<ExpirationAlertDto[]> {
    const now = new Date();
    const horizon = this.addDays(now, 90);

    const lots = await this.stockLotRepo.findExpiringLots({
      horizon,
      teamId,
    });

    return lots.map((lot: any) => this.toAlertDto(lot, now));
  }

  async getGroupedAlerts(teamId?: string) {
    const all = await this.getExpiringLots(teamId);
    return {
      expired: all.filter((a) => a.level === ExpirationAlertLevel.EXPIRED),
      oneWeek: all.filter((a) => a.level === ExpirationAlertLevel.ONE_WEEK),
      oneMonth: all.filter((a) => a.level === ExpirationAlertLevel.ONE_MONTH),
      threeMonths: all.filter(
        (a) => a.level === ExpirationAlertLevel.THREE_MONTHS,
      ),
    };
  }
}
