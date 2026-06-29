# 016 — Pantry: Plan

## Database

New table `pantry_items`:

```sql
CREATE TABLE IF NOT EXISTS pantry_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER,
  product_name TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  unit TEXT,
  notes TEXT,
  added_date TEXT DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
)
```

`product_id` is nullable because the user may type a free-text name.

## Domain

New entity `PantryItem` in `entity.ts`, new interface `PantryRepository` in
`repository.ts`.

New service `PantryService` in `application/services.ts` with:

- `getAll(): PantryItem[]`
- `add(dto): PantryItem`
- `updateQuantity(id, qty): PantryItem`
- `deleteById(id): void`

## API

```
GET    /api/pantry       → PantryItem[]
POST   /api/pantry       → PantryItem (201)
PATCH  /api/pantry/:id   → PantryItem
DELETE /api/pantry/:id   → { ok: true }
```

## UI

- New sidebar item "Despensa" (fa-warehouse) between Productos and the Compras
  section
- New content section `#despensa` with:
  - Header "Despensa" + "Agregar" button
  - Table: Producto, Cantidad, Valor Est., Agregado, Acciones
  - Empty state cuando no hay items
- Product view: each row gets an "A despensa" icon button
- List view: items already in pantry show badge

## Test strategy

- `tests/pantry_test.ts`: API tests via `route()` — CRUD endpoints
- `tests/services_test.ts`: add pantry service unit tests with fake repo
- `tests/ui_test.ts`: assert pantry section exists, loadPantry function
