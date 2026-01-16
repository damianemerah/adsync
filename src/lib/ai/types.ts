export interface AIStrategyResult {
  interests: string[];
  suggestedLocations: string[];
  estimatedReach: number;
  copy: string[];
  headline: string[];
  reasoning: string; // "Why we chose this"
}

export interface AIInput {
  businessDescription: string;
  productType?: string;
  location?: string;
}