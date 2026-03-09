export type MockStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface MockTransaction {
  serverCorrelationId: string;
  transactionReference: string;
  status: MockStatus;
  amount: number;
  customerPhone: string;
}

export const mockMvolaStore = new Map<string, MockTransaction>();
