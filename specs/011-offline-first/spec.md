# 011 — Offline-first

## Why

GroceryGenius es offline-first (su killer feature). Para superarlo, añadimos
Service Worker + cache + optimistic UI. La app debe funcionar sin red para
lecturas ya cargadas.

## Requirements

- Service Worker cachea GET /api/* con stale-while-revalidate.
- localStorage cachea última respuesta de stores/products/lists.
- UI optimistic: al eliminar, quita del DOM inmediatamente, rollback si error.
- Indicador "offline" visible cuando navigator.offline.

## Acceptance criteria

1. SW registrado en /sw.js, cachea respuestas GET.
2. App carga lista de tiendas desde cache si fetch falla.
3. Optimistic delete en stores/products.
4. Badge "Sin conexión" visible cuando offline.
