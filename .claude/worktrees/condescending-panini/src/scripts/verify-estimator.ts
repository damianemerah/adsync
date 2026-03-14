import { estimateBudget } from "@/lib/intelligence/estimator";
import { CAMPAIGN_OBJECTIVES } from "@/lib/constants";

console.log("--- Testing Estimator Logic ---");

const budget = 50000; // 50000 NGN

CAMPAIGN_OBJECTIVES.forEach((obj) => {
  console.log(`\nObjective: ${obj.label} (${obj.id})`);
  console.log(`Optimization Model: ${obj.optimizationModel}`);

  const estimate = estimateBudget(budget, obj.id);

  console.log(`Budget: ₦${estimate.dailyBudgetNgn}`);
  console.log(`Impressions: ${estimate.estimatedImpressions.mid}`);
  console.log(`Clicks: ${estimate.estimatedClicks.mid}`);

  if (obj.optimizationModel === "conversation") {
    console.log(`Conversations: ${estimate.estimatedConversations.mid}`);
    console.log(`Sales: ${estimate.estimatedSales.mid}`);
  } else if (obj.category === "revenue") {
    console.log(`Sales (Website): ${estimate.estimatedSales.mid}`);
  }
});
