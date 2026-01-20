
export enum SafetyFlag {
  RED = 'RED',       // High Hazard
  YELLOW = 'YELLOW', // Caution / Moderate Hazard
  GREEN = 'GREEN'    // Safe / Purity
}

export interface IngredientAnalysis {
  name: string;
  category: string;
  hazardLevel: 'Low' | 'Moderate' | 'High' | 'Unknown';
  description: string;
  potentialRisks: string[];
  benefits: string[];
  flag: SafetyFlag;
  sources: { title: string; uri: string }[];
}

export interface NutritionalEffect {
  fact: string;
  effect: string;
  impact: 'Positive' | 'Negative' | 'Neutral';
}

export interface AnalysisResult {
  productName: string;
  riskScore: number; // 0 (Pure) to 100 (Toxic)
  overallFlag: SafetyFlag;
  summary: string;
  longTermEffects: string;
  ingredients: IngredientAnalysis[];
  nutritionalInsights: NutritionalEffect[];
  verifiedSources: { title: string; uri: string; type: 'article' | 'video' | 'research' }[];
}

export type LoadingState = 'idle' | 'scanning' | 'searching' | 'analyzing' | 'error' | 'camera';
