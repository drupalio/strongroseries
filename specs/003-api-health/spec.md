# Feature 003 — API Health Endpoint

## What

Add a `GET /health` endpoint that returns `200` with JSON `{ "status": "ok" }`,
providing a liveness probe suitable for uptime checks and load balancer
integration.

## Why

A health endpoint is the simplest behavioral addition that exercises the full
harness + loop + SDD workflow end-to-end on a real feature, without the Deno
version blocker. It also gives future desktop builds a self-check route.

## User Stories

- As a developer, I `curl /health` and get `{ "status": "ok" }`.
- As an operator, I poll `/health` to confirm the server is alive.

## Acceptance Criteria

- [ ] `GET /health` returns HTTP 200
- [ ] Response `content-type` is `application/json`
- [ ] Response body is `{ "status": "ok" }`
- [ ] A `Deno.test` in `main_test.ts` asserts this behavior
- [ ] `deno test` passes (full suite)
- [ ] `curl http://localhost:8000/health` against a running `deno task dev`
      confirms the body

## Out of Scope

- Authentication on `/health`.
- Dependency/database checks (deep health).
- Rate limiting.

## Open Questions

None — this is a fully specified trivial feature.
