#!/usr/bin/env bash
set -euo pipefail

APP="strong groseries.app"
BUILD_DIR="build"
DIST_DIR="dist"

echo "=== Build Desktop Binary ==="

cd "$(dirname "$0")/.."

echo "--- Step 1: deno desktop build ---"
deno desktop --include web --allow-net --allow-env --allow-read --allow-write --allow-ffi --allow-run main.ts

echo "--- Step 2: copy to dist/ ---"
mkdir -p "$DIST_DIR"
rm -rf "$DIST_DIR/$APP"
cp -R "$BUILD_DIR/$APP" "$DIST_DIR/$APP"
cp "$BUILD_DIR/strong-groseries" "$DIST_DIR/strong-groseries"

echo "--- Step 3: verify ---"
ls -lh "$DIST_DIR/$APP"
ls -lh "$DIST_DIR/strong-groseries"

echo ""
echo "=== Done ==="
echo "App bundle: $DIST_DIR/$APP"
echo "Binary:     $DIST_DIR/strong-groseries"
