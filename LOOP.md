# LOOP.md — Loop Engineering Reference

This file documents the loops that operate the **strong groseries** project. It
is both documentation and the seed for the loops that maintain the project.

Loop engineering replaces manual prompting with designed control systems that
orchestrate agents on a cadence, with verification and durable state.

## Active Loops

### Baseline Verify (L1 — manual / pre-session)

- Cadence: on-demand (before each session)
- Skill: `init.sh` → `deno test`
- State: `claude-progress.md` (updated after each run)
- Phase: Report-only. The loop asserts the baseline is green before any feature
  work starts. If it fails, the session STOPS.
- Handoff: any feature whose verification steps fail.

### Feature Loop (L1 — per-feature, maker/checker)

- Cadence: per `feature_list.json` entry, one at a time
- Maker: implementer agent writes code for the selected feature
- Checker: `deno test` + the feature's `verification` steps must pass
- State: `feature_list.json` (`status` → `passing` only with evidence)
- Gates: Definition of Done in `AGENTS.md` (5 conditions, all required)
- Kill switch: if tests fail and cannot be fixed in one attempt, revert and set
  the feature back to `not_started` with a blocker note.

### Dependency Sweeper (L2 — planned, not yet active)

- Cadence: 1d (future GitHub Action or manual `deno outdated`)
- Scope: patch versions of `deno.json` `imports` only
- Verifier: `deno test` must pass after bump
- Human gate: majors and runtime upgrades (e.g. Deno 2.8 → 2.9) require approval
- Phase: report-only for the first 30 days

### Deno Desktop Bootstrap (L2 — single-shot, blocked)

- Cadence: one-time, manual
- Blocker: requires `deno upgrade` to ≥ 2.9 (currently 2.8.2)
- Verifier: `deno desktop main.ts` produces a binary that opens a window
- State: `feature_list.json` → `desktop-bootstrap` (`not_started`)

## Multi-loop coordination

Priority order when multiple loops could act:

1. Baseline Verify (blocks everything if red)
2. Feature Loop (maker → checker → evidence → next feature)
3. Dependency Sweeper (off-peak, patch-only)
4. Deno Desktop Bootstrap (single-shot after upgrade)

## Worktrees

- Any code-change experiment that is not the current session's primary feature
  runs in an isolated git worktree per attempt. Discard after verifier REJECT or
  human escalation.
- The project is not yet a git repo — `git-init` (feature_list.json priority 2)
  must land before worktree isolation is meaningful.

## Budget & Observability

- Token caps: `loop-budget.md`
- Run history: `loop-run-log.md` (append one entry per feature loop iteration)
- Kill switch: set `paused: true` in `STATE.md`

## Safety & Gates

- No auto-merge (no git repo yet; when one exists, no auto-merge on main)
- Denylist: `Deno.serve(handler)` signature in `main.ts` must stay intact (the
  `deno desktop` contract)
- Never use `--allow-all`; pass the minimum permission set per run
- Live loop state: `STATE.md` at repo root

## How to run locally

```bash
bash init.sh                    # baseline verify (type-check + tests)
deno test                       # quick verification
deno task dev                   # start dev server
```

## Evolution

Target: solid L1 (report-only) across all features, then graduate the Deno
Desktop Bootstrap loop to L2 once Deno ≥ 2.9 is installed.
