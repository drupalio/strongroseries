# Plan 001 — Deno Desktop Bootstrap

## Technical Decision

Use `deno desktop main.ts` (built-in, no third-party frameworks). The existing
`Deno.serve(handler)` contract is exactly what `deno desktop` expects.

## Steps

1. Run `deno upgrade` to reach ≥ 2.9.
2. Confirm version: `deno --version`.
3. Run `deno desktop main.ts`.
4. Execute the produced binary and visually confirm the welcome page.
5. Run `deno test` to confirm no regression.

## Pre-Implementation Gates

### Simplicity Gate (Article VII)

- [x] No new files — uses existing `main.ts`
- [x] No future-proofing

### Anti-Abstraction Gate (Article VIII)

- [x] Uses `Deno.serve` directly, no wrapper
- [x] Single `handler` representation

### Desktop Compatibility Gate (Article IV)

- [x] `handler(req)` signature intact
- [x] No top-level side effects outside `import.meta.main`

## Risk

Deno upgrade may change runtime behavior. Mitigation: run `deno test` before and
after the upgrade; if tests break, fix before attempting `deno desktop`.
