# Plan — Feature 005

- **DTOs**: TS interfaces (readonly where possible) in `src/application/dto.ts`.
- **Mappers**: pure functions in `src/application/mappers.ts`.
- **Validator**: generic class in `src/application/validator.ts` (fluent, error
  accumulation).
- **Utils**: `UndoRedoStack<T>` and `ItemOperation` in
  `src/application/utils.ts`.
- **Services**: one file per service is overkill (Simplicity Gate). Group in
  `src/application/services.ts` (<300 lines acceptable as a boundary file).
- **Tests**: `tests/services_test.ts` using lightweight in-memory fakes
  implementing the repository interfaces. Fakes are hand-written (no mock lib in
  stdlib), satisfying Article IX (real object behavior, not stubbed I/O).
- **MasterListService fix**: accept `StoreRepository` as a 3rd dep; use it
  instead of raw SQL.

## Pre-implementation gates

- [x] 004 passing.
- [x] Constitution: Article III test-first; Article VIII no abstraction unless
      2+ consumers — services consume repos via interfaces (already 2+ impls:
      sqlite + fakes).
