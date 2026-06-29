# Plan — Feature 004

## Technical decisions

- **SQLite binding**: `npm:sql.js@1.14.1` (WASM, vendored at
  `vendor/sql-wasm.wasm`). Rationale: pure WASM needs only `--allow-read` (no
  FFI/net), satisfying Article IV (minimal permissions). Alternative
  `@db/sqlite` requires FFI + net download at runtime.
- **DB abstraction**: single `Database` wrapper module
  (`src/infrastructure/database.ts`) exposing `openDatabase(path)`, `exec(sql)`,
  `run(sql, params)`, `query<T>(sql, params, map)` — mirroring the Java
  `DatabaseConnection` singleton but instance-based (testable with `:memory:`).
- **Entity representation**: TypeScript classes mirroring Java POJOs (mutable,
  `markUpdated()` on setters). `BaseEntity` is an abstract class.
  `createdAt`/`updatedAt` are ISO strings (no `LocalDateTime` in TS).
- **YearMonth / LocalDate**: string utilities `"YYYY-MM"` and `"YYYY-MM-DD"` in
  `src/domain/dates.ts`.
- **Money**: `number` (Java used BigDecimal; budgets stored as TEXT parsed via
  `Number`). Acceptable fidelity for this app's scale.
- **Module layout**:
  - `src/domain/entity.ts` — all entities + BaseEntity in one file (Simplicity
    Gate, <150 lines each conceptually).
  - `src/domain/exception.ts` — 3 exceptions in one file.
  - `src/domain/repository.ts` — repository interfaces in one file.
  - `src/infrastructure/database.ts` — sql.js wrapper + schema init + seed.
  - `src/infrastructure/repositories.ts` — all 9 repository implementations in
    one file.
  - `tests/domain_test.ts`, `tests/persistence_test.ts` — split from
    main_test.ts.

## Pre-implementation gates

- [x] Constitution compliance: Article III (test-first) — tests written before
      impl. Article IV (minimal perms) — only `--allow-read`. Article V/VII
      (simplicity) — few files, no speculative abstraction.
- [x] Dependency available: `npm:sql.js@1.14.1` added to `deno.json`; wasm
      vendored.
- [x] Baseline `deno test` green before starting.

## Justification for >3 files

Entities, exceptions, repositories, database, dates, and tests are distinct
boundaries (domain vs infrastructure vs tests). Each file stays well under 150
lines. A single mega-file would exceed the simplicity gate's spirit.
