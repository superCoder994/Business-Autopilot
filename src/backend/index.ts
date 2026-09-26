/**
 * Pure deterministic business engine with an in-memory campaign lifecycle.
 */

import type { BusinessState, CampaignProposal, PolicyCheckResult } from './types';
import {
  calculateEveningDrop,
  calculateRevenueForDate,
  calculateRevenueChangePct,
  getDormantCustomers
} from './analytics';
import { validateCampaignPolicy } from './policyEngine';
import { aiController } from './aiService';
import mockData from '../data/mock_transactions.json';

const BUSINESS_TIMEZONE_OFFSET_MINUTES = Number(process.env.BUSINESS_TIMEZONE_OFFSET_MINUTES || 0);

export class AutopilotEngine {
  private transactions = mockData.transactions || [];
  private customers = mockData.customers || [];
  private baselineEveningSales = mockData.baselineEveningSales || 10000;
  private campaigns = new Map<string, CampaignProposal>();

  public getBusinessState(): BusinessState {
    const now = new Date();
    const todayRevenue = calculateRevenueForDate(this.transactions, now, BUSINESS_TIMEZONE_OFFSET_MINUTES);
    const { dropPct } = calculateEveningDrop(
      this.transactions,
      this.baselineEveningSales,
      18,
      21,
      BUSINESS_TIMEZONE_OFFSET_MINUTES
    );
    const dormantCustomerCount = getDormantCustomers(this.customers, 21, now).length;
    const activeCampaign = [...this.campaigns.values()].find(c => c.status === 'active') ?? null;

    // The mock dataset has no previous-day revenue, so 0 means "comparison unavailable".
    return {
      todayRevenue,
      revenueChangePct: 0,
      eveningDropPct: dropPct,
      dormantCustomerCount,
      activeCampaign
    };
  }

  public async investigateDrop(query = '') {
    const { dropPct, current } = calculateEveningDrop(
      this.transactions,
      this.baselineEveningSales,
      18,
      21,
      BUSINESS_TIMEZONE_OFFSET_MINUTES
    );
    const dormantCohortSize = getDormantCustomers(this.customers, 21).length;

    const analysis = await aiController.investigateDrop({
      dropPct,
      dormantCohortSize,
      eveningRevenue: current,
      baselineEveningRevenue: this.baselineEveningSales
    });
    const state = this.getBusinessState();
    const normalizedQuery = query.toLowerCase();
    const asksForItems = /\b(top|item|dish|product|menu)\b/.test(normalizedQuery);
    const hasProposal = /\b(campaign|re-engage|dormant|evening|sales|drop|recommend|promotion)\b/.test(normalizedQuery);
    const findings = [
      `Evening sales are down ${analysis.dropPct}% versus the ₹${this.baselineEveningSales.toLocaleString('en-IN')} baseline.`,
      `${analysis.dormantCohortSize} customers have been inactive for more than 21 days.`,
      `Today's revenue is ₹${state.todayRevenue.toLocaleString('en-IN')}.`
    ];

    const reply = asksForItems
      ? 'Item-level sales are not available because this account has no product or order-line data connected yet. I can still summarize revenue and customer activity.'
      : `${analysis.summary} Today's revenue is ₹${state.todayRevenue.toLocaleString('en-IN')}.`;

    return { reply, findings, hasProposal };
  }

  public async generateAndVerifyCampaign(): Promise<{
    campaign: CampaignProposal;
    policyResult: PolicyCheckResult;
  }> {
    const targetCohortSize = getDormantCustomers(this.customers, 21).length;
    const campaign = await aiController.generateCampaign(targetCohortSize);
    const policyResult = validateCampaignPolicy(campaign);
    this.campaigns.set(campaign.id, campaign);
    return { campaign, policyResult };
  }

  public verifyCampaign(campaign: CampaignProposal): PolicyCheckResult {
    return validateCampaignPolicy(campaign);
  }

  public getCampaign(id: string): CampaignProposal {
    const campaign = this.campaigns.get(id);
    if (!campaign) throw new Error('Campaign not found');
    return campaign;
  }

  public approveCampaign(id: string): CampaignProposal {
    const campaign = this.getCampaign(id);
    if (campaign.status !== 'proposed') {
      throw new Error(`Campaign can only be approved from proposed status; current status is ${campaign.status}`);
    }

    const policy = validateCampaignPolicy(campaign);
    if (!policy.isValid) throw new Error('Campaign failed policy validation');

    const approved = { ...campaign, status: 'approved' as const, approvedAt: new Date().toISOString() };
    this.campaigns.set(id, approved);
    return approved;
  }

  public rejectCampaign(id: string): CampaignProposal {
    const campaign = this.getCampaign(id);
    if (campaign.status !== 'proposed') {
      throw new Error(`Campaign can only be rejected from proposed status; current status is ${campaign.status}`);
    }

    const rejected = { ...campaign, status: 'rejected' as const };
    this.campaigns.set(id, rejected);
    return rejected;
  }

  public activateCampaign(id: string): CampaignProposal {
    const campaign = this.getCampaign(id);
    if (campaign.status !== 'approved') {
      throw new Error(`Campaign can only be activated after approval; current status is ${campaign.status}`);
    }

    const active = { ...campaign, status: 'active' as const, activatedAt: new Date().toISOString() };
    this.campaigns.set(id, active);
    return active;
  }
}

export const autopilot = new AutopilotEngine();
