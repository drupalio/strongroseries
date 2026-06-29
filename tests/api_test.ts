import { assertEquals } from "@std/assert";
import { handleError, route } from "../src/api/router.ts";
import { createContainer } from "../src/container.ts";
import {
  EntityNotFoundException,
  ValidationException,
} from "../src/domain/exception.ts";
import { Database } from "../src/infrastructure/database.ts";
import { currentYearMonth, yearMonth } from "../src/domain/dates.ts";

function ctx() {
  const db = new Database(":memory:");
  db.initializeSchema();
  return createContainer(db);
}

const jsonReq = (method: string, path: string, body?: unknown) =>
  new Request(`http://localhost${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

Deno.test("API: GET /health", async () => {
  const res = await route(new Request("http://localhost/health"), ctx());
  assertEquals(res.status, 200);
  assertEquals((await res.json()).status, "ok");
});

Deno.test("API: store lifecycle POST/GET/PUT/DELETE", async () => {
  const c = ctx();
  const created = await route(
    jsonReq("POST", "/api/stores", { name: "Walmart", color: "#FF0000" }),
    c,
  );
  assertEquals(created.status, 201);
  const store = await created.json();
  assertEquals(store.name, "Walmart");
  const id = store.id;

  const got = await route(new Request(`http://localhost/api/stores/${id}`), c);
  assertEquals((await got.json()).name, "Walmart");

  const updated = await route(
    jsonReq("PUT", `/api/stores/${id}`, { name: "Costco", color: "#00FF00" }),
    c,
  );
  assertEquals((await updated.json()).name, "Costco");

  const list = await route(new Request("http://localhost/api/stores"), c);
  assertEquals((await list.json()).length, 1);

  const del = await route(
    new Request(`http://localhost/api/stores/${id}`, { method: "DELETE" }),
    c,
  );
  assertEquals((await del.json()).ok, true);
});

Deno.test("API: 404 for unknown", async () => {
  const res = await route(new Request("http://localhost/nope"), ctx());
  assertEquals(res.status, 404);
});

Deno.test("API: 404 EntityNotFoundException -> 404", () => {
  const e = handleError(new EntityNotFoundException("Tienda", 99));
  assertEquals(e.status, 404);
});

Deno.test("API: ValidationException -> 400", () => {
  const e = handleError(
    new ValidationException(["nombre no puede estar vacío"]),
  );
  assertEquals(e.status, 400);
});

Deno.test("API: product + list + item flow", async () => {
  const c = ctx();
  const storeRes = await route(
    jsonReq("POST", "/api/stores", { name: "S", color: "" }),
    c,
  );
  const storeId = (await storeRes.json()).id;
  const prodRes = await route(
    jsonReq("POST", "/api/products", {
      storeId,
      storeName: "S",
      name: "Leche",
      unit: "Litro",
      productType: "Recurrente",
      category: "Lacteos",
      currentPrice: 25,
    }),
    c,
  );
  const prodId = (await prodRes.json()).id;
  assertEquals(prodRes.status, 201);

  const listRes = await route(
    jsonReq("POST", "/api/lists", {
      id: null,
      storeId,
      storeName: "S",
      name: "Abril",
      month: currentYearMonth(),
      completed: false,
      itemCount: 0,
      estimatedTotal: 0,
    }),
    c,
  );
  const listId = (await listRes.json()).id;

  const addItem = await route(
    jsonReq("POST", `/api/lists/${listId}/items`, {
      productId: prodId,
      quantity: 2,
    }),
    c,
  );
  assertEquals(addItem.status, 201);
  const items = await (await route(
    new Request(`http://localhost/api/lists/${listId}/items`),
    c,
  )).json();
  assertEquals(items.length, 1);
  assertEquals(items[0].quantity, 2);
});

Deno.test("API: budgets monthly", async () => {
  const c = ctx();
  const res = await route(new Request("http://localhost/api/budgets/2026"), c);
  const data = await res.json();
  assertEquals(data.length, 12);
});

Deno.test("API: config categories", async () => {
  const c = ctx();
  const all =
    await (await route(new Request("http://localhost/api/categories"), c))
      .json();
  assertEquals(Array.isArray(all), true);
  assertEquals(all.length > 0, true);
});

Deno.test("API: pantry lifecycle (consolidate → delete)", async () => {
  const c = ctx();
  // GET empty
  const empty =
    await (await route(new Request("http://localhost/api/pantry"), c)).json();
  assertEquals(Array.isArray(empty), true);
  assertEquals(empty.length, 0);

  // Create store + product + list + item
  const storeRes = await route(
    jsonReq("POST", "/api/stores", { name: "S", color: "" }),
    c,
  );
  const storeId = (await storeRes.json()).id;
  const prodRes = await route(
    jsonReq("POST", "/api/products", {
      storeId,
      storeName: "S",
      name: "Arroz",
      unit: "Kg",
      productType: "Recurrente",
      category: "Abarrotes",
      currentPrice: 20,
    }),
    c,
  );
  const prodId = (await prodRes.json()).id;
  const listRes = await route(
    jsonReq("POST", "/api/lists", {
      id: null,
      storeId,
      storeName: "S",
      name: "Junio",
      month: "2026-06",
      completed: false,
      itemCount: 0,
      estimatedTotal: 0,
    }),
    c,
  );
  const listId = (await listRes.json()).id;
  await route(
    jsonReq("POST", `/api/lists/${listId}/items`, {
      productId: prodId,
      quantity: 2,
    }),
    c,
  );

  // Consolidate the list into pantry
  const cons = await route(
    jsonReq("POST", "/api/pantry/consolidate", { listId }),
    c,
  );
  assertEquals(cons.status, 200);
  assertEquals((await cons.json()).ok, true);

  // GET should have the item
  const all = await (await route(new Request("http://localhost/api/pantry"), c))
    .json();
  assertEquals(all.length, 1);
  assertEquals(all[0].productName, "Arroz");
  assertEquals(all[0].quantity, 2);
  assertEquals(all[0].status, "Nuevo");
  assertEquals(all[0].nextStates.length, 4);
  const id = all[0].id;

  // PATCH: advance to "Comezado"
  const patch = await route(
    new Request(`http://localhost/api/pantry/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "Comezado" }),
    }),
    c,
  );
  assertEquals((await patch.json()).ok, true);
  const afterPatch =
    await (await route(new Request("http://localhost/api/pantry"), c)).json();
  assertEquals(afterPatch[0].status, "Comezado");

  // DELETE
  const del = await route(
    new Request(`http://localhost/api/pantry/${id}`, { method: "DELETE" }),
    c,
  );
  assertEquals((await del.json()).ok, true);

  // GET empty again
  const afterDel =
    await (await route(new Request("http://localhost/api/pantry"), c)).json();
  assertEquals(afterDel.length, 0);
});

Deno.test("API: budget consolidate auto-populates pantry", async () => {
  const c = ctx();
  const storeRes = await route(
    jsonReq("POST", "/api/stores", { name: "S", color: "" }),
    c,
  );
  const storeId = (await storeRes.json()).id;
  const prodRes = await route(
    jsonReq("POST", "/api/products", {
      storeId,
      storeName: "S",
      name: "Frijol",
      unit: "Kg",
      productType: "Recurrente",
      category: "Abarrotes",
      currentPrice: 15,
    }),
    c,
  );
  const prodId = (await prodRes.json()).id;
  const listRes = await route(
    jsonReq("POST", "/api/lists", {
      id: null,
      storeId,
      storeName: "S",
      name: "Junio",
      month: yearMonth(2026, 6),
      completed: false,
      itemCount: 0,
      estimatedTotal: 0,
    }),
    c,
  );
  const listId = (await listRes.json()).id;
  await route(
    jsonReq("POST", `/api/lists/${listId}/items`, {
      productId: prodId,
      quantity: 3,
    }),
    c,
  );

  // Consolidate budget should also add to pantry
  const cons = await route(
    jsonReq("POST", "/api/budgets/consolidate", { year: 2026, month: 6 }),
    c,
  );
  assertEquals(cons.status, 200);

  const pantry =
    await (await route(new Request("http://localhost/api/pantry"), c)).json();
  assertEquals(pantry.length, 1);
  assertEquals(pantry[0].productName, "Frijol");
  assertEquals(pantry[0].quantity, 3);
  assertEquals(pantry[0].status, "Nuevo");
});

Deno.test("API: GET /api/pantry/history returns periods list", async () => {
  const c = ctx();
  const res = await route(
    new Request("http://localhost/api/pantry/history"),
    c,
  );
  assertEquals(res.status, 200);
  const data = await res.json();
  assertEquals(Array.isArray(data), true);
});

Deno.test("API: GET /api/pantry/history/:year/:month returns entries after status change", async () => {
  const c = ctx();
  // Create store + product + list + item, then consolidate to pantry
  const storeRes = await route(
    jsonReq("POST", "/api/stores", { name: "S", color: "" }),
    c,
  );
  const storeId = (await storeRes.json()).id;
  const prodRes = await route(
    jsonReq("POST", "/api/products", {
      storeId,
      storeName: "S",
      name: "Arroz",
      unit: "Kg",
      productType: "Recurrente",
      category: "Abarrotes",
      currentPrice: 20,
    }),
    c,
  );
  const prodId = (await prodRes.json()).id;
  const listRes = await route(
    jsonReq("POST", "/api/lists", {
      id: null,
      storeId,
      storeName: "S",
      name: "Junio",
      month: "2026-06",
      completed: false,
      itemCount: 0,
      estimatedTotal: 0,
    }),
    c,
  );
  const listId = (await listRes.json()).id;
  await route(
    jsonReq("POST", `/api/lists/${listId}/items`, {
      productId: prodId,
      quantity: 2,
    }),
    c,
  );

  // Consolidate budget (triggers pantry consolidate which records "Nuevo" in history)
  await route(
    jsonReq("POST", "/api/budgets/consolidate", { year: 2026, month: 6 }),
    c,
  );

  // GET history entries for the current month
  const now = new Date();
  const ym = `${now.getFullYear()}/${now.getMonth() + 1}`;
  const histRes = await route(
    new Request(`http://localhost/api/pantry/history/${ym}`),
    c,
  );
  assertEquals(histRes.status, 200);
  const entries = await histRes.json();
  assertEquals(Array.isArray(entries), true);
  assertEquals(entries.length >= 1, true);
  assertEquals(entries[0].productName, "Arroz");
  assertEquals(entries[0].status, "Nuevo");
});

Deno.test("API: GET /api/pantry/history/:year/:month returns 400 for invalid month", async () => {
  const c = ctx();
  const res = await route(
    new Request("http://localhost/api/pantry/history/2026/13"),
    c,
  );
  assertEquals(res.status, 400);
});

Deno.test("API: AI endpoints return arrays/objects", async () => {
  const c = ctx();
  const rec =
    await (await route(new Request("http://localhost/api/ai/recommend"), c))
      .json();
  assertEquals(Array.isArray(rec), true);
  const fc =
    await (await route(new Request("http://localhost/api/ai/forecast"), c))
      .json();
  assertEquals(typeof fc.predictedMonthlySpending, "number");
  const an =
    await (await route(new Request("http://localhost/api/ai/anomalies"), c))
      .json();
  assertEquals(Array.isArray(an), true);
  const sr = await (await route(
    new Request("http://localhost/api/ai/search?q=leche"),
    c,
  )).json();
  assertEquals(Array.isArray(sr), true);
});
