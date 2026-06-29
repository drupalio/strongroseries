import { Database } from "../infrastructure/database.ts";
import { RecommendationEngine } from "./recommendation.ts";
import { InsightEngine } from "./insight.ts";
import { SpendingForecastEngine } from "./spending_forecast.ts";
import { PantryConsumptionEngine } from "./pantry_consumption.ts";
import { MermaRiskEngine } from "./merma_risk.ts";
import { ReorderEngine } from "./reorder.ts";
import { SemanticSearchEngine } from "./semantic.ts";
import type {
  Insight,
  ProductSuggestion,
  SearchResult,
  UnifiedForecast,
  UserContext,
} from "./models.ts";
import { defaultUserContext } from "./models.ts";
import { BudgetService, PantryService } from "../application/services.ts";

export class AIService {
  private rec: RecommendationEngine;
  private spendingForecast: SpendingForecastEngine;
  private consumption: PantryConsumptionEngine;
  private mermaRisk: MermaRiskEngine;
  private reorder: ReorderEngine;
  private semantic: SemanticSearchEngine;
  private insightEng: InsightEngine;
  private initialized = false;
  private available = false;

  constructor(private db: Database) {
    this.rec = new RecommendationEngine(db);
    this.spendingForecast = new SpendingForecastEngine(() =>
      BudgetService.spendingVersion
    );
    this.consumption = new PantryConsumptionEngine(() =>
      PantryService.historyVersion
    );
    this.mermaRisk = new MermaRiskEngine(() => PantryService.historyVersion);
    this.reorder = new ReorderEngine(
      () => PantryService.historyVersion,
      () => PantryService.pantryVersion,
    );
    this.semantic = new SemanticSearchEngine(db);
    this.insightEng = new InsightEngine(db);
  }

  initialize(): void {
    if (this.initialized) return;
    try {
      this.semantic.indexProducts();
      this.available = true;
      this.initialized = true;
    } catch {
      this.available = false;
    }
  }

  shutdown(): void {
    this.initialized = false;
    this.available = false;
  }
  isAvailable(): boolean {
    return this.available && this.initialized;
  }

  recommend(ctx: UserContext): ProductSuggestion[] {
    if (!this.isAvailable()) return [];
    try {
      return this.rec.recommend(ctx);
    } catch {
      return [];
    }
  }
  forecast(ctx: UserContext): UnifiedForecast {
    if (!this.isAvailable()) return this.emptyForecast();
    try {
      const generatedAt = new Date().toISOString();
      const historyVersion = PantryService.historyVersion;
      const spendingResult = this.spendingForecast.forecast(ctx);
      const consumptionVelocity = this.consumption.predict(ctx);
      const mermaRisk = this.mermaRisk.predict(ctx);
      const reorderRecs = this.reorder.predict(
        ctx,
        consumptionVelocity,
        mermaRisk,
      );
      return {
        generatedAt,
        historyVersion,
        predictedMonthlySpending: spendingResult.predicted,
        spendingLowerBound: spendingResult.lowerBound,
        spendingUpperBound: spendingResult.upperBound,
        spendingTrend: spendingResult.trend,
        spendingAlert: spendingResult.alert,
        categoryBreakdown: spendingResult.categoryBreakdown,
        consumptionVelocity,
        mermaRisk,
        reorderRecommendations: reorderRecs,
      };
    } catch {
      return this.emptyForecast();
    }
  }
  semanticSearch(query: string): SearchResult[] {
    return this.semanticSearchN(query, 10);
  }
  semanticSearchN(query: string, maxResults: number): SearchResult[] {
    if (!this.isAvailable()) return [];
    try {
      return this.semantic.search(query, maxResults);
    } catch {
      return [];
    }
  }
  detectAnomalies(): Insight[] {
    return this.detectAnomaliesCtx(defaultUserContext());
  }
  detectAnomaliesCtx(ctx: UserContext): Insight[] {
    if (!this.isAvailable()) return [];
    try {
      return this.insightEng.detectAnomalies(ctx);
    } catch {
      return [];
    }
  }

  private emptyForecast(): UnifiedForecast {
    return {
      generatedAt: new Date().toISOString(),
      historyVersion: 0,
      predictedMonthlySpending: 0,
      spendingLowerBound: 0,
      spendingUpperBound: 0,
      spendingTrend: 0,
      spendingAlert: "NONE",
      categoryBreakdown: {},
      consumptionVelocity: [],
      mermaRisk: [],
      reorderRecommendations: [],
    };
  }

  get recommendationEngine(): RecommendationEngine {
    return this.rec;
  }
  get forecastEngine(): SpendingForecastEngine {
    return this.spendingForecast;
  }
  get semanticSearchEngine(): SemanticSearchEngine {
    return this.semantic;
  }
  get insightEngine(): InsightEngine {
    return this.insightEng;
  }
}
