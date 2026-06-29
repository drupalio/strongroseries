import type {
  BudgetAlert,
  CategoryForecast,
  SpendingInput,
  UserContext,
} from "./models.ts";
import { currentYearMonth } from "../domain/dates.ts";

interface SpendingResult {
  predicted: number;
  lowerBound: number;
  upperBound: number;
  trend: number;
  alert: BudgetAlert;
  categoryBreakdown: Record<string, CategoryForecast>;
}

export class SpendingForecastEngine {
  private cache = new Map<string, SpendingResult>();

  constructor(private versionProvider: () => number) {}

  forecast(ctx: UserContext): SpendingResult {
    if (!ctx.spendingInput) return this.emptyResult();
    const key = `v${this.versionProvider()}:${ctx.analysisEndDate}`;
    const cached = this.cache.get(key);
    if (cached) return cached;

    const { monthlyTotals, currentMonthBreakdown } = ctx.spendingInput;
    const values = Object.values(monthlyTotals);

    let predicted: number;
    let trend = 0;
    if (values.length < 2) {
      predicted = values.length === 1 ? values[0] : 0;
    } else if (values.length < 3) {
      predicted = values.reduce((a, b) => a + b, 0) / values.length;
    } else {
      const [intercept, slope] = linearRegression(values);
      predicted = intercept + slope * values.length;
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      trend = avg > 0 ? (slope / avg) * 100 : 0;
    }

    const variance = values.length > 1
      ? this.calcStdDev(values) / (values.reduce((a, b) =>
        a + b, 0) / values.length) *
        100
      : 0;
    const alert = this.determineAlert(predicted, values, ctx.monthlyBudget);

    const categoryBreakdown: Record<string, CategoryForecast> = {};
    for (const [cat, v] of Object.entries(currentMonthBreakdown)) {
      categoryBreakdown[cat] = {
        category: cat,
        predicted: v,
        lowerBound: v * 0.85,
        upperBound: v * 1.15,
      };
    }

    const result: SpendingResult = {
      predicted,
      lowerBound: predicted * 0.85,
      upperBound: predicted * 1.15,
      trend,
      alert,
      categoryBreakdown,
    };
    this.cache.set(key, result);
    return result;
  }

  clearCache(): void {
    this.cache.clear();
  }

  private determineAlert(
    predicted: number,
    values: number[],
    budget: number | null,
  ): BudgetAlert {
    if (budget != null && budget > 0) {
      const pct = (predicted / budget) * 100;
      if (pct >= 100) return "CRITICAL";
      if (pct >= 85) return "WARNING";
    }
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    if (predicted > avg * 1.2) return "WARNING";
    if (predicted < avg * 0.8) return "ON_TRACK";
    return "NONE";
  }

  private calcStdDev(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(
      values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length,
    );
  }

  private emptyResult(): SpendingResult {
    return {
      predicted: 0,
      lowerBound: 0,
      upperBound: 0,
      trend: 0,
      alert: "NONE",
      categoryBreakdown: {},
    };
  }
}

function linearRegression(values: number[]): [number, number] {
  const n = values.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  if (Math.abs(denom) < 1e-10) return [sumY / n, 0];
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return [intercept, slope];
}
