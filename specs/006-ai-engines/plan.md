# Plan — Feature 006

- `src/ai/models.ts` — all AI model interfaces + builders + enums.
- `src/ai/embedding.ts` — LocalEmbeddingService (singleton via module).
- `src/ai/spending.ts` + `src/ai/purchase.ts` — Sqlite-backed repos using the
  existing Database.
- `src/ai/recommendation.ts`, `src/ai/insight.ts`, `src/ai/forecast.ts`,
  `src/ai/semantic.ts` — engines.
- `src/ai/ai_service.ts` — LocalAIService facade.
- Tests in `tests/ai_test.ts` using in-memory DB seeded with completed lists.
- Drop unused executor/threading (Deno single-thread event loop; engines are
  sync).
