# AI Pantry Forecast — Unified Prediction System

## Problem

The current `ForecastEngine.predictPantryConsumption()` only uses `Terminado`
and `Merma` statuses from pantry history, ignoring the other 5 states (`Nuevo`,
`Comezado`, `Media vida`, `Por terminar`, `Eliminado`). The budget forecast and
pantry predictions are separate, data is reloaded on every request, and cache
invalidation is manual.

## Solution

Replace `ForecastEngine` with a modular system of **4 specialized engines**
aggregated by `AIService` into a single `UnifiedForecast` response.

---

## Architecture

```
AIService.forecast(ctx)
  ├── SpendingForecastEngine     (spending from completed lists)
  ├── PantryConsumptionEngine    (7-state transition velocity)
  ├── MermaRiskEngine            (Merma vs Terminado ratio)
  └── ReorderEngine              (stock + consumption + risk)
       → UnifiedForecast
```

Each engine has its own in-memory `Map` cache. Cache keys include a version
counter that auto-invalidates when relevant data changes.

---

## 1. SpendingForecastEngine

Extracted from the current `ForecastEngine` spending logic.

**Methods:**

- `predictNextMonthSpending(ctx, spendingVersion) → number` — linear regression
  on monthly spending from completed grocery lists (same algorithm as current)
- `getTrend(ctx, spendingVersion) → number[]` — trend line values
- `getCategoryBreakdown() → Record<string, CategoryForecast>` — current month
  spending by category

**Cache:** key = `spending:${endDate}:v${spendingVersion}`

**spendingVersion:** incremented by `BudgetService` on budget create/update and
by `GroceryListService` on list completion.

**Alerts:** same rules — CRITICAL if predicted >= 100% budget, WARNING if >=
85%, ON_TRACK if < 80% of average, NONE otherwise.

---

## 2. PantryConsumptionEngine

Uses **all 7 statuses** from `pantryHistory` to calculate consumption velocity
per product.

### Algorithm

1. Group `pantryHistory` entries by `productId`
2. For each product, sort entries chronologically by `period`
3. Detect status transitions (e.g., Nuevo→Comezado, Comezado→Media vida)
4. Calculate average time (in months) spent in each status across all
   occurrences of the same product
5. Derive `monthlyConsumptionRate` from the velocity through the
   Nuevo→...→Terminado pipeline

### Output

```typescript
interface ConsumptionVelocityEntry {
  productId: number;
  productName: string;
  avgDaysInStatus: Record<string, number>; // per status key
  monthlyConsumptionRate: number; // units/month
  estimatedDaysToEmpty: number; // for current stock
  confidence: number; // 0-1
}
```

**Cache:** key = `consumption:v${pantryHistoryVersion}`

**Fallback for new products:** use category average or default (30-day cycle).

---

## 3. MermaRiskEngine

Calculates probability that a product ends as `Merma` vs `Terminado`.

### Algorithm

1. For each product with at least one terminal entry in history:
   - `risk = mermaCount / (mermaCount + terminadoCount)`
2. For products without terminal history:
   - Use category average risk as fallback
   - Lower confidence

### Output

```typescript
interface MermaRiskEntry {
  productId: number;
  productName: string;
  category: string;
  mermaRisk: number; // 0-1
  confidence: number; // 0-1
  primaryCause: string; // most common mermaReason
  sampleSize: number; // terminal occurrence count
}
```

**Cache:** key = `mermaRisk:v${pantryHistoryVersion}`

---

## 4. ReorderEngine

Uses outputs from Consumption + Merma engines plus current `pantry_items` to
recommend restocking.

### Algorithm

1. Get active pantry items (status ≠ Eliminado)
2. For each item:
   - `adjustedRate = consumptionRate × (1 + mermaRisk)`
   - `daysUntilEmpty = currentStock / adjustedRate × 30`
   - `urgency = daysUntilEmpty < 15 ? "HIGH" : daysUntilEmpty < 30 ? "MEDIUM" : "LOW"`
   - `suggestedQty = ceil(adjustedRate)` (for 30-day supply)

### Output

```typescript
interface ReorderEntry {
  productId: number;
  productName: string;
  currentStock: number;
  unit: string;
  monthlyConsumptionRate: number;
  daysUntilEmpty: number;
  mermaRisk: number;
  reorderUrgency: "LOW" | "MEDIUM" | "HIGH";
  suggestedQuantity: number;
}
```

**Cache:** key = `reorder:v${pantryHistoryVersion}:v${pantryVersion}`

---

## 5. Unified Response

```typescript
interface UnifiedForecast {
  generatedAt: string;
  historyVersion: number;

  // Spending
  predictedMonthlySpending: number;
  spendingLowerBound: number;
  spendingUpperBound: number;
  spendingTrend: number;
  spendingAlert: BudgetAlert;
  categoryBreakdown: Record<string, CategoryForecast>;

  // Pantry
  consumptionVelocity: ConsumptionVelocityEntry[]; // top 20
  mermaRisk: MermaRiskEntry[]; // top 20 by risk
  reorderRecommendations: ReorderEntry[]; // HIGH + MEDIUM only
}
```

---

## 6. Cache Invalidation

| Version                | Incremented by                                       | Affected engines                |
| ---------------------- | ---------------------------------------------------- | ------------------------------- |
| `spendingVersion`      | `BudgetService.create()`/`update()`, list completion | SpendingForecastEngine          |
| `pantryHistoryVersion` | `PantryService.recordHistory()`                      | Consumption, MermaRisk, Reorder |
| `pantryVersion`        | `PantryService.save()`/`deleteById()`                | Reorder                         |

Versions are static counters on each service. The `AIService` reads them when
building cache keys and skips cache if any version has changed.

No TTL or manual clearing needed.

---

## 7. API Changes

**`GET /api/ai/forecast`** now returns `UnifiedForecast` instead of
`BudgetForecast`. The frontend renders the new multi-section layout. Backward
compat is not needed (single client, no public API).

**`GET /api/ai/forecast` load:** router fetches all pantry history (all
periods), spending data from repos, and current pantry items; passes everything
in context.

---

## 8. Frontend Changes

The `aiForecast` panel in `web/index.html` is redesigned from a single
`predictedTotal` display to a multi-section card layout:

1. **Spending card** — predicted total, range, alert badge (existing style)
2. **Consumption velocity** — table of top-N products with rate + days to empty
3. **Merma risk** — table of highest-risk products with cause
4. **Reorder recommendations** — table with urgency badges + suggested qty

`web/app.js` `loadAI("forecast")` is rewritten to parse `UnifiedForecast` and
render each section. Empty states for each section when no data.

---

## 9. Testing

| Engine                  | Test cases                                                       |
| ----------------------- | ---------------------------------------------------------------- |
| SpendingForecastEngine  | trend up/down/flat, < 2 months fallback, budget alert thresholds |
| PantryConsumptionEngine | set of 7 statuses, empty history, single status, full lifecycle  |
| MermaRiskEngine         | all Merma, all Terminado, mixed, category fallback, empty        |
| ReorderEngine           | full pipeline, no stock, no history fallback, urgency levels     |
| Integration             | AIService.forecast() returns complete UnifiedForecast shape      |

---

## 10. Files to change

| File                            | Change                                                     |
| ------------------------------- | ---------------------------------------------------------- |
| `src/ai/forecast.ts`            | Delete or gut — logic moves to 4 new files                 |
| `src/ai/spending_forecast.ts`   | NEW — SpendingForecastEngine                               |
| `src/ai/pantry_consumption.ts`  | NEW — PantryConsumptionEngine                              |
| `src/ai/merma_risk.ts`          | NEW — MermaRiskEngine                                      |
| `src/ai/reorder.ts`             | NEW — ReorderEngine                                        |
| `src/ai/models.ts`              | Add UnifiedForecast + new interfaces                       |
| `src/ai/ai_service.ts`          | Replace single engine with 4, manage versions              |
| `src/domain/entity.ts`          | Add static version counters to PantryService/BudgetService |
| `src/application/services.ts`   | Implement version increment in PantryService/BudgetService |
| `src/api/router.ts`             | Fetch full pantry+stock context for forecast               |
| `web/app.js`                    | Rewrite `loadAI("forecast")` renderer                      |
| `web/index.html`                | Redesign aiForecast panel layout                           |
| `tests/ai_test.ts`              | Update for new response shape + new engine tests           |
| `tests/pantry_forecast_test.ts` | NEW — dedicated test file for all 4 engines                |
