# Feature 001 — Deno Desktop Bootstrap

## What

Produce a standalone desktop binary from `main.ts` using `deno desktop`, so the
existing welcome page renders inside a native OS window instead of a browser
tab.

## Why

The project's stated goal is a `deno desktop` app. This feature is the bootstrap
step that proves the harness can take a scaffolded Deno server and deliver a
desktop binary, end-to-end.

## User Stories

- As a developer, I run `deno desktop main.ts` and get a binary.
- As a user, I double-click the binary and a window opens showing the
  `Welcome to Deno!` heading.

## Acceptance Criteria

- [ ] `deno --version` reports ≥ 2.9.0
- [ ] `deno desktop main.ts` exits without error
- [ ] The produced binary opens a window displaying the `Welcome to Deno!`
      heading
- [ ] `deno test` passes (existing suite unchanged)
- [ ] `Deno.serve(handler)` signature in `main.ts` remains intact

## Out of Scope

- Custom window chrome, menus, tray icons (future features).
- Cross-platform distribution packaging.
- Auto-update manifests.

## Open Questions

- [NEEDS CLARIFICATION: target platform for the first binary — macOS only, or
  macOS + Linux?]
- [NEEDS CLARIFICATION: should the window have a custom title or default
  "Deno"?]
