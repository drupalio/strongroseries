# Tasks — Feature 004

Ordered, executable.

1. [x] Vendor `sql.js` wasm to `vendor/sql-wasm.wasm`; add `npm:sql.js` to
       `deno.json`.
2. [ ] Create `src/domain/dates.ts` — `yearMonth(year,month)` → `"YYYY-MM"`,
       `parseYearMonth`, `todayISO()`.
3. [ ] Create `src/domain/entity.ts` — `BaseEntity`, `Store`, `Product`,
       `GroceryList`, `GroceryItem`, `ProductPrice`, `Budget`.
4. [ ] Create `src/domain/exception.ts` — `EntityNotFoundException`,
       `ValidationException`, `DataIntegrityException`.
5. [ ] Create `src/domain/repository.ts` — interfaces for all 9 repositories.
6. [ ] Write tests `tests/domain_test.ts` (entity round-trips ported from Java
       entity tests) — RED.
7. [ ] Write tests `tests/persistence_test.ts` (schema init, seed counts, repo
       save/find/delete round-trips, EntityNotFoundException) — RED.
8. [ ] Create `src/infrastructure/database.ts` — `Database` class (sql.js
       wrapper, schema init, seed).
9. [ ] Create `src/infrastructure/repositories.ts` — 9 repository
       implementations.
10. [ ] Run `deno test` — GREEN.
11. [ ] Update `feature_list.json` (status passing + evidence),
        `claude-progress.md`, `loop-run-log.md`.
