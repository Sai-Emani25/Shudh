
export enum SafetyFlag {
  RED = 'RED',       // High Hazard
  YELLOW = 'YELLOW', // Caution / Moderate Hazard
  GREEN = 'GREEN'    // Safe / Purity
}

export enum ProductCategory {
  FOOD = 'FOOD',
  COSMETICS = 'COSMETICS',
  MEDICINE = 'MEDICINE'
}

export interface IngredientAnalysis {
  name: string;
  category: string;
  hazardLevel: 'Low' | 'Moderate' | 'High' | 'Unknown';
  description: string;
  potentialRisks: string[];
  benefits: string[];
  flag: SafetyFlag;
}

export interface ProductLabel {
  title: string;
  impact: string;
  isPositive: boolean;
}

export interface NutritionalEffect {
  fact: string;
  effect: string;
  impact: 'Positive' | 'Negative' | 'Neutral';
}

export interface AnalysisResult {
  productName: string;
  category: ProductCategory;
  riskScore: number;
  scoreExplanation: string; // New field for consistency tracking
  overallFlag: SafetyFlag;
  summary: string;
  longTermEffects: string;
  ingredients: IngredientAnalysis[];
  productLabels?: ProductLabel[];
  nutritionalInsights?: NutritionalEffect[];
  verifiedSources: { title: string; uri: string; type?: 'article' | 'video' | 'research' }[];
  scannedImages?: string[];
  error?: "NOT_FOOD_OR_BLURRY" | "SEARCH_FAILED";
  errorMessage?: string;
}

export type LoadingState = 'idle' | 'category_selection' | 'scanning' | 'searching' | 'analyzing' | 'error' | 'camera';
