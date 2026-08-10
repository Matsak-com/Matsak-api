// dto/expiration-alert.dto.ts
export enum ExpirationAlertLevel {
  EXPIRED = 'expired',
  ONE_WEEK = 'one_week',
  ONE_MONTH = 'one_month',
  THREE_MONTHS = 'three_months',
}

export interface ExpirationAlertDto {
  lotId: string;
  productId: string;
  productName: string;
  lotNumber: string;
  quantity: number;
  expirationDate: Date;
  daysUntilExpiration: number;
  level: ExpirationAlertLevel;
}
