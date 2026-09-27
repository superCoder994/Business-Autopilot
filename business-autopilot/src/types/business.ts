export interface SalesAnomaly {
  id: string;
  type: 'sales_drop';
  time: string;
  description: string;
  impactPercent: number;
}

export interface DashboardMetrics {
  todayRevenue: number;
  revenueChangePct: number;
  revenueByTwoHourWindow: RevenueWindow[];
  eveningDropPct: number;
  dormantCustomerCount: number;
  activeCampaign: CampaignProposal | null;
  anomalies: SalesAnomaly[];
}

export interface RevenueWindow {
  startHour: number;
  amount: number;
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

export interface PolicyCheckResult {
  isValid: boolean;
  rules: { ruleName: string; passed: boolean; reason?: string }[];
}

export interface InvestigationResult {
  reply: string;
  findings: string[];
  hasProposal: boolean;
  campaign?: CampaignProposal;
  policyResult?: PolicyCheckResult;
}
