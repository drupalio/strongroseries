# Tasks — 017 Pantry History

Execute in order.

## Phase 1: Spec & test (red)

- [ ] 1.1 Create `specs/017-pantry-history/` with spec.md, plan.md, tasks.md
- [ ] 1.2 Add feature entry to `feature_list.json` with status `in_progress`
- [ ] 1.3 Write failing tests (red phase):
  - [ ] 1.3.1 `tests/services_test.ts`:
        `PantryService: snapshotPantry creates history entries`,
        `PantryService: getHistory returns entries for period`,
        `PantryService: getHistoryPeriods returns distinct periods`
  - [ ] 1.3.2 `tests/api_test.ts`:
        `API: GET /api/pantry/history returns periods`,
        `API: GET /api/pantry/history/:year/:month returns entries`
  - [ ] 1.3.3 `tests/ui_test.ts`: `UI: history section exists in HTML`,
        `UI: app.js has loadPantryHistory`
- [ ] 1.4 Confirm tests FAIL (`deno test` → relevant tests error)

## Phase 2: Implement (green)

- [ ] 2.1 Add `PantryHistoryEntry` entity to `src/domain/entity.ts`
- [ ] 2.2 Add `PantryHistoryRepository` interface to `src/domain/repository.ts`
- [ ] 2.3 Add `CREATE TABLE pantry_history` to SCHEMA in
      `src/infrastructure/database.ts`
- [ ] 2.4 Add `PantryHistoryRepo` implementation in
      `src/infrastructure/repositories.ts`
- [ ] 2.5 Add `PantryHistoryDto` to `src/application/dto.ts`
- [ ] 2.6 Add `snapshotPantry()`, `getHistory()`, `getHistoryPeriods()` to
      `PantryService` in `src/application/services.ts`
- [ ] 2.7 Wire snapshot into `BudgetService.consolidateBudget()` and
      `reconcileBudget()`
- [ ] 2.8 Add history routes to `src/api/router.ts`
- [ ] 2.9 Wire `PantryHistoryRepo` in `src/container.ts`
- [ ] 2.10 Add history sidebar item + section to `web/index.html`
- [ ] 2.11 Add `loadPantryHistory()`, `loadPantryHistoryPeriods()`, month
      selector, data table to `web/app.js`
- [ ] 2.12 Confirm all tests PASS (`deno test` → green)

## Phase 3: AI integration

- [ ] 3.1 Extend `UserContext` in `src/ai/models.ts` with optional
      `pantryHistory`
- [ ] 3.2 Add `predictPantryConsumption()` to `ForecastEngine` in
      `src/ai/forecast.ts`
- [ ] 3.3 Update `/api/ai/forecast` to pass pantry history to engine
- [ ] 3.4 Add AI forecast test for consumption prediction
- [ ] 3.5 Confirm all tests PASS

## Phase 4: Record & close

- [ ] 4.1 Update `feature_list.json` with evidence, set status to `passing`
- [ ] 4.2 Append entry to `loop-run-log.md`
- [ ] 4.3 Update `claude-progress.md` with session record
- [ ] 4.4 `deno test` final verification
