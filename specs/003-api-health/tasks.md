# Tasks 003 — API Health Endpoint

## Ordered Tasks

- [ ] T1: Add `Deno.test("returns ok on /health", ...)` to `main_test.ts`
- [ ] T2: Run `deno test` — confirm the new test FAILS (red phase)
- [ ] T3: Add `/health` branch to `handler` in `main.ts`
- [ ] T4: Run `deno test` — confirm ALL tests pass (green)
- [ ] T5 [OPTIONAL]: Run `deno run --allow-net main.ts`,
      `curl localhost:8000/health`
- [ ] T6: Record evidence in `feature_list.json`
- [ ] T7: Append a run entry to `loop-run-log.md`
- [ ] T8: Update `claude-progress.md`

## Parallelizable

None — strictly sequential (test-first requires red before green).

## Markers

- T2 and T4 are verification gates — do not skip them.
