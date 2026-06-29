# 010 — UI/UX Polish

## Why

GroceryGenius (140★, Kotlin) destaca por Material You + offline-first + UX
pulida. Para superarlo, la SPA web necesita: responsive real, accesibilidad,
dark/light toggle, toasts en lugar de alert/prompt, skeletons de carga, y
feedback visual en todas las acciones.

## Requirements

### User stories

- Como usuario, quiero un toggle dark/light que persista entre sesiones.
- Como usuario, quiero toasts elegantes en vez de alert() nativos.
- Como usuario, quiero skeletons/spinners mientras cargan datos.
- Como usuario, quiero que la app sea usable en móvil (responsive real).
- Como usuario, quiero feedback al guardar/eliminar (badge "Guardado").

### Acceptance criteria

1. Toggle dark/light persiste en localStorage.
2. Toast container en esquina inferior derecha; auto-dismiss 3s.
3. Skeleton loading state en tablas mientras fetch.
4. Layout responsive: nav colapsa a hamburger en <640px.
5. Botones de export PDF/Excel con feedback toast.
6. Sin llamadas a alert()/prompt() en app.js.
