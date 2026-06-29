# 012 — Bugfixes

## Why

Bugs detectados durante análisis del código:

1. `exportMasterPdf()` en app.js:121 abre `/api/exports/master.xlsx` (mal,
   debería ser .pdf). Botón PDF roto.
2. `delMaster(id)` en app.js:120 hace DELETE a `/api/master-lists` (ruta no
   existe) en vez de `/api/master-lists/:month/:year`. Eliminar master roto.
3. `reconcile()` usa prompt() nativo (UX pobre).
4. `loadLists` no maneja lista vacía para itemProduct select.

## Acceptance criteria

1. Botón "Exportar PDF" descarga PDF real.
2. DELETE master usa month/year correctos.
3. reconcile usa modal en vez de prompt.
4. Sin errores en consola al cargar listas vacías.
