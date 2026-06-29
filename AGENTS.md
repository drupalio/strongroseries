# AGENTS.md

## Stack

Deno project scaffolded via `deno init`. Entry point is `main.ts`, which exports
a `handler(req)` and only calls `Deno.serve(handler)` under `import.meta.main`.

Tests import `handler` directly (no live server) — do not start a server in test
code.

## Commands

```sh
deno task dev          # run with --watch --allow-net (dev server)
deno run --allow-net main.ts   # single run
deno test              # runs full test suite
deno task lint         # deno lint
deno task fmt          # deno fmt --check
deno task check        # deno check main.ts
deno task coverage     # deno test --coverage + deno coverage
deno task bench        # run benchmarks
```

Permissions are granted explicitly per-run (`--allow-net`); there is no global
perm config. Don't add blanket `--allow-all`.

Dependencies are declared in `deno.json` under `imports` (e.g.
`jsr:@std/assert@1`). A `deno.lock` is generated on first run and should be
committed (apps, not libs).

## Awesome Deno — reference libraries

This project follows the curated list at
https://github.com/drupalio/awesome-deno for library selection. Key adopted
libraries:

| Library   | Purpose                                               | Source               |
| --------- | ----------------------------------------------------- | -------------------- |
| `LogTape` | Structured logging (replaces console.log)             | jsr:@logtape/logtape |
| `zod`     | Runtime schema validation (replaces custom Validator) | npm:zod              |
| `hono`    | Web framework (future upgrade from custom router)     | jsr:@hono/hono       |
| `cliffy`  | CLI framework (for future admin commands)             | jsr:@cliffy/command  |
| `croner`  | Cron scheduling (for future background tasks)         | npm:croner           |
| `djwt`    | JWT (for future auth)                                 | jsr:@zaubrik/djwt    |
| `dnt`     | Deno→npm build (for distribution)                     | npm:dnt              |

### Rejected (not applicable)

- `fresh` / `ultra` — we use vanilla JS SPA, no React/Preact
- `oak` / `opine` — custom router is simpler and sufficient
- `deno_mongo` / `postgres` — we use sql.js (SQLite via WASM)
- `deno-puppeteer` — we use Playwright for browser tests

## Desktop target (intended, not yet functional)

The project's goal is a `deno desktop` app, but `deno desktop` requires Deno ≥
2.9. The installed runtime is 2.8.2. Before any `deno desktop main.ts` work,
run:

```sh
deno upgrade
```

`main.ts` already uses `Deno.serve`, which is the contract `deno desktop`
expects; keep that signature intact.

## Repo state

Git repo initialized. No CI. `deno.lock` committed.

## Feature Freeze

**Beta version** — no new features. Only bugfixes and critical fixes.

## Current State

- 91 tests pass (7 pre-existing failures unrelated to changes)
- Service Worker v3 (excluye /api/backup del caché)
- Sidebar: icono perrito 64x64 centrado
- Diálogo quick-add con recurrentes + recomendados IA al crear lista
- Badges corregidos (totales reales)

## Specification-Driven Development (SDD)

This project follows Spec Kit's specification-driven workflow. Every feature has
a spec directory under `specs/` containing:

- `spec.md` — WHAT and WHY (requirements, user stories, acceptance criteria)
- `plan.md` — technical decisions and pre-implementation gates
- `tasks.md` — ordered, executable task list

The constitution (`memory/constitution.md`) defines 9 articles that govern every
implementation. Read it before starting a feature.

### SDD workflow (run before the Feature Loop)

1. **Constitution**: confirm the feature complies with all articles (especially
   the test-first imperative — Article III).
2. **Specify**: read the feature's `specs/<NNN>/spec.md`. Resolve any
   `[NEEDS CLARIFICATION]` markers with the user before proceeding.
3. **Plan**: read `specs/<NNN>/plan.md`. Confirm pre-implementation gates pass.
4. **Tasks**: read `specs/<NNN>/tasks.md`. Execute tasks in order.
5. **Implement** (the Feature Loop from the Harness section): test-first (red →
   green) → evidence → `feature_list.json` → `loop-run-log.md`.

### Test-First imperative (Article III)

No implementation code shall be written before:

1. A test exists describing the expected behavior.
2. The test is confirmed to FAIL (red phase) or the route does not yet exist.
3. The test is reviewed against the spec's acceptance criteria.

---

## Harness operating rules

The following rules structure every agent session. They exist to prevent context
loss, premature victory claims, and unverified work.

### Startup workflow (run in order, before writing any code)

1. Read this `AGENTS.md` in full.
2. Read `claude-progress.md` to learn the current verified state and the highest
   priority unfinished feature.
3. Read `STATE.md` — if `paused: true`, STOP. Do not start any loop until the
   flag is cleared.
4. Read `feature_list.json` to see feature statuses. Pick exactly one feature
   with status `not_started` (the lowest `priority` number) and mark it
   `in_progress`. There must be only **one** `in_progress` feature at a time.
5. Run the verification baseline (the Baseline Verify loop):
   ```sh
   bash init.sh
   ```
   If the baseline fails, **STOP**. Fix the baseline before starting new work.
   Do not start a feature on top of a broken test suite.
6. Only after the baseline passes, begin the Feature Loop on the chosen feature:
   maker (implement) → checker (`deno test` + feature verification steps) →
   record evidence in `feature_list.json` → append a run entry to
   `loop-run-log.md`. Respect the daily caps in `loop-budget.md`.

### Working rules

- Work on **one feature at a time**. Do not touch features that are not the
  selected one.
- Do not declare a feature done unless the verification steps in
  `feature_list.json` for that feature pass and you have recorded evidence
  (command output, test result) in the `evidence` field.
- Keep `main.ts` exporting `handler(req)` and only calling `Deno.serve` under
  `import.meta.main`. This is the contract `deno desktop` requires.
- Do not add blanket permission flags (`--allow-all`). Always pass the minimum
  permission set (e.g. `--allow-net`).
- Do not commit unless the user explicitly asks. When committing, run
  `deno test` first and only commit if it passes.
- If you discover a new convention or gotcha that future agents would miss, add
  it to this file (above this section) or to `claude-progress.md`.

### Definition of Done (per feature)

A feature is done **only when all** of the following are true:

1. The feature's `verification` steps in `feature_list.json` all pass.
2. `deno test` passes (full suite, not just the new test).
3. The `evidence` field for the feature is filled in with the actual command
   output or a summary of the passing result.
4. The feature's `status` in `feature_list.json` is set to `passing`.
5. `claude-progress.md` has been updated with what was completed this session.
6. A run entry has been appended to `loop-run-log.md`.

If any of these is missing, the feature is **not done**. Do not mark it
`passing`.

### End-of-session routine

Before ending a session:

1. Run `deno test` one final time. If it fails, either fix it or revert to the
   last passing state.
2. Update `claude-progress.md`:
   - Add a session record (Goal, Completed, Verification run, Evidence, Commits,
     Known risks, Next best action).
   - Update "Current Verified State" if it changed.
3. Update `feature_list.json` statuses to reflect reality. Do not leave a
   feature as `in_progress` if you stopped mid-work — set it back to
   `not_started` and note the blocker in `notes`.
4. Leave the repo in a state where the next session can run `deno test` and it
   passes on the first try.
