export interface Transaction {
  id: string;
  timestamp: string; // ISO String
  amount: number;
  customerId: string;
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
}

export interface BusinessState {
  todayRevenue: number;
  revenueChangePct: number;
  eveningDropPct: number;
  dormantCustomerCount: number;
  activeCampaign: CampaignProposal | null;
}

export interface PolicyCheckResult {
  isValid: boolean;
  rules: {
    ruleName: string;
    passed: boolean;
    reason?: string | undefined;
  }[];
}
