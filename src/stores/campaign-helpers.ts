import { CampaignState } from "./campaign-store";

/**
 * Validation helpers for tab navigation
 * These determine which tabs should be enabled based on current wizard state
 */

export function canAccessAudienceStep(state: CampaignState): boolean {
  return !!(state.platform && state.objective);
}

export function canAccessExtraStep(state: CampaignState): boolean {
  if (state.objective === "app_promotion") {
    return !!state.objective; // just need objective selected
  }
  if (state.objective === "leads") {
    return state.targetInterests.length > 0 && canAccessAudienceStep(state);
  }
  return false;
}

export function canAccessCreativeStep(state: CampaignState): boolean {
  const baseReady =
    state.targetInterests.length > 0 && canAccessAudienceStep(state);
  if (state.objective === "app_promotion") {
    return baseReady && !!state.metaApplicationId;
  }
  if (state.objective === "leads") {
    // Must have either an existing form ID or an AI-suggested form ready
    return baseReady && !!(state.leadGenFormId || state.suggestedLeadForm);
  }
  return baseReady;
}

export function canAccessLaunchStep(state: CampaignState): boolean {
  const baseReady =
    state.selectedCreatives.length > 0 && canAccessCreativeStep(state);
  if (state.objective === "leads") {
    return baseReady && !!(state.leadGenFormId || state.suggestedLeadForm);
  }
  return baseReady;
}

/**
 * Get completion percentage for progress tracking
 */
export function getWizardCompletionPercentage(state: CampaignState): number {
  let completed = 0;
  const total = 4;

  if (state.platform && state.objective) completed++;

  const audienceReady = state.targetInterests.length > 0;
  const leadFormReady =
    state.objective !== "leads" ||
    !!(state.leadGenFormId || state.suggestedLeadForm);
  if (audienceReady && leadFormReady) completed++;

  if (state.selectedCreatives.length > 0) completed++;
  if (state.budget > 0 && state.campaignName) completed++;

  return Math.round((completed / total) * 100);
}
