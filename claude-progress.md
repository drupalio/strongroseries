# Claude Progress

## Current Verified State

- **Feature freeze** — no new features. Beta version.
- Pantry history with marble diagram visualization
- AI forecast engine with consumption velocity
- Productos recurrentes ocultan ya-agregados del selector
- Click en cantidad abre diálogo para número exacto
- Badges corregidos (totales reales, no filtrados)
- Diálogo quick-add al crear lista (recurrentes + recomendados IA)
- Sidebar: icono perrito 64x64 centrado, sin texto
- Service Worker v3 (excluye /api/backup del caché)
- 91 tests pass (7 fallos pre-existentes por READABLE_STREAM env)

## Completed Features

1. **001-hello-world**: Basic scaffold with `main.ts` handler + `Deno.serve`
2. **002-git-init**: Git repo initialized
3. **003-health-check**: GET /health → 200
4. **004-grocery-crud-full**: Full CRUD for lists, items, products, stores,
   master list
5. **005-pwa-sw**: Service worker + offline page + manifest
6. **006-dark-theme**: Dark/light theme toggle
7. **007-ui-sidebar**: Sidebar navigation with responsive hamburger
8. **008-reconcile**: Budget reconciliation with modal
9. **009-master-export**: Export master list to XLSX/PDF
10. **010-ai-features**: AI features (forecast, suggestions, savings) with
    sidebar toggle and empty states
11. **011-ui-prices**: Price history tab, product detail price list, add-price
    modal
12. **012-pantry**: Pantry table, consolidateFromList, status advancement
    (forward/Merma), deleteById
13. **013-budget-crud**: Budget CRUD (create, read, update, delete) via
    /api/budgets
14. **014-unit-type-config**: Configuration service for custom units, types,
    categories
15. **015-product-detail-overlay**: Product detail overlay/panel with price
    history, total spent, store info
16. **016-ai-locator**: Local price/product/savings lookup via in-process LLM
    (deepseek-coder-1.5b-instruct via Ollama) — `/api/ai/locator` route
17. **017-pantry-history**: Pantry history feature with marble diagram
    visualization

## In Progress

- (none — feature freeze)

## Session History

### 2026-06-29 (Session 4 — Bugfixes)

- **Type**: Bugfixes
- **Fixes**:
  - `api()` ahora verifica `response.ok` y lanza error (antes tragaba errores silenciosamente)
  - `addPrice()` con try/catch y toast de error
  - Handler global `unhandledrejection` para errores de API
  - **Causa raíz: `lastInsertRowId` siempre devolvía 0** porque `persist()` perdía el estado interno de sql.js. Reemplazado por `INSERT ... RETURNING id` en todos los repositorios
  - Quick-add dialog: pasaba `listId` explícito en vez de depender de `selectedListId` (se reseteaba a null por `loadLists()`)
  - Quick-add: productos agregados se eliminan del DOM del diálogo
  - Validación: no se permiten listas en meses pasados (`dto.month >= currentYearMonth()`)
  - Backup: guarda en raíz como `_YYYY-MM-DD_HH-mm.db` (desde memoria, no desde archivo)
  - Restore: lista backups agrupados por día con datepicker para filtrar, seleccionas y restaura
  - Restore: ya no usa `<input type="file">` (no funciona en Deno Desktop)
  - Eliminar lista maestra: solo `confirm()` nativo, sin diálogo extra
  - Detalle de lista maestra: eliminado "Total general: $0.00"
- **Verification**: 91 tests pass (7 pre-existing failures unrelated)
- **Evidence**: `deno test` → 91 passed, 7 failed (READABLE_STREAM env)
- **Notes**: Feature freeze. Solo bugfixes críticos.
