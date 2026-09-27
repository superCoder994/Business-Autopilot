export interface Transaction {
  id: string;
  timestamp: string; // ISO String
  amount: number;
  customerId: string;
}

export interface RevenueWindow {
  startHour: number;
  amount: number;
}

export interface Customer {
  id: string;
  name: string;
  lastOrderTimestamp: string; // ISO String
}

export type CampaignStatus = 'proposed' | 'approved' | 'rejected' | 'active';

export interface CampaignProposal {
  id: string;
  title: string;
  discountAmount: number;
  minOrderValue: number;
  targetCohortSize: number;
  durationDays: number;
  status: CampaignStatus;
  approvedAt?: string;
  activatedAt?: string;
}

export interface SalesAnomaly {
  id: string;
  type: 'sales_drop';
  time: string;
  description: string;
  impactPercent: number;
}

export interface BusinessState {
  todayRevenue: number;
  revenueChangePct: number;
  revenueByTwoHourWindow: RevenueWindow[];
  eveningDropPct: number;
  dormantCustomerCount: number;
  activeCampaign: CampaignProposal | null;
  anomalies: SalesAnomaly[];
}

export interface PolicyCheckResult {
  isValid: boolean;
  rules: {
    ruleName: string;
    passed: boolean;
    reason?: string | undefined;
  }[];
}
