# Constitution — strong groseries

> Governing principles for specification-driven development of this project.
> Inspired by Spec Kit's constitutional model (github/spec-kit).

## Article I: Handler-First Principle

Every feature in this project MUST be expressible through the `handler(req)`
contract in `main.ts`. New routes, endpoints, or behaviors are additions to
`handler`, not separate server processes. This preserves the `Deno.serve`
signature that `deno desktop` requires.

## Article II: Observable Interface

All behavior MUST be verifiable through HTTP requests and `deno test`:

- Every route returns a `Response` with an explicit `content-type` header.
- Every behavioral claim has a corresponding `Deno.test` block in `main_test.ts`
  that asserts on the response body, headers, or status.
- Tests import `handler` directly (no live server) — see `AGENTS.md`.

## Article III: Test-First Imperative

No implementation code shall be written before:

1. A test exists in `main_test.ts` describing the expected behavior.
2. The test is confirmed to FAIL (red phase) or the route does not yet exist.
3. The test is reviewed against the spec's acceptance criteria.

This inverts the default AI workflow of generating code and hoping it works.

## Article IV: Deno Desktop Compatibility (project-defined)

All code MUST remain compatible with `deno desktop`:

- `main.ts` exports `handler(req: Request): Response` and only calls
  `Deno.serve(handler)` under `import.meta.main`.
- No top-level side effects outside `import.meta.main` guard.
- Minimum permission set only (`--allow-net`); never `--allow-all`.
- Before any `deno desktop` work, the runtime must be ≥ 2.9 (`deno upgrade`).

## Article V: Single-File Simplicity (project-defined)

Until the project outgrows a single `main.ts`:

- Keep all routing logic in `handler` within `main.ts`.
- Extract to modules only when a file exceeds ~150 lines or when a clear
  boundary emerges (e.g., a data layer separate from routing).
- Prefer framework-native constructs (`Response.json`, `new Response`) over
  third-party routers until complexity justifies one.

## Article VI: Specification Before Code (project-defined)

No feature is implemented without a specification in `specs/`:

- Each feature has a `spec.md` defining WHAT and WHY (never HOW).
- Each feature has a `plan.md` defining technical decisions.
- Each feature has a `tasks.md` with executable, ordered steps.
- `feature_list.json` references the spec directory.
- The `evidence` field records that tests pass and the spec's acceptance
  criteria are met.

## Article VII: Simplicity Gate

- Maximum 3 top-level source files for initial implementation.
- Additional files require documented justification in the feature's `plan.md`.
- No speculative abstractions, interfaces, or "future-proofing" layers.

## Article VIII: Library Selection (awesome-deno)

- Library selection follows the curated list at
  https://github.com/drupalio/awesome-deno
- Prefer libraries from awesome-deno over ad-hoc custom code:
  - `LogTape` for structured logging (replaces console.log)
  - `zod` for runtime schema validation (replaces custom Validator)
  - `hono` for web framework (future upgrade from custom router)
  - `cliffy` for CLI commands
  - `croner` for cron scheduling
  - `djwt` for JWT auth
  - `dnt` for npm distribution builds
- Rejected frameworks (not applicable to this project): fresh, ultra, oak,
  opine, deno_mongo, postgres, deno-puppeteer

## Article IX: All Fields Required

Every business field in every entity, DTO, database column, and validation schema
MUST be required (non-nullable, NOT NULL). There are no optional fields:

- Entity fields use `string` not `string | null`; `number` not `number | null`.
- DTO fields use `string` not `string | null`; `number` not `number | null`.
- Database columns use `NOT NULL` always.
- Zod schemas use `.min(1)` not `.nullable().optional()`.
- Mappers and repositories pass values directly without `?? null` fallbacks.
- The only exception is `id: number | null` (null before persistence).

## Article X: Integration-First Testing

- Tests MUST exercise `handler` with real `Request` objects, not mocked I/O.
- Prefer real HTTP semantics (real `URL` parsing, real headers) over stubs.
- Contract tests (route → expected response shape) are mandatory before a
  feature's status moves to `passing`.

---

Amendment process: modifications require explicit rationale, review, and a
backwards-compatibility assessment recorded in this file.
