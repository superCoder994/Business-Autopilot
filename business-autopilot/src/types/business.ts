export interface DashboardMetrics {
  todayRevenue: number;
  revenueChangePct: number;
  eveningDropPct: number;
  dormantCustomerCount: number;
  activeCampaign: CampaignProposal | null;
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
