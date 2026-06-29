# Plan 003 — API Health Endpoint

## Technical Decision

Add a `url.pathname === "/health"` branch to `handler` in `main.ts`, returning
`Response.json({ status: "ok" })`. No new files, no router, no abstraction.

## Pre-Implementation Gates

### Simplicity Gate (Article VII)

- [x] No new files — adds a branch to existing `handler`
- [x] No future-proofing (no "health check registry")

### Anti-Abstraction Gate (Article VIII)

- [x] Uses `Response.json` directly
- [x] Single `handler` representation

### Test-First Gate (Article III)

- [x] Test written BEFORE implementation
- [x] Test confirmed to FAIL before impl is added

### Desktop Compatibility Gate (Article IV)

- [x] Only modifies `handler` internals — signature intact
- [x] No new top-level side effects

## Steps

1. Add a `Deno.test` asserting `handler(new Request("http://localhost/health"))`
   returns JSON `{ status: "ok" }`.
2. Run `deno test` — confirm the new test FAILS (red).
3. Add the `/health` branch to `handler` in `main.ts`.
4. Run `deno test` — confirm all tests PASS (green).
5. Optionally `deno run --allow-net main.ts` + `curl` to confirm live.
6. Record evidence.

## File Creation Order (per constitution)

1. Test in `main_test.ts`
2. Implementation in `main.ts`
