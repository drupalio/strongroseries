# Feature 009 — Web UI

## WHAT

Single-page web UI served by the Deno handler, replacing the Java Swing
`MainFrame`. 8 tabs mirroring the Java app: Dashboard, Tiendas, Productos,
Listas, Lista Maestra, Presupuesto, Configuración, IA Local. Uses Chart.js (CDN)
for the dashboard chart (replaces JFreeChart). FontAwesome icons via CDN.

## Acceptance Criteria

1. `GET /` returns the SPA HTML.
2. `GET /app/app.js` returns the JS bundle.
3. `deno task test` passes a test asserting `/` returns HTML containing
   "StrongGroseries" and `/app/app.js` returns JS content-type.
4. UI exercises every API endpoint:
   stores/products/lists/master/budgets/config/ai.

## Out of Scope

Offline PWA, advanced styling polish.
