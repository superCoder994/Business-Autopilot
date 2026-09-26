import { CampaignProposal, PolicyCheckResult } from './types';

export function validateCampaignPolicy(campaign: CampaignProposal): PolicyCheckResult {
  const rules = [
    {
      ruleName: 'Discount must be positive',
      passed: Number.isFinite(campaign.discountAmount) && campaign.discountAmount > 0,
      reason: campaign.discountAmount <= 0 ? 'Discount must be greater than ₹0' : undefined
    },
    {
      ruleName: 'Max Discount (≤ ₹100)',
      passed: Number.isFinite(campaign.discountAmount) && campaign.discountAmount <= 100,
      reason: campaign.discountAmount > 100 ? 'Discount exceeds max permitted limit of ₹100' : undefined
    },
    {
      ruleName: 'Minimum Order Value (≥ ₹250)',
      passed: Number.isFinite(campaign.minOrderValue) && campaign.minOrderValue >= 250,
      reason: campaign.minOrderValue < 250 ? 'Minimum order value must be at least ₹250' : undefined
    },
    {
      ruleName: 'Campaign duration must be positive',
      passed: Number.isInteger(campaign.durationDays) && campaign.durationDays > 0,
      reason: campaign.durationDays <= 0 ? 'Campaign duration must be at least 1 day' : undefined
    },
    {
      ruleName: 'Maximum Campaign Duration (≤ 7 Days)',
      passed: Number.isInteger(campaign.durationDays) && campaign.durationDays <= 7,
      reason: campaign.durationDays > 7 ? 'Campaign duration cannot exceed 7 days' : undefined
    },
    {
      ruleName: 'Target cohort size must be positive',
      passed: Number.isInteger(campaign.targetCohortSize) && campaign.targetCohortSize > 0,
      reason: campaign.targetCohortSize <= 0 ? 'Target cohort size must be at least 1' : undefined
    }
  ];

  return {
    isValid: rules.every(r => r.passed),
    rules
  };
}
