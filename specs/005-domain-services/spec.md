# Feature 005 — Domain Services

## WHAT

Migrate the Java application layer to Deno/TS:

- DTOs: `StoreDto`, `ProductDto`, `GroceryListDto`, `GroceryItemDto`,
  `BudgetDto`, `PriceHistoryDto`, `MasterListDto`, `MasterListSummaryDto`,
  `MasterListDetailDto` (with nested `StoreItemsDto`, `ItemDetailDto`),
  `MasterListItemDto`, `ConsolidatedMasterItemDto`.
- Mappers: `ProductMapper`, `StoreMapper` (static).
- `Validator<T>` fluent accumulator → `ValidationException`.
- Utils: `UndoRedoStack<T>`, `ItemOperation`.
- Services: `StoreService`, `ProductService`, `GroceryListService`,
  `MasterListService`, `BudgetService`, `ConfigurationService` — faithful
  behavior incl. validation rules, EntityNotFoundException with Spanish entity
  names, addItem idempotency, estimatedTotal computation, reconcileBudget,
  suggestedRollover, etc.
- Fix Java technical debt: `MasterListService` store lookups go through
  `StoreRepository` (not raw SQL).

## WHY

Application layer encodes business rules and is the API the future HTTP/UI layer
will consume. Faithful port preserves the behavior contracts asserted by the
Java test suite.

## Acceptance Criteria

1. `deno task test` passes a suite that ports `StoreServiceTest` and
   `GroceryListServiceTest` assertions (using in-memory repository fakes — no
   live DB needed for service-unit tests, per Article IX preference for real I/O
   but fakes acceptable for pure logic isolation).
2. `StoreService.getStoreById(missing)` throws `EntityNotFoundException` with
   "Tienda"; `deleteStore(missing)` likewise.
3. `GroceryListService.getListById(missing)` / `deleteList(missing)` throw with
   "Lista de compras".
4. `GroceryListService.getListById` computes
   `estimatedTotal = Σ(price×quantity)` (151.00 for the Java fixture).
5. `GroceryListService.addItem` no-ops if product already in list; sets
   `priceAtPurchase` from `findCurrentByProductId`.
6. `Validator` accumulates multiple errors and throws `ValidationException` with
   all of them.
7. `StoreService.createStore` validates name not empty + max 100 chars.
8. `MasterListService.getMasterListDetail` resolves store name/color via
   `StoreRepository` (fix of Java raw-SQL leak).

## Out of Scope

- AI engines (Feature 006), exports (007), HTTP routes (008), UI (009).
