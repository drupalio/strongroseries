# Feature 006 — AI Engines

## WHAT

Migrate Java's local AI layer (pure heuristics — NO ONNX) to Deno/TS:

- Models: `UserContext`, `ProductSuggestion`, `BudgetForecast` (+
  `CategoryForecast`, `BudgetAlert`), `Insight` (+ `InsightType`),
  `SearchResult`.
- `SpendingRepository` + `PurchaseHistoryRepository` (SQLite-backed, query
  completed lists).
- `EmbeddingService` — TF-IDF-ish vectors with Spanish stop-words, cosine
  similarity, caching.
- `RecommendationEngine` — replenishment, frequent pairs, by-category, related
  (co-purchase).
- `InsightEngine` — price z-score, spending z-score, duplicate purchases, habit
  changes.
- `ForecastEngine` — linear regression prediction, bounds ±15%, alerts, category
  breakdown.
- `SemanticSearchEngine` — product index, intent-pattern query expansion,
  name+category scoring.
- `AIService` facade — initialize, recommend, forecast, semanticSearch,
  detectAnomalies.

## WHY

Faithful 1:1 port. All algorithms are deterministic local computations; ONNX
dependency is dropped (vestigial in Java).

## Acceptance Criteria

1. `deno task test` passes a suite covering:
   - EmbeddingService: embed non-empty, cosine similarity ranges [0,1],
     findMostSimilar sorts desc.
   - ForecastEngine: linear regression predicts increasing trend for increasing
     series; alert CRITICAL when predicted ≥ budget.
   - InsightEngine: price anomaly when one price is a clear outlier (|z|>2).
   - RecommendationEngine: replenishment suggested when last purchase > 30 days
     ago.
   - SemanticSearchEngine: index + search returns products matching query with
     score > 0.5.
   - AIService: initialize sets available;
     recommend/forecast/semanticSearch/detectAnomalies callable.
2. Spanish stop-words and category/intent keyword maps preserved exactly.
3. Caching behavior preserved (engines cache by user+date key).

## Out of Scope

Exposing AI via HTTP (Feature 008).
