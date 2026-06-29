# 015 — Modern UI 2027 (shadcn patterns, vanilla JS)

## Why

La UI actual tiene inputs de texto plano para todo (color, fechas, categorías).
No hay sidebar, no hay command palette, no hay dropdown menus, no hay dialogs
para crear. Parece 1990. Hay que aplicar patrones de shadcn/ui 2027 en vanilla
JS: Sidebar colapsable, Command palette (Cmd+K), Dropdown Menu en filas,
Dialog/Sheet para forms, Date Picker, Color Picker nativo, Combobox (datalist),
Data Table con sort/filter/pagination, Empty States, Avatar/Initials.

## Requirements

### Elementos modernos a implementar

1. **Sidebar** colapsable (icon rail en desktop, drawer en mobile) con
   navegación + secciones agrupadas + badges de conteo.
2. **Command palette** (Cmd+K / Ctrl+K) con búsqueda fuzzy de acciones.
3. **Dropdown Menu** (⋮) en cada fila de tabla para acciones (editar, eliminar).
4. **Dialog modal** para crear/editar entidades (no inputs sueltos en línea).
5. **Date Picker** nativo input[type=date] estilizado (NO input[type=month]
   roto; usar date picker con popover calendario).
6. **Color Picker** nativo input[type=color] con preview (NO texto #RRGGBB).
7. **Combobox** (datalist) para unidad/tipo/categoría (cargar de config API).
8. **Data Table** con sort header (click), filter input por columna, pagination.
9. **Empty States** con ilustración + CTA cuando tabla vacía.
10. **Avatar/Initials** para tiendas (letra inicial + color).
11. **Badge** para estados (completado, recurrente, alerta).
12. **Tooltip** nativo title mejorado con CSS.
13. **Progress bar** para presupuesto (estimado vs real).
14. **Slider** para cantidad (range input estilizado).
15. **Toast** sonner-style (ya existe, mejorar animación).

### Acceptance criteria

- Sidebar colapsable con keyboard shortcut Cmd+B.
- Cmd+K abre command palette con navegación + acciones.
- inputs[type=color] reemplazan texto para colores.
- inputs[type=date] reemplazan texto para fechas.
- datalists para unidad/tipo/categoría (combobox).
- Dialog modal para crear store/product/list (no form inline suelto).
- Dropdown menu ⋮ en cada fila con acciones.
- Tabla con sort icons + filter input + pagination controls.
- Empty state con icono + mensaje + CTA cuando no hay datos.
- Avatar con iniciales para tiendas.
- Badge de estado en listas (completada/pendiente).
- Progress bar en presupuesto.
- Sin placeholders de texto donde haya nativo (color, date, select).
