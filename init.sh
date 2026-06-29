#!/usr/bin/env bash
set -euo pipefail

# init.sh — startup script for the strong groseries harness.
# Runs dependency check, lint, format, type check, tests, and prints the start command.

INSTALL_CMD="deno check main.ts"
LINT_CMD="deno task lint"
FMT_CMD="deno task fmt"
VERIFY_CMD="deno task test"
START_CMD="deno task dev"

echo "=== strong groseries init ==="
echo "PWD: $(pwd)"

echo ""
echo "--- Type check ---"
if $INSTALL_CMD; then
  echo "OK: type check passed"
else
  echo "FAIL: type check failed. Fix the baseline before starting work."
  exit 1
fi

echo ""
echo "--- Lint ---"
if $LINT_CMD; then
  echo "OK: lint passed"
else
  echo "FAIL: lint failed. Fix the baseline before starting work."
  exit 1
fi

echo ""
echo "--- Format ---"
if $FMT_CMD; then
  echo "OK: format passed"
else
  echo "FAIL: format check failed. Run 'deno fmt' to fix."
  exit 1
fi

echo ""
echo "--- Tests ---"
if $VERIFY_CMD; then
  echo "OK: tests passed"
else
  echo "FAIL: tests failed. Fix the baseline before starting work."
  exit 1
fi

echo ""
echo "--- Start command ---"
if [ "${RUN_START_COMMAND:-0}" = "1" ]; then
  echo "Launching: $START_CMD"
  exec $START_CMD
else
  echo "$START_CMD"
  echo "(set RUN_START_COMMAND=1 to auto-launch)"
fi