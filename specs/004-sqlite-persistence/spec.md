# Feature 004 — SQLite Persistence

## WHAT

Migrate the Java persistence layer of StronGroseries to Deno/TypeScript:

- Domain entities: `Store`, `Product`, `GroceryList`, `GroceryItem`,
  `ProductPrice`, `Budget` (with `BaseEntity` semantics: `id`, `createdAt`,
  `updatedAt`, `markUpdated()`).
- Domain exceptions: `EntityNotFoundException`, `ValidationException`,
  `DataIntegrityException`.
- SQLite schema (8 tables) + seed data (units, product types, categories) —
  identical DDL to the Java `DatabaseConnection.initializeSchema()`.
- Repository implementations backed by `sql.js` (WASM SQLite, vendored):
  `StoreRepository`, `ProductRepository`, `ProductPriceRepository`,
  `GroceryListRepository`, `GroceryItemRepository`, `BudgetRepository`,
  `CategoryRepository`, `ProductTypeRepository`, `UnitRepository`.
- DB file at `groseries.db` (CWD-relative), created on first open.

## WHY

This is the foundation layer. Every higher feature (services, AI, exports, API,
UI) depends on entities and persistence. Faithful port preserves the schema so
the existing `groseries.db` from the Java app could be reused if desired.

## User Stories

- As a developer, I can create a `Store`/`Product`/... entity, set its fields,
  and read them back — mirroring the Java entity behavior.
- As a developer, I can open a SQLite database, initialize the schema, and find
  the seeded units/product types/categories present.
- As a developer, I can `save` an entity (insert when id null, update when id
  set) and retrieve it via `findById`/`findAll`.
- As a developer, `EntityNotFoundException` is thrown with a Spanish message
  containing the entity name and id.

## Acceptance Criteria

1. `deno test` passes a suite covering: each entity's field round-trip (port of
   `StoreTest`, `ProductTest`, `ProductPriceTest`), and repository round-trips
   (save → findById, findAll, delete) for at least Store, Product, GroceryList,
   GroceryItem, ProductPrice, Budget.
2. Schema initialization creates all 8 tables and seeds default units (≥24),
   product types (5), categories (≥34).
3. `YearMonth` is serialized as `"YYYY-MM"` and `LocalDate` as `"YYYY-MM-DD"`;
   booleans as 0/1; prices as REAL doubles; budget amounts as TEXT.
4. `EntityNotFoundException` message matches `"%s no encontrado con id: %s"`.
5. The DB module opens `groseries.db` for file mode and `:memory:` for test
   mode.
6. `deno test` runs with only `--allow-read` (for the vendored wasm) — no FFI,
   no net, no `--allow-all`.

## Out of Scope

- Domain services, DTOs, mappers, validator (Feature 005).
- AI engines (Feature 006).
- Exports (Feature 007).
- HTTP routes / UI.
