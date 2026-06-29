# AI Pantry Forecast Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development or superpowers:executing-plans to
> implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Replace `ForecastEngine` with 4 specialized engines (Spending,
Consumption, MermaRisk, Reorder) aggregated by `AIService` into a unified
forecast using all 7 pantry history statuses with automatic cache invalidation.

**Architecture:** AIService orchestrates 4 independent engines, each with
versioned in-memory cache. Static version counters on
PantryService/BudgetService auto-invalidate cache when data changes.

**Tech Stack:** Deno/TypeScript, sql.js, vanilla JS frontend

## Global Constraints

- All 148 existing tests must continue to pass
- No blanket `--allow-all` permissions
- `Deno.serve(handler)` signature must remain intact in `main.ts`
- No external AI dependencies (same embedding system)
- Cache invalidation via version counters, not TTL

---

### Task 1: Add UnifiedForecast and new model interfaces

**Files:**

- Modify: `src/ai/models.ts`
- Test: `tests/ai_test.ts` (existing tests reference BudgetForecast — update
  imports)

**Interfaces:**

- Consumes: nothing (base types)
- Produces: `UnifiedForecast`, `ConsumptionVelocityEntry`, `MermaRiskEntry`,
  `ReorderEntry`, `SpendingInput`

- [ ] **Step 1: Add new types to models.ts**

Append after existing `PantryConsumptionPrediction`:

```typescript
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
```

- [ ] **Step 2: Add spendingInput to UserContext**

```typescript
export interface SpendingInput {
  monthlyTotals: Record<string, number>; // { "2026-01": 100, "2026-02": 110 }
  currentMonthBreakdown: Record<string, number>; // { "Lacteos": 50 }
}
```

Update `UserContext`:

```typescript
export interface UserContext {
  // ...existing fields...
  pantryHistory?: PantryConsumptionRecord[];
  spendingInput?: SpendingInput;
}
```

- [ ] **Step 3: Run tests**

Run: `deno test --no-check --allow-read --allow-env` Expected: OK | 148 passed |
0 failed (existing interfaces unchanged)

- [ ] **Step 4: Commit**

```bash
git add src/ai/models.ts
git commit -m "feat: add UnifiedForecast and engine interface types"
```

---

### Task 2: Add version counters to services

**Files:**

- Modify: `src/application/services.ts`

**Interfaces:**

- Consumes: nothing
- Produces: `PantryService.historyVersion`, `PantryService.pantryVersion`,
  `BudgetService.spendingVersion` (static getters)

- [ ] **Step 1: Add version counters to PantryService**

Add static counter and increment calls:

```typescript
export class PantryService {
  static #historyVersion = 0;
  static #pantryVersion = 0;

  static get historyVersion(): number {
    return PantryService.#historyVersion;
  }
  static get pantryVersion(): number {
    return PantryService.#pantryVersion;
  }

  // In recordHistory:
  private recordHistory(item: PantryItem, status: PantryItemStatus): void {
    PantryService.#historyVersion++;
    // ...existing code...
  }

  // In save:
  save(item: PantryItem): PantryItem {
    PantryService.#pantryVersion++;
    // ...existing code...
  }

  // In deleteById:
  deleteById(id: number, mermaReason?: string): void {
    PantryService.#pantryVersion++;
    // ...existing code...
  }
}
```

- [ ] **Step 2: Add version counter to BudgetService**

```typescript
export class BudgetService {
  static #spendingVersion = 0;

  static get spendingVersion(): number {
    return BudgetService.#spendingVersion;
  }

  // In create/update:
  create(data: BudgetDto): Budget {
    BudgetService.#spendingVersion++;
    // ...existing code...
  }

  update(id: number, data: Partial<BudgetDto>): Budget {
    BudgetService.#spendingVersion++;
    // ...existing code...
  }
}
```

Also increment in `GroceryListService.completeList()`. Add there too.

- [ ] **Step 3: Add increment to GroceryListService.completeList**

```typescript
import { BudgetService } from "./services.ts"; // already imported

class GroceryListService {
  completeList(id: number): void {
    BudgetService.#spendingVersion++; // access via private static? No—use a public static method
    // Actually, make a public static method: BudgetService.incrementSpendingVersion()
    // ...existing code...
  }
}
```

Rather than accessing a private field cross-file, add a static method on
BudgetService:

```typescript
export class BudgetService {
  static #spendingVersion = 0;
  static get spendingVersion(): number {
    return BudgetService.#spendingVersion;
  }
  static incrementSpendingVersion(): void {
    BudgetService.#spendingVersion++;
  }
}
```

- [ ] **Step 4: Run tests**

Run: `deno test --no-check --allow-read --allow-env` Expected: OK | 148 passed |
0 failed

- [ ] **Step 5: Commit**

```bash
git add src/application/services.ts
git commit -m "feat: add version counters for cache invalidation"
```

---

### Task 3: SpendingForecastEngine

**Files:**

- Create: `src/ai/spending_forecast.ts`
- Tests added in Task 10

**Interfaces:**

- Consumes: `UserContext` with `spendingInput`
- Produces: `SpendingForecastEngine.spendingVersion`,
  `forecast(ctx) → { predicted, lowerBound, upperBound, trend, alert, categoryBreakdown }`

- [ ] **Step 1: Write the class**

```typescript
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
```

- [ ] **Step 2: Run existing tests (no new tests yet)**

Run: `deno test --no-check --allow-read --allow-env` Expected: OK | 148 passed |
0 failed (new file not imported yet)

- [ ] **Step 3: Commit**

```bash
git add src/ai/spending_forecast.ts
git commit -m "feat: SpendingForecastEngine with versioned cache"
```

---

### Task 4: PantryConsumptionEngine

**Files:**

- Create: `src/ai/pantry_consumption.ts`
- Tests added in Task 10

**Interfaces:**

- Consumes: `UserContext.pantryHistory`
- Produces: `ConsumptionVelocityEntry[]`

- [ ] **Step 1: Write the class**

```typescript
import type {
  ConsumptionVelocityEntry,
  PantryConsumptionRecord,
  UserContext,
} from "./models.ts";

export class PantryConsumptionEngine {
  private cache = new Map<string, ConsumptionVelocityEntry[]>();

  constructor(private versionProvider: () => number) {}

  predict(ctx: UserContext): ConsumptionVelocityEntry[] {
    if (!ctx.pantryHistory || ctx.pantryHistory.length === 0) return [];
    const key = `v${this.versionProvider()}`;
    const cached = this.cache.get(key);
    if (cached) return cached;

    const byProduct = new Map<number, PantryConsumptionRecord[]>();
    for (const h of ctx.pantryHistory) {
      const arr = byProduct.get(h.productId) ?? [];
      arr.push(h);
      byProduct.set(h.productId, arr);
    }

    const statusOrder = [
      "Nuevo",
      "Comezado",
      "Media vida",
      "Por terminar",
      "Terminado",
      "Merma",
      "Eliminado",
    ];
    const result: ConsumptionVelocityEntry[] = [];

    for (const [pid, entries] of byProduct) {
      const sorted = entries.sort((a, b) => a.period.localeCompare(b.period));
      const transitionMonths: number[] = [];
      let lastIdx = -1;
      let totalConsumed = 0;
      let terminalCount = 0;
      const statusDays: Record<string, number[]> = {};

      for (let i = 0; i < sorted.length; i++) {
        const e = sorted[i];
        const idx = statusOrder.indexOf(e.status);
        if (idx < 0) continue;

        if (lastIdx >= 0 && idx > lastIdx) {
          // Transition forward — price the gap in months
          if (i > 0) {
            const prev = sorted[i - 1];
            const monthsDiff = this.monthDiff(prev.period, e.period);
            if (monthsDiff > 0) transitionMonths.push(monthsDiff);
            const prevStatus = prev.status;
            (statusDays[prevStatus] ??= []).push(monthsDiff * 30);
          }
        }
        lastIdx = idx;

        if (e.status === "Terminado" || e.status === "Merma") {
          totalConsumed += e.quantity;
          terminalCount++;
        }
      }

      const numPeriods = sorted.length || 1;
      const avgTransition = transitionMonths.length > 0
        ? transitionMonths.reduce((a, b) => a + b, 0) / transitionMonths.length
        : 1;
      const monthlyConsumptionRate = totalConsumed > 0
        ? totalConsumed / numPeriods
        : 0;
      const estimatedDaysToEmpty = monthlyConsumptionRate > 0
        ? Math.round(30 / monthlyConsumptionRate)
        : 0;

      const avgDaysInStatus: Record<string, number> = {};
      for (const [s, days] of Object.entries(statusDays)) {
        avgDaysInStatus[s] = Math.round(
          days.reduce((a, b) => a + b, 0) / days.length,
        );
      }

      result.push({
        productId: pid,
        productName: sorted[0].productName,
        avgDaysInStatus,
        monthlyConsumptionRate: Math.round(monthlyConsumptionRate * 10) / 10,
        estimatedDaysToEmpty,
        confidence: Math.min(terminalCount / 3, 1),
      });
    }

    this.cache.set(key, result);
    return result.sort((a, b) =>
      b.monthlyConsumptionRate - a.monthlyConsumptionRate
    ).slice(0, 20);
  }

  clearCache(): void {
    this.cache.clear();
  }

  private monthDiff(a: string, b: string): number {
    const [y1, m1] = a.split("-").map(Number);
    const [y2, m2] = b.split("-").map(Number);
    return (y2 - y1) * 12 + (m2 - m1);
  }
}
```

- [ ] **Step 2: Run existing tests**

Run: `deno test --no-check --allow-read --allow-env` Expected: 0 failures (new
file not imported yet)

- [ ] **Step 3: Commit**

```bash
git add src/ai/pantry_consumption.ts
git commit -m "feat: PantryConsumptionEngine with 7-status transition tracking"
```

---

### Task 5: MermaRiskEngine

**Files:**

- Create: `src/ai/merma_risk.ts`
- Tests added in Task 10

**Interfaces:**

- Consumes: `UserContext.pantryHistory`
- Produces: `MermaRiskEntry[]`

- [ ] **Step 1: Write the class**

```typescript
import type {
  MermaRiskEntry,
  PantryConsumptionRecord,
  UserContext,
} from "./models.ts";

export class MermaRiskEngine {
  private cache = new Map<string, MermaRiskEntry[]>();

  constructor(private versionProvider: () => number) {}

  predict(ctx: UserContext): MermaRiskEntry[] {
    if (!ctx.pantryHistory || ctx.pantryHistory.length === 0) return [];
    const key = `v${this.versionProvider()}`;
    const cached = this.cache.get(key);
    if (cached) return cached;

    const byProduct = new Map<
      number,
      { entries: PantryConsumptionRecord[]; name: string; category: string }
    >();
    for (const h of ctx.pantryHistory) {
      const existing = byProduct.get(h.productId) ??
        {
          entries: [] as PantryConsumptionRecord[],
          name: h.productName,
          category: "",
        };
      existing.entries.push(h);
      byProduct.set(h.productId, existing);
    }

    const byCategory = new Map<
      string,
      { merma: number; terminado: number; causes: Map<string, number> }
    >();

    const result: MermaRiskEntry[] = [];
    for (const [pid, data] of byProduct) {
      let mermaCount = 0;
      let terminadoCount = 0;
      const causes = new Map<string, number>();
      for (const e of data.entries) {
        if (e.status === "Merma") {
          mermaCount++;
        } else if (e.status === "Terminado") {
          terminadoCount++;
        }
      }

      const total = mermaCount + terminadoCount;
      if (total === 0) continue;

      const risk = mermaCount / total;
      let primaryCause = "";
      let maxCause = 0;
      for (const [cause, count] of causes) {
        if (count > maxCause) {
          maxCause = count;
          primaryCause = cause;
        }
      }

      result.push({
        productId: pid,
        productName: data.name,
        category: data.category || "General",
        mermaRisk: Math.round(risk * 100) / 100,
        confidence: Math.min(total / 5, 1),
        primaryCause: primaryCause || "",
        sampleSize: total,
      });
    }

    this.cache.set(key, result);
    return result.sort((a, b) => b.mermaRisk - a.mermaRisk).slice(0, 20);
  }

  clearCache(): void {
    this.cache.clear();
  }
}
```

- [ ] **Step 2: Run existing tests**

Expected: 0 failures (new file not imported yet)

- [ ] **Step 3: Commit**

```bash
git add src/ai/merma_risk.ts
git commit -m "feat: MermaRiskEngine with product-level Merma vs Terminado ratio"
```

---

### Task 6: ReorderEngine

**Files:**

- Create: `src/ai/reorder.ts`
- Tests added in Task 10

**Interfaces:**

- Consumes: `UserContext.pantryHistory`, `UserContext.pantryCurrentStock`,
  `PantryConsumptionEngine`, `MermaRiskEngine`
- Produces: `ReorderEntry[]`

- [ ] **Step 1: Add pantryCurrentStock to UserContext**

Add to `src/ai/models.ts`:

```typescript
export interface PantryStockRecord {
  productId: number;
  productName: string;
  quantity: number;
  unit: string;
}
```

Add to `UserContext`:

```typescript
pantryCurrentStock?: PantryStockRecord[];
```

- [ ] **Step 2: Write ReorderEngine**

```typescript
import type {
  ConsumptionVelocityEntry,
  MermaRiskEntry,
  ReorderEntry,
  ReorderUrgency,
  UserContext,
} from "./models.ts";

export class ReorderEngine {
  private cache = new Map<string, ReorderEntry[]>();

  constructor(
    private historyVersionProvider: () => number,
    private pantryVersionProvider: () => number,
  ) {}

  predict(
    ctx: UserContext,
    consumptionVelocity: ConsumptionVelocityEntry[],
    mermaRisk: MermaRiskEntry[],
  ): ReorderEntry[] {
    if (!ctx.pantryCurrentStock || ctx.pantryCurrentStock.length === 0) {
      return [];
    }
    const key =
      `v${this.historyVersionProvider()}:v${this.pantryVersionProvider()}`;
    const cached = this.cache.get(key);
    if (cached) return cached;

    const consumptionMap = new Map(
      consumptionVelocity.map((c) => [c.productId, c]),
    );
    const riskMap = new Map(mermaRisk.map((r) => [r.productId, r]));

    const result: ReorderEntry[] = [];
    for (const stock of ctx.pantryCurrentStock) {
      const cons = consumptionMap.get(stock.productId);
      const risk = riskMap.get(stock.productId);
      const baseRate = cons?.monthlyConsumptionRate ?? 0.5; // default 0.5 units/month
      const riskFactor = risk ? risk.mermaRisk : 0;
      const adjustedRate = baseRate * (1 + riskFactor);
      const daysUntilEmpty = adjustedRate > 0
        ? Math.round((stock.quantity / adjustedRate) * 30)
        : 999;

      let urgency: ReorderUrgency = "LOW";
      if (daysUntilEmpty < 15) urgency = "HIGH";
      else if (daysUntilEmpty < 30) urgency = "MEDIUM";

      if (urgency === "LOW") continue; // skip LOW urgency

      result.push({
        productId: stock.productId,
        productName: stock.productName,
        currentStock: stock.quantity,
        unit: stock.unit,
        monthlyConsumptionRate: Math.round(baseRate * 10) / 10,
        daysUntilEmpty,
        mermaRisk: risk?.mermaRisk ?? 0,
        reorderUrgency: urgency,
        suggestedQuantity: Math.ceil(adjustedRate),
      });
    }

    this.cache.set(key, result);
    return result.sort((a, b) => a.daysUntilEmpty - b.daysUntilEmpty);
  }

  clearCache(): void {
    this.cache.clear();
  }
}
```

- [ ] **Step 3: Run existing tests**

Expected: 0 failures

- [ ] **Step 4: Commit**

```bash
git add src/ai/reorder.ts
git commit -m "feat: ReorderEngine with stock+consumption+risk pipeline"
```

---

### Task 7: Wire AIService with new engines

**Files:**

- Modify: `src/ai/ai_service.ts`
- Delete: `src/ai/forecast.ts` (or keep for backward compat — delete if no
  references)

**Interfaces:**

- Consumes: all 4 engines + their version providers
- Produces: `AIService.forecast(ctx) → UnifiedForecast`

- [ ] **Step 1: Update AIService**

```typescript
import { Database } from "../infrastructure/database.ts";
import { RecommendationEngine } from "./recommendation.ts";
import { InsightEngine } from "./insight.ts";
import { SpendingForecastEngine } from "./spending_forecast.ts";
import { PantryConsumptionEngine } from "./pantry_consumption.ts";
import { MermaRiskEngine } from "./merma_risk.ts";
import { ReorderEngine } from "./reorder.ts";
import { SemanticSearchEngine } from "./semantic.ts";
import type {
  BudgetForecast,
  Insight,
  ProductSuggestion,
  SearchResult,
  UnifiedForecast,
  UserContext,
} from "./models.ts";
import { defaultUserContext } from "./models.ts";
import { BudgetService, PantryService } from "../application/services.ts";
import { GroceryListService } from "../application/services.ts";

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

  private static prevHistoryVersion = -1;
  private static prevPantryVersion = -1;
  private static prevSpendingVersion = -1;

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

  // ... (keep existing initialize, shutdown, isAvailable, recommend, semanticSearch, detectAnomalies)

  forecast(ctx: UserContext): UnifiedForecast {
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
  }
}
```

- [ ] **Step 2: Remove ForecastEngine import (delete forecast.ts)**

Delete `src/ai/forecast.ts` if no other file imports it.

- [ ] **Step 3: Remove old ForecastEngine tests + add replacement**

Delete the 5 `ForecastEngine` tests (lines 72-131 in `tests/ai_test.ts`). Then
add the new `AIService.forecast` test:

**Remove these test blocks:**

- `Deno.test("ForecastEngine: predicts increasing trend for increasing series", ...)`
- `Deno.test("ForecastEngine: alert CRITICAL when predicted >= budget", ...)`
- `Deno.test("ForecastEngine: predictPantryConsumption returns empty when no history", ...)`
- `Deno.test("ForecastEngine: predictPantryConsumption uses Terminado/Merma history", ...)`
- `Deno.test("ForecastEngine: forecast includes pantryConsumption when history provided", ...)`
- `Deno.test("ForecastEngine: getTrend returns empty for <3 months", ...)`

**Remove the import:**

```typescript
import { ForecastEngine } from "../src/ai/forecast.ts";
```

**Add new test:**

```typescript
Deno.test("AIService: forecast returns UnifiedForecast with spending+pantry sections", () => {
  const db = seed();
  const ai = new AIService(db);
  ai.initialize();
  const ctx = {
    ...defaultUserContext(),
    pantryHistory: [
      {
        productId: 1,
        productName: "Leche",
        quantity: 2,
        status: "Terminado",
        period: "2026-04",
      },
      {
        productId: 2,
        productName: "Pan",
        quantity: 1,
        status: "Merma",
        period: "2026-04",
      },
    ],
  };
  const f = ai.forecast(ctx);
  assertEquals(typeof f.predictedMonthlySpending, "number");
  assertEquals(Array.isArray(f.consumptionVelocity), true);
  assertEquals(Array.isArray(f.mermaRisk), true);
  assertEquals(Array.isArray(f.reorderRecommendations), true);
});
```

- [ ] **Step 4: Run full test suite**

```bash
deno test --no-check --allow-read --allow-env 2>&1 | tail -10
```

Expected: OK | tests pass (adjust count — some old ForecastEngine tests removed)

- [ ] **Step 5: Commit**

```bash
git add src/ai/ai_service.ts tests/ai_test.ts
git rm src/ai/forecast.ts
git commit -m "feat: wire AIService with 4 new engines, replace ForecastEngine"
```

---

### Task 8: Update router to pass full context

**Files:**

- Modify: `src/api/router.ts`

**Interfaces:**

- Produces: `UserContext.spendingInput` + `UserContext.pantryCurrentStock`
  populated from DB

- [ ] **Step 1: Update the forecast route in router.ts**

Replace lines 232-242 (the current `/api/ai/forecast` handler):

```typescript
if (path === "/api/ai/forecast" && method === "GET") {
  const ctx = defaultCtx();
  // Pantry history
  const periods = c.pantry.getHistoryPeriods();
  const allHistory: any[] = [];
  for (const p of periods) allHistory.push(...c.pantry.getHistory(p));
  ctx.pantryHistory = allHistory.map((h) => ({
    productId: h.productId,
    productName: h.productName,
    quantity: h.quantity,
    status: h.status,
    period: h.period,
  }));
  // Pantry current stock (PantryItem has productId but not name/unit — look up from ProductRepo)
  const allItems = c.pantry.getAll();
  ctx.pantryCurrentStock = allItems.map((item) => {
    const prod = c.products.getProduct(item.productId);
    return {
      productId: item.productId,
      productName: prod?.name ?? "?",
      quantity: item.quantity,
      unit: prod?.unit ?? "",
    };
  });
  // Spending input
  const spendingStart = monthsAgoISO(12);
  const spendingEnd = todayISO();
  const monthlyTotals: Record<string, number> = {};
  const completedLists = c.lists.getAllLists().filter((l) => l.completed);
  for (const list of completedLists) {
    const month = list.period;
    const items = c.lists.getItems(list.id!);
    const total = items.reduce(
      (sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 1),
      0,
    );
    monthlyTotals[month] = (monthlyTotals[month] ?? 0) + total;
  }
  ctx.spendingInput = { monthlyTotals, currentMonthBreakdown: {} };
  return json(c.ai.forecast(ctx));
}
```

Add imports for `monthsAgoISO`, `todayISO` if not already there.

- [ ] **Step 2: Run existing tests**

```bash
deno test --no-check --allow-read --allow-env 2>&1 | tail -5
```

Expected: OK | all tests pass (router change doesn't break any test that doesn't
call /api/ai/forecast)

- [ ] **Step 3: Commit**

```bash
git add src/api/router.ts
git commit -m "feat: pass full pantry history + stock + spending to forecast route"
```

---

### Task 9: Frontend — redesign forecast panel

**Files:**

- Modify: `web/app.js` (rewrite `loadAI("forecast")`)
- Modify: `web/index.html` (redesign aiForecast panel)

- [ ] **Step 1: Rewrite `loadAI("forecast")` in app.js**

Replace the existing `else if (kind === "forecast")` block (lines 1122-1127):

```javascript
} else if (kind === "forecast") {
  const f = await api("/api/ai/forecast");
  const el = $("aiForecast");
  if (!el) return;
  if (f.predictedMonthlySpending <= 0 && f.consumptionVelocity.length === 0 && f.mermaRisk.length === 0 && f.reorderRecommendations.length === 0) {
    el.innerHTML = `<div class="empty-state"><i class="fas fa-chart-line"></i><h4>Sin datos</h4><p>Completa listas y usa la despensa para generar predicciones</p></div>`;
    return;
  }
  let html = ``;
  // Spending section
  if (f.predictedMonthlySpending > 0) {
    const alertClass = f.spendingAlert === "CRITICAL" ? "err" : f.spendingAlert === "WARNING" ? "warn" : "ok";
    html += `<div class="panel" style="margin-bottom:16px"><h4>💰 Gasto Mensual Proyectado</h4>
      <div style="font-size:24px;font-weight:700">$${f.predictedMonthlySpending.toFixed(2)}</div>
      <div class="muted" style="font-size:12px">Rango: $${f.spendingLowerBound.toFixed(2)} - $${f.spendingUpperBound.toFixed(2)}</div>
      <span class="badge ${alertClass}" style="margin-top:4px">${f.spendingAlert}</span>
    </div>`;
  }
  // Consumption velocity
  if (f.consumptionVelocity.length > 0) {
    html += `<div class="panel" style="margin-bottom:16px"><h4>📦 Velocidad de Consumo</h4><table class="table" style="width:100%"><thead><tr><th>Producto</th><th>Uni/mes</th><th>Días rest</th><th>Confianza</th></tr></thead><tbody>`;
    for (const c of f.consumptionVelocity) {
      html += `<tr><td>${c.productName}</td><td>${c.monthlyConsumptionRate}</td><td>${c.estimatedDaysToEmpty}</td><td><span class="badge ${c.confidence > 0.5 ? 'ok' : 'warn'}">${(c.confidence * 100).toFixed(0)}%</span></td></tr>`;
    }
    html += `</tbody></table></div>`;
  }
  // Merma risk
  if (f.mermaRisk.length > 0) {
    html += `<div class="panel" style="margin-bottom:16px"><h4>⚠️ Riesgo de Merma</h4><table class="table" style="width:100%"><thead><tr><th>Producto</th><th>Riesgo</th><th>Causa</th><th>Muestras</th></tr></thead><tbody>`;
    for (const r of f.mermaRisk) {
      const riskBadge = r.mermaRisk > 0.5 ? "err" : "warn";
      html += `<tr><td>${r.productName}</td><td><span class="badge ${riskBadge}">${(r.mermaRisk * 100).toFixed(0)}%</span></td><td>${r.primaryCause || "-"}</td><td>${r.sampleSize}</td></tr>`;
    }
    html += `</tbody></table></div>`;
  }
  // Reorder recommendations
  if (f.reorderRecommendations.length > 0) {
    html += `<div class="panel" style="margin-bottom:16px"><h4>🛒 Recomendaciones de Reorden</h4><table class="table" style="width:100%"><thead><tr><th>Producto</th><th>Stock</th><th>Consumo/mes</th><th>Días rest</th><th>Urgencia</th><th>Sugerido</th></tr></thead><tbody>`;
    for (const r of f.reorderRecommendations) {
      const urgencyBadge = r.reorderUrgency === "HIGH" ? "err" : r.reorderUrgency === "MEDIUM" ? "warn" : "ok";
      html += `<tr><td>${r.productName}</td><td>${r.currentStock} ${r.unit}</td><td>${r.monthlyConsumptionRate}</td><td>${r.daysUntilEmpty}</td><td><span class="badge ${urgencyBadge}">${r.reorderUrgency}</span></td><td>${r.suggestedQuantity}</td></tr>`;
    }
    html += `</tbody></table></div>`;
  }
  el.innerHTML = html;
```

- [ ] **Step 2: Update aiForecast panel HTML**

In `web/index.html`, find the forecast panel (around line 703) and ensure it has
enough room for the new multi-section layout. The current
`<div id="aiForecast" style="margin-top:12px"></div>` should be sufficient —
just give it a scroll container if needed:

```html
<div
  class="panel"><h3>Pronóstico</h3><button class="btn secondary" onclick="loadAI('forecast')"><i class="fas fa-sync"></i> Actualizar</button><div id="aiForecast" style="margin-top:12px;max-height:600px;overflow-y:auto"></div></div>
```

- [ ] **Step 3: Run UI tests**

```bash
deno test --no-check --allow-read --allow-env --filter "UI" 2>&1 | tail -10
```

Expected: All UI tests pass

- [ ] **Step 4: Run full test suite**

```bash
deno test --no-check --allow-read --allow-env 2>&1 | tail -5
```

Expected: OK | all tests pass

- [ ] **Step 5: Commit**

```bash
git add web/app.js web/index.html
git commit -m "feat: redesigned forecast panel with consumption, merma risk, reorder sections"
```

---

### Task 10: Comprehensive tests for all 4 engines

**Files:**

- Create: `tests/pantry_forecast_test.ts`

- [ ] **Step 1: Write SpendingForecastEngine tests**

```typescript
import { assertEquals } from "@std/assert";
import { SpendingForecastEngine } from "../src/ai/spending_forecast.ts";
import { PantryConsumptionEngine } from "../src/ai/pantry_consumption.ts";
import { MermaRiskEngine } from "../src/ai/merma_risk.ts";
import { ReorderEngine } from "../src/ai/reorder.ts";
import type { UserContext } from "../src/ai/models.ts";

Deno.test("SpendingForecastEngine: predicted > 0 with data", () => {
  let ver = 0;
  const eng = new SpendingForecastEngine(() => ver);
  const ctx: UserContext = {
    userId: "t",
    analysisStartDate: "2026-01-01",
    analysisEndDate: "2026-06-01",
    monthlyBudget: null,
    preferredStoreIds: [],
    excludedCategories: [],
    spendingInput: {
      monthlyTotals: { "2026-01": 100, "2026-02": 110, "2026-03": 120 },
      currentMonthBreakdown: { "Lacteos": 50 },
    },
  };
  const r = eng.forecast(ctx);
  assertEquals(r.predicted > 0, true);
  assertEquals(r.upperBound >= r.lowerBound, true);
});

Deno.test("SpendingForecastEngine: return zero with no input", () => {
  const eng = new SpendingForecastEngine(() => 0);
  const ctx: UserContext = {
    userId: "t",
    analysisStartDate: "2026-01-01",
    analysisEndDate: "2026-06-01",
    monthlyBudget: null,
    preferredStoreIds: [],
    excludedCategories: [],
  };
  const r = eng.forecast(ctx);
  assertEquals(r.predicted, 0);
});

Deno.test("SpendingForecastEngine: CRITICAL alert when predicted >= budget", () => {
  let ver = 0;
  const eng = new SpendingForecastEngine(() => ver);
  const ctx: UserContext = {
    userId: "t",
    analysisStartDate: "2026-01-01",
    analysisEndDate: "2026-06-01",
    monthlyBudget: 1,
    preferredStoreIds: [],
    excludedCategories: [],
    spendingInput: {
      monthlyTotals: { "2026-01": 50, "2026-02": 60 },
      currentMonthBreakdown: {},
    },
  };
  const r = eng.forecast(ctx);
  assertEquals(r.alert, "CRITICAL");
});

Deno.test("SpendingForecastEngine: cache returns same result for same version", () => {
  let ver = 0;
  const eng = new SpendingForecastEngine(() => ver);
  const ctx: UserContext = {
    userId: "t",
    analysisStartDate: "2026-01-01",
    analysisEndDate: "2026-06-01",
    monthlyBudget: null,
    preferredStoreIds: [],
    excludedCategories: [],
    spendingInput: {
      monthlyTotals: { "2026-01": 100, "2026-02": 110 },
      currentMonthBreakdown: {},
    },
  };
  const r1 = eng.forecast(ctx);
  const r2 = eng.forecast(ctx); // cached
  assertEquals(r1.predicted, r2.predicted);
});
```

- [ ] **Step 2: Write PantryConsumptionEngine tests**

```typescript
Deno.test("PantryConsumptionEngine: empty history returns []", () => {
  const eng = new PantryConsumptionEngine(() => 0);
  const ctx: UserContext = {
    userId: "t",
    analysisStartDate: "",
    analysisEndDate: "",
    monthlyBudget: null,
    preferredStoreIds: [],
    excludedCategories: [],
  };
  assertEquals(eng.predict(ctx), []);
});

Deno.test("PantryConsumptionEngine: calculates rate from Terminado/Merma entries", () => {
  let ver = 0;
  const eng = new PantryConsumptionEngine(() => ver);
  const ctx: UserContext = {
    userId: "t",
    analysisStartDate: "",
    analysisEndDate: "",
    monthlyBudget: null,
    preferredStoreIds: [],
    excludedCategories: [],
    pantryHistory: [
      {
        productId: 1,
        productName: "Leche",
        quantity: 2,
        status: "Terminado",
        period: "2026-04",
      },
      {
        productId: 1,
        productName: "Leche",
        quantity: 3,
        status: "Terminado",
        period: "2026-05",
      },
      {
        productId: 2,
        productName: "Pan",
        quantity: 1,
        status: "Merma",
        period: "2026-04",
      },
    ],
  };
  const result = eng.predict(ctx);
  assertEquals(result.length, 2);
  const leche = result.find((r) => r.productName === "Leche");
  assertEquals(leche != null, true);
  assertEquals(leche!.monthlyConsumptionRate, 2.5); // (2+3)/2
});

Deno.test("PantryConsumptionEngine: includes status transition data", () => {
  let ver = 0;
  const eng = new PantryConsumptionEngine(() => ver);
  const ctx: UserContext = {
    userId: "t",
    analysisStartDate: "",
    analysisEndDate: "",
    monthlyBudget: null,
    preferredStoreIds: [],
    excludedCategories: [],
    pantryHistory: [
      {
        productId: 1,
        productName: "Leche",
        quantity: 2,
        status: "Nuevo",
        period: "2026-04",
      },
      {
        productId: 1,
        productName: "Leche",
        quantity: 2,
        status: "Comezado",
        period: "2026-04",
      },
      {
        productId: 1,
        productName: "Leche",
        quantity: 2,
        status: "Terminado",
        period: "2026-05",
      },
    ],
  };
  const result = eng.predict(ctx);
  assertEquals(result.length, 1);
  const leche = result[0];
  assertEquals(leche.productName, "Leche");
  assertEquals(leche.monthlyConsumptionRate > 0, true);
});
```

- [ ] **Step 3: Write MermaRiskEngine tests**

```typescript
Deno.test("MermaRiskEngine: all Merma returns risk 1.0", () => {
  let ver = 0;
  const eng = new MermaRiskEngine(() => ver);
  const ctx: UserContext = {
    userId: "t",
    analysisStartDate: "",
    analysisEndDate: "",
    monthlyBudget: null,
    preferredStoreIds: [],
    excludedCategories: [],
    pantryHistory: [
      {
        productId: 1,
        productName: "Yogurt",
        quantity: 1,
        status: "Merma",
        period: "2026-04",
      },
      {
        productId: 1,
        productName: "Yogurt",
        quantity: 1,
        status: "Merma",
        period: "2026-05",
      },
    ],
  };
  const result = eng.predict(ctx);
  assertEquals(result.length, 1);
  assertEquals(result[0].mermaRisk, 1);
});

Deno.test("MermaRiskEngine: all Terminado returns risk 0", () => {
  let ver = 0;
  const eng = new MermaRiskEngine(() => ver);
  const ctx: UserContext = {
    userId: "t",
    analysisStartDate: "",
    analysisEndDate: "",
    monthlyBudget: null,
    preferredStoreIds: [],
    excludedCategories: [],
    pantryHistory: [
      {
        productId: 2,
        productName: "Pan",
        quantity: 1,
        status: "Terminado",
        period: "2026-04",
      },
    ],
  };
  const result = eng.predict(ctx);
  assertEquals(result.length, 1);
  assertEquals(result[0].mermaRisk, 0);
});

Deno.test("MermaRiskEngine: mixed returns correct ratio", () => {
  let ver = 0;
  const eng = new MermaRiskEngine(() => ver);
  const ctx: UserContext = {
    userId: "t",
    analysisStartDate: "",
    analysisEndDate: "",
    monthlyBudget: null,
    preferredStoreIds: [],
    excludedCategories: [],
    pantryHistory: [
      {
        productId: 3,
        productName: "Queso",
        quantity: 1,
        status: "Merma",
        period: "2026-01",
      },
      {
        productId: 3,
        productName: "Queso",
        quantity: 1,
        status: "Terminado",
        period: "2026-02",
      },
      {
        productId: 3,
        productName: "Queso",
        quantity: 1,
        status: "Merma",
        period: "2026-03",
      },
    ],
  };
  const result = eng.predict(ctx);
  assertEquals(result.length, 1);
  assertEquals(result[0].mermaRisk, 2 / 3);
  assertEquals(result[0].sampleSize, 3);
});
```

- [ ] **Step 4: Write ReorderEngine tests**

```typescript
Deno.test("ReorderEngine: no stock returns []", () => {
  const eng = new ReorderEngine(() => 0, () => 0);
  const ctx: UserContext = {
    userId: "t",
    analysisStartDate: "",
    analysisEndDate: "",
    monthlyBudget: null,
    preferredStoreIds: [],
    excludedCategories: [],
  };
  assertEquals(eng.predict(ctx, [], []), []);
});

Deno.test("ReorderEngine: high urgency for low stock high consumption", () => {
  const eng = new ReorderEngine(() => 0, () => 0);
  const ctx: UserContext = {
    userId: "t",
    analysisStartDate: "",
    analysisEndDate: "",
    monthlyBudget: null,
    preferredStoreIds: [],
    excludedCategories: [],
    pantryCurrentStock: [
      { productId: 1, productName: "Leche", quantity: 1, unit: "Litro" },
    ],
  };
  const result = eng.predict(ctx, [
    {
      productId: 1,
      productName: "Leche",
      monthlyConsumptionRate: 4,
      estimatedDaysToEmpty: 7,
      avgDaysInStatus: {},
      confidence: 1,
    },
  ], []);
  assertEquals(result.length, 1);
  assertEquals(result[0].reorderUrgency, "HIGH");
  assertEquals(result[0].suggestedQuantity > 0, true);
});

Deno.test("ReorderEngine: skips LOW urgency", () => {
  const eng = new ReorderEngine(() => 0, () => 0);
  const ctx: UserContext = {
    userId: "t",
    analysisStartDate: "",
    analysisEndDate: "",
    monthlyBudget: null,
    preferredStoreIds: [],
    excludedCategories: [],
    pantryCurrentStock: [
      { productId: 2, productName: "Arroz", quantity: 20, unit: "Kg" },
    ],
  };
  const result = eng.predict(ctx, [
    {
      productId: 2,
      productName: "Arroz",
      monthlyConsumptionRate: 0.5,
      estimatedDaysToEmpty: 1200,
      avgDaysInStatus: {},
      confidence: 1,
    },
  ], []);
  assertEquals(result.length, 0); // LOW urgency → filtered out
});
```

- [ ] **Step 5: Run all tests**

```bash
deno test --no-check --allow-read --allow-env 2>&1 | tail -15
```

Expected: All 148 + 14 new = 162 tests passed | 0 failed

- [ ] **Step 6: Commit**

```bash
git add tests/pantry_forecast_test.ts
git commit -m "test: comprehensive tests for all 4 forecast engines"
```
