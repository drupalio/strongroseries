# 016 — Despensa (Pantry Inventory)

## Why

Al hacer la lista de compras no hay forma de saber qué productos ya tienes en
casa. Esto provoca compras duplicadas y desperdicio. Una despensa digital
permite registrar existencias, ver su valor estimado, y al crear una lista de
compras saber qué ya está cubierto.

## Acceptance criteria

- Nueva tab "Despensa" en sidebar con icono `fa-warehouse`
- Tabla de items: producto, cantidad, unidad, valor estimado, fecha de alta,
  acciones (editar cantidad, eliminar)
- Botón "Agregar a despensa" que despliega un dialog con:
  - Selector de producto existente (combobox con datalist)
  - O input libre para nombre si el producto no existe
  - Cantidad (range slider + número)
  - Notas opcionales
- Al hacer clic en "Agregar a despensa" desde la vista de productos, el
  formulario se pre-rellena con el producto seleccionado
- Al crear una lista de compras, los items que ya están en la despensa muestran
  un badge "En despensa: X" con la cantidad existente
- DELETE /api/pantry/:id elimina el item y actualiza el listado
- PATCH /api/pantry/:id permite actualizar cantidad y notas
- GET /api/pantry devuelve array con todos los items (con nombre de producto y
  store info incluidos)
- Test: API endpoint devuelve 200 con array
- Test: crear item via POST devuelve 201 con el item creado
- Test: eliminar item via DELETE devuelve 200 con { ok: true }
- Test: index.html contiene `id="despensa"` section con tabla
- Test: app.js tiene función `loadPantry` que fetchea GET /api/pantry
