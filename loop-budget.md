# Loop Budget — strong groseries

> Dogfood file for the loops that maintain this repository.

## Daily limits

| Loop               | Max runs/day | Max tokens/day | Max sub-agent spawns/run |
| ------------------ | ------------ | -------------- | ------------------------ |
| Baseline Verify    | 10           | 20k            | 0                        |
| Feature Loop       | 5            | 80k            | 2 (maker + checker)      |
| Dependency Sweeper | 1            | 40k            | 0                        |

## On budget exceed

1. Pause the offending loop (set `paused: true` in `STATE.md`)
2. Append event to `loop-run-log.md`
3. Open a maintainer note in `claude-progress.md`

## Kill switch

- Flag: `paused: true` in `STATE.md`
- Resume only after the flag is cleared and `deno test` passes

## Notes

- This is a tiny project (≤ 5 source files); budgets are intentionally tight.
- Sub-agent spawns are capped at 2 per Feature Loop run (maker + checker).
- No scheduled/CI loops yet — all loops are manual until a git repo + CI exists.
