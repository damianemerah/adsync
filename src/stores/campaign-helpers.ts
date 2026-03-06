import { CampaignState } from "./campaign-store";

/**
 * Validation helpers for tab navigation
 * These determine which tabs should be enabled based on current wizard state
 */

export function canAccessAudienceStep(state: CampaignState): boolean {
  return !!(state.platform && state.objective);
}

export function canAccessCreativeStep(state: CampaignState): boolean {
  return state.targetInterests.length > 0 && canAccessAudienceStep(state);
}

export function canAccessLaunchStep(state: CampaignState): boolean {
  return state.selectedCreatives.length > 0 && canAccessCreativeStep(state);
}

/**
 * Get completion percentage for progress tracking
 */
export function getWizardCompletionPercentage(state: CampaignState): number {
  let completed = 0;
  const total = 4;

  if (state.platform && state.objective) completed++;
  if (state.targetInterests.length > 0) completed++;
  if (state.selectedCreatives.length > 0) completed++;
  if (state.budget > 0 && state.campaignName) completed++;

  return Math.round((completed / total) * 100);
}
