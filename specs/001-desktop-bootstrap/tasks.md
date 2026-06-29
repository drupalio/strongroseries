# Tasks 001 — Deno Desktop Bootstrap

## Ordered Tasks

- [ ] T1: Run `deno upgrade` and confirm `deno --version` ≥ 2.9.0
- [ ] T2: Run `deno test` to confirm baseline still green after upgrade
- [ ] T3: Run `deno desktop main.ts` and confirm a binary is produced
- [ ] T4: Execute the binary (`./main`) and confirm a window opens with the
      welcome page
- [ ] T5: Run `deno test` one final time — must pass
- [ ] T6: Record evidence in `feature_list.json` (desktop-bootstrap)
- [ ] T7: Append a run entry to `loop-run-log.md`
- [ ] T8: Update `claude-progress.md` with the session outcome

## Parallelizable

None — all tasks are strictly sequential (each depends on the previous).
