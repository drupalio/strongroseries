import { assertEquals } from "@std/assert";
import { route } from "../src/api/router.ts";
import { createContainer } from "../src/container.ts";
import { Database } from "../src/infrastructure/database.ts";

function ctx() {
  const db = new Database(":memory:");
  db.initializeSchema();
  return createContainer(db);
}

Deno.test("Search: index.html has global search input", async () => {
  const res = await route(new Request("http://localhost/"), ctx());
  const body = await res.text();
  assertEquals(
    body.includes("global-search"),
    true,
    "missing global-search input",
  );
});

Deno.test("Search: app.js has sortBy helper for table sorting", async () => {
  const res = await route(new Request("http://localhost/app/app.js"), ctx());
  const body = await res.text();
  assertEquals(
    body.includes("sortBy") || body.includes("sortTable"),
    true,
    "missing sort helper",
  );
  assertEquals(
    body.includes("th.onclick") || body.includes("addEventListener('click'") ||
      body.includes("dataset.sort"),
    true,
    "th click handler missing",
  );
});

Deno.test("Search: app.js has global search filtering across tabs", async () => {
  const res = await route(new Request("http://localhost/app/app.js"), ctx());
  const body = await res.text();
  assertEquals(
    body.includes("globalSearch") || body.includes("global-search"),
    true,
    "missing globalSearch handler",
  );
});

Deno.test("Search: API /api/search returns multi-type results", async () => {
  const c = ctx();
  // seed
  await route(
    new Request("http://localhost/api/stores", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Walmart", color: "" }),
    }),
    c,
  );
  await route(
    new Request("http://localhost/api/products", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        storeId: 1,
        storeName: "",
        name: "Leche Lacteo",
        unit: "L",
        productType: "Recurrente",
        category: "Lacteos",
        currentPrice: 10,
      }),
    }),
    c,
  );
  const res = await route(new Request("http://localhost/api/search?q=lec"), c);
  assertEquals(res.status, 200);
  const data = await res.json();
  assertEquals(
    Array.isArray(data.stores) || Array.isArray(data.products) ||
      Array.isArray(data),
    true,
  );
});
