# strong groseries

Minimal Deno HTTP server scaffolded with `deno init`, intended as the base for a
`deno desktop` application. The project is engineered with three layered
disciplines: **Spec-Driven Development** (specs), a **harness** (agent operating
rules), and **loop engineering** (autonomous agent loops with budget + state).

## Requirements

- Deno ≥ 2.8.2 (≥ 2.9 for `deno desktop`)

## Quick start

```sh
bash init.sh                        # type-check + tests + print start cmd
deno task dev                        # dev server with --watch --allow-net
deno run --allow-net main.ts         # single run
deno test                            # run tests (no network perms needed)
```

## Endpoints

| Method | Path   | Response                 |
| ------ | ------ | ------------------------ |
| GET    | `/`    | HTML welcome page        |
| GET    | `/api` | JSON `{ message, time }` |

## Project structure

```
main.ts                  # HTTP handler + Deno.serve entry point
main_test.ts             # Tests importing handler directly (no live server)
deno.json                # Tasks and JSR imports

# Spec-Driven Development (SDD)
memory/constitution.md   # 9 governing articles (handler-first, test-first, ...)
specs/NNN-<name>/
  spec.md                # WHAT and WHY — requirements, user stories, acceptance criteria
  plan.md                # Technical decisions + pre-implementation gates
  tasks.md               # Ordered, executable task list
feature_list.json        # Feature tracker + specs index (status, verification, evidence)

# Harness
AGENTS.md                # Agent operating rules, startup workflow, definition of done
init.sh                  # Baseline verify script (type-check + tests + start cmd)
claude-progress.md       # Session-by-session progress log

# Loop Engineering
LOOP.md                  # Active loops (Baseline Verify, Feature Loop, Dependency Sweeper, ...)
STATE.md                 # Live loop state + kill-switch (paused: false)
loop-budget.md           # Per-loop daily token/run caps
loop-run-log.md          # Append-only run history
```

## How an agent session works

1. **SDD**: read `memory/constitution.md` → read the feature's `specs/NNN/` →
   resolve `[NEEDS CLARIFICATION]` markers → plan → tasks.
2. **Harness**: `bash init.sh` baseline → pick one `not_started` feature → maker
   (implement) → checker (`deno test`) → evidence → mark `passing`.
3. **Loop**: append a run entry to `loop-run-log.md`, respect `loop-budget.md`,
   check `STATE.md` (`paused` flag).

One feature `in_progress` at a time. A feature is done only when all 6
conditions in `AGENTS.md` (Definition of Done) are met.

## Desktop target

The project's goal is a `deno desktop` app. `main.ts` uses `Deno.serve`, the
contract `deno desktop` expects. To build a desktop binary:

```sh
deno upgrade          # requires Deno ≥ 2.9
deno desktop main.ts
```

## Features

| ID  | Feature                | Priority | Status               | Spec                           |
| --- | ---------------------- | -------- | -------------------- | ------------------------------ |
| 001 | Deno Desktop Bootstrap | 1        | blocked (Deno 2.8.2) | `specs/001-desktop-bootstrap/` |
| 002 | Git Init               | 2        | not_started          | `specs/002-git-init/`          |
| 003 | API Health Endpoint    | 3        | not_started          | `specs/003-api-health/`        |

See `feature_list.json` for full verification steps and evidence.
