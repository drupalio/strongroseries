# Plan — 017 Pantry History

## Pre-implementation gates

- [x] Deno ≥ 2.9 installed (2.9.0) — desktop-compatible.
- [x] `main.ts` exports `handler(req)`; `Deno.serve` only under
      `import.meta.main`.
- [x] Test suite passes: `deno task test` → 133 passed.
- [x] `AGENTS.md` rules understood (test-first, one feature at a time).

## Technical decisions

### 1. Data model

New table `pantry_history`:

```sql
CREATE TABLE IF NOT EXISTS pantry_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  period TEXT NOT NULL,         -- YYYY-MM
  product_id INTEGER,
  product_name TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'Nuevo',
  unit TEXT,
  store_name TEXT,
  estimated_value REAL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

- No FK to products (product can be deleted; history persists).
- `period` is denormalized for fast queries — no join needed.
- Each item in the current pantry becomes one row in the snapshot.

### 2. New entity

`PantryHistoryEntry` in `src/domain/entity.ts` — simple record with period,
product info, quantity, status, estimated value.

### 3. New repository

`PantryHistoryRepository` in `src/domain/repository.ts` + SQLite implementation
in `src/infrastructure/repositories.ts`:

- `findByPeriod(period): PantryHistoryEntry[]`
- `findAllPeriods(): string[]` — distinct periods with data
- `saveAll(entries): void` — batch insert for snapshot

### 4. Service

New method on `PantryService`:

- `snapshotPantry(period: YearMonth): void` — reads all current pantry items,
  resolves product names/prices via existing repositories, inserts into
  `pantry_history` for the given period.
- `getHistory(period: YearMonth): PantryHistoryEntry[]` — read-only.
- `getHistoryPeriods(): string[]` — list months with data.

No separate `PantryHistoryService` — add methods to `PantryService` (the pantry
is the bounded context).

### 5. Trigger point

`BudgetService.consolidateBudget()` and `reconcileBudget()` already call
`pantry.consolidateFromList()`. After that call, add:

```ts
pantry.snapshotPantry(ym);
```

### 6. API routes

- `GET /api/pantry/history` → list of periods with data
- `GET /api/pantry/history/:year/:month` → entries for that period

### 7. AI integration

`ForecastEngine` gets a new method:

- `predictPantryConsumption(ctx, productId): { monthlyConsumption: number, daysToFinish: number }`

Uses pantry history to calculate:

- How many units of a product were consumed (Terminado or Merma) per month
- Average time an item stays in each status
- Feed this into `predictNextMonthSpending()` via the `UserContext`

Since `ForecastEngine` currently only takes `UserContext`, extend `UserContext`
with optional `pantryHistory: PantryHistoryEntry[]`. The `/api/ai/forecast`
endpoint will pass pantry history to the engine.

### 8. UI

New tab "Histórico" under Despensa in the sidebar. Shows:

- Month selector (dropdown of available months)
- Data table: product, quantity, status, store, estimated value
- Summary: total items, count by status

Uses existing `loadPantry()`-style patterns. All read-only.

### 9. Schema migration

Add `pantry_history` table creation in `database.ts` SCHEMA array, wrapped in
`CREATE TABLE IF NOT EXISTS`.

## Files to modify

| File                                 | Changes                                                                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/domain/entity.ts`               | Add `PantryHistoryEntry` class                                                                                                             |
| `src/domain/repository.ts`           | Add `PantryHistoryRepository` interface                                                                                                    |
| `src/infrastructure/database.ts`     | Add `pantry_history` CREATE TABLE to SCHEMA                                                                                                |
| `src/infrastructure/repositories.ts` | Add `PantryHistoryRepo` implementation                                                                                                     |
| `src/application/dto.ts`             | Add `PantryHistoryDto`                                                                                                                     |
| `src/application/services.ts`        | Add `snapshotPantry()` / `getHistory()` / `getHistoryPeriods()` to `PantryService`; add snapshot call in `BudgetService` after consolidate |
| `src/api/router.ts`                  | Add `GET /api/pantry/history` and `GET /api/pantry/history/:year/:month`                                                                   |
| `src/container.ts`                   | Add `PantryHistoryRepo` wiring                                                                                                             |
| `src/ai/forecast.ts`                 | Accept pantry history in `UserContext`, use it for consumption prediction                                                                  |
| `src/ai/models.ts`                   | Extend `UserContext` with `pantryHistory`                                                                                                  |
| `web/index.html`                     | Add "Histórico" sidebar item and section                                                                                                   |
| `web/app.js`                         | Add `loadPantryHistory()`, `loadPantryHistoryPeriods()`, `openPantryHistory()`                                                             |
| `tests/services_test.ts`             | Test `snapshotPantry()` / `getHistory()` / `getHistoryPeriods()`                                                                           |
| `tests/api_test.ts`                  | Test history API endpoints                                                                                                                 |
| `tests/ui_test.ts`                   | Test history section in HTML + functions in app.js                                                                                         |

## AI prediction enhancement

The forecast engine will gain a `predictPantryConsumption()` method:

```ts
predictPantryConsumption(productId: number): { monthlyRate: number; daysToFinish: number }
```

Logic:

1. From pantry history, find all entries for `productId` that have status
   "Terminado" or "Merma" in past months.
2. Group by month → count consumed per month → average = monthlyRate.
3. Find current pantry items with this productId → average quantity.
4. daysToFinish = (current quantity / monthlyRate) × 30.

This feeds into `/api/ai/forecast` response.
