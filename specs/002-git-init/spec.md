# Feature 002 — Git Init

## What

Initialize a git repository in the project root and make the first commit,
establishing version control so future sessions have a rollback point and
worktree isolation becomes possible.

## Why

Without version control there is no safe rollback, no branch-based
experimentation, and no CI. This is foundational infrastructure for every other
feature and loop.

## User Stories

- As a developer, I run `git log` and see at least one commit.
- As a developer, I run `git status` and see a clean working tree.

## Acceptance Criteria

- [ ] `git init` succeeds in the project root
- [ ] A `.gitignore` exists excluding `.understand-anything/` and `deno.lock`
      (optional)
- [ ] `git add -A && git commit` succeeds
- [ ] `git status` reports a clean working tree
- [ ] `git log --oneline` lists at least one commit
- [ ] `deno test` passes

## Out of Scope

- Remote repository configuration (GitHub, etc.).
- Branch protection rules or CI workflows.
- Commit signing configuration.

## Open Questions

- [NEEDS CLARIFICATION: should `deno.lock` be committed or ignored? Deno
  recommends committing it for apps.]
