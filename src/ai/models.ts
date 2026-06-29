import type { LocalDate, YearMonth } from "../domain/dates.ts";
import { monthsAgoISO, todayISO } from "../domain/dates.ts";

export interface PantryConsumptionRecord {
  productId: number;
  productName: string;
  quantity: number;
  status: string;
  period: string;
}

export interface UserContext {
  userId: string;
  analysisStartDate: LocalDate;
  analysisEndDate: LocalDate;
  monthlyBudget: number;
  preferredStoreIds: string[];
  excludedCategories: string[];
  pantryHistory?: PantryConsumptionRecord[];
  spendingInput?: SpendingInput;
  pantryCurrentStock?: PantryStockRecord[];
}

export function defaultUserContext(): UserContext {
  return {
    userId: "default",
    analysisStartDate: monthsAgoISO(3),
    analysisEndDate: todayISO(),
    monthlyBudget: 0,
    preferredStoreIds: [],
    excludedCategories: [],
  };
}

export type SuggestionType =
  | "FREQUENT_PURCHASE"
  | "RELATED_PRODUCT"
  | "REPLENISHMENT"
  | "SEASONAL"
  | "BUNDLE";

export interface ProductSuggestion {
  productId: string;
  productName: string;
  category: string;
  storeName: string;
  confidence: number;
  reason: string;
  type: SuggestionType;
  metadata: Record<string, unknown>;
}

export type BudgetAlert = "NONE" | "WARNING" | "CRITICAL" | "ON_TRACK";

export interface CategoryForecast {
  category: string;
  predicted: number;
  lowerBound: number;
  upperBound: number;
}

export interface PantryConsumptionPrediction {
  productId: number;
  productName: string;
  monthlyConsumption: number;
  daysToFinish: number;
}

export interface BudgetForecast {
  predictedTotal: number;
  lowerBound: number;
  upperBound: number;
  variancePercent: number;
  trendPercent: number;
  alert: BudgetAlert;
  categoryBreakdown: Record<string, CategoryForecast>;
  generatedAt: string;
  pantryConsumption?: PantryConsumptionPrediction[];
}

export type InsightType =
  | "ANOMALY_PRICE"
  | "ANOMALY_PURCHASE"
  | "ANOMALY_SPENDING"
  | "HABIT_CHANGE"
  | "DUPLICATE_PURCHASE"
  | "SEASONAL_PATTERN"
  | "TREND_ALERT";

export interface Insight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  severity: number;
  entityId: string;
  entityName: string;
  details: Record<string, unknown>;
  detectedAt: string;
}

export interface SearchResult {
  productId: string;
  productName: string;
  category: string;
  relevanceScore: number;
  matchedOn: string;
  price: number;
  storeId: string; // NOTE: Java misuses this field to hold store NAME; kept for fidelity
}

export interface ScoredResult<T> {
  item: T;
  score: number;
}

export interface SpendingRecord {
  month: YearMonth;
  totalSpent: number;
  transactionCount: number;
}
export interface SpendingStats {
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  median: number;
  total: number;
}

export interface PurchaseRecord {
  productId: number;
  productName: string;
  category: string;
  storeId: number;
  storeName: string;
  price: number;
  quantity: number;
  purchaseMonth: YearMonth;
}

export interface SpendingInput {
  monthlyTotals: Record<string, number>;
  currentMonthBreakdown: Record<string, number>;
}

export interface PantryStockRecord {
  productId: number;
  productName: string;
  quantity: number;
  unit: string;
}

export interface ConsumptionVelocityEntry {
  productId: number;
  productName: string;
  avgDaysInStatus: Record<string, number>;
  monthlyConsumptionRate: number;
  estimatedDaysToEmpty: number;
  confidence: number;
}

export interface MermaRiskEntry {
  productId: number;
  productName: string;
  category: string;
  mermaRisk: number;
  confidence: number;
  primaryCause: string;
  sampleSize: number;
}

export type ReorderUrgency = "LOW" | "MEDIUM" | "HIGH";

export interface ReorderEntry {
  productId: number;
  productName: string;
  currentStock: number;
  unit: string;
  monthlyConsumptionRate: number;
  daysUntilEmpty: number;
  mermaRisk: number;
  reorderUrgency: ReorderUrgency;
  suggestedQuantity: number;
}

export interface UnifiedForecast {
  generatedAt: string;
  historyVersion: number;
  predictedMonthlySpending: number;
  spendingLowerBound: number;
  spendingUpperBound: number;
  spendingTrend: number;
  spendingAlert: BudgetAlert;
  categoryBreakdown: Record<string, CategoryForecast>;
  consumptionVelocity: ConsumptionVelocityEntry[];
  mermaRisk: MermaRiskEntry[];
  reorderRecommendations: ReorderEntry[];
}
