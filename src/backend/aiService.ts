import { CampaignProposal } from './types';

export interface InvestigationContext {
  dropPct: number;
  dormantCohortSize: number;
  eveningRevenue: number;
  baselineEveningRevenue: number;
}

export interface AIService {
  investigateDrop(context: InvestigationContext): Promise<{
    dropPct: number;
    dormantCohortSize: number;
    summary: string;
  }>;
  generateCampaign(targetCohortSize: number): Promise<CampaignProposal>;
}

export class BusinessAIController implements AIService {
  async investigateDrop(context: InvestigationContext) {
    const dropText = `${context.dropPct}%`;
    const summary =
      `Evening revenue is down ${dropText} versus the ₹${context.baselineEveningRevenue.toLocaleString('en-IN')} baseline. ` +
      `There are ${context.dormantCohortSize} customers who have been inactive for more than 21 days.`;

    return {
      dropPct: context.dropPct,
      dormantCohortSize: context.dormantCohortSize,
      summary
    };
  }

  async generateCampaign(targetCohortSize: number): Promise<CampaignProposal> {
    return {
      id: `camp_${Date.now()}`,
      title: 'Evening Special: ₹50 OFF',
      discountAmount: 50,
      minOrderValue: 299,
      targetCohortSize,
      durationDays: 3,
      status: 'proposed'
    };
  }
}

export const aiController = new BusinessAIController();
