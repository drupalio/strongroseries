import { assertEquals } from "@std/assert";
import { route } from "../src/api/router.ts";
import { createContainer } from "../src/container.ts";
import { Database } from "../src/infrastructure/database.ts";

function ctx() {
  const db = new Database(":memory:");
  db.initializeSchema();
  return createContainer(db);
}

Deno.test("UI: index.html has dark/light theme toggle", async () => {
  const res = await route(new Request("http://localhost/"), ctx());
  const body = await res.text();
  assertEquals(body.includes("theme-toggle"), true, "missing theme-toggle id");
  assertEquals(body.includes("--background:"), true, "missing :root tokens");
  assertEquals(body.includes(".light"), true, "missing .light theme override");
});

Deno.test("UI: index.html has toast container", async () => {
  const res = await route(new Request("http://localhost/"), ctx());
  const body = await res.text();
  assertEquals(
    body.includes("toast-container"),
    true,
    "missing toast-container",
  );
});

Deno.test("UI: index.html has responsive nav (hamburger)", async () => {
  const res = await route(new Request("http://localhost/"), ctx());
  const body = await res.text();
  assertEquals(
    body.includes("nav-toggle") || body.includes("sidebar-toggle"),
    true,
    "missing nav-toggle or sidebar-toggle",
  );
  assertEquals(
    body.includes("@media (max-width: 768px)") ||
      body.includes("@media (max-width: 640px)"),
    true,
    "missing mobile media query",
  );
});

Deno.test("UI: index.html has skeleton class", async () => {
  const res = await route(new Request("http://localhost/"), ctx());
  const body = await res.text();
  assertEquals(body.includes(".skeleton"), true, "missing .skeleton class");
});

Deno.test("UI: app.js has toast() function, no alert()/prompt()", async () => {
  const res = await route(new Request("http://localhost/app/app.js"), ctx());
  const body = await res.text();
  assertEquals(
    body.includes("function toast"),
    true,
    "missing toast() function",
  );
  assertEquals(
    body.includes("alert("),
    false,
    "alert() still present — must use toast()",
  );
  assertEquals(
    body.includes("prompt("),
    false,
    "prompt() still present — must use modal/toast()",
  );
});

Deno.test("UI: app.js exportMasterPdf points to .pdf", async () => {
  const res = await route(new Request("http://localhost/app/app.js"), ctx());
  const body = await res.text();
  assertEquals(
    body.includes("export-open"),
    true,
    "export-open endpoints present",
  );
  assertEquals(body.includes("exportMasterPdf"), true);
  // Isolate the exportMasterPdf function body (up to the next top-level function/exportMasterXlsx)
  const start = body.indexOf("function exportMasterPdf");
  const end = body.indexOf("function exportMasterXlsx", start);
  const fnBody = body.slice(start, end);
  assertEquals(
    /pdf/.test(fnBody),
    true,
    "exportMasterPdf should open .pdf URL",
  );
  assertEquals(
    /xlsx/.test(fnBody),
    false,
    "exportMasterPdf must NOT open .xlsx",
  );
});

Deno.test("UI: app.js delMaster uses month/year path", async () => {
  const res = await route(new Request("http://localhost/app/app.js"), ctx());
  const body = await res.text();
  assertEquals(
    /delMaster[\s\S]*?\/api\/master-lists\/:?\w+\/\$\{/.test(body) ||
      /master-lists\/\$\{/.test(body),
    true,
    "delMaster should target /api/master-lists/:month/:year",
  );
  assertEquals(
    body.includes("'/api/master-lists', { method: \"DELETE\" }"),
    false,
    "delMaster still DELETEs base path",
  );
});

Deno.test("UI: app.js has reconcile modal, not prompt", async () => {
  const res = await route(new Request("http://localhost/app/app.js"), ctx());
  const body = await res.text();
  assertEquals(
    body.includes("reconcileModal") || body.includes("openReconcileModal"),
    true,
    "missing reconcile modal",
  );
});

Deno.test("UI: index.html has offline indicator", async () => {
  const res = await route(new Request("http://localhost/"), ctx());
  const body = await res.text();
  assertEquals(body.includes("offline-badge"), true, "missing offline-badge");
});

Deno.test("UI: app.js has completeList function for completing lists", async () => {
  const res = await route(new Request("http://localhost/app/app.js"), ctx());
  const body = await res.text();
  assertEquals(
    body.includes("function completeList") ||
      body.includes("async function completeList"),
    true,
    "missing completeList() function",
  );
  assertEquals(
    body.includes("completed: true"),
    true,
    "completeList should send completed: true",
  );
  assertEquals(
    body.includes("/api/lists/"),
    true,
    "completeList should call PUT /api/lists/:id",
  );
});

Deno.test("UI: app.js AI empty states guide user to complete lists", async () => {
  const res = await route(new Request("http://localhost/app/app.js"), ctx());
  const body = await res.text();
  assertEquals(
    body.includes("Completa listas de compras"),
    true,
    "AI recs empty state should mention completing lists",
  );
  assertEquals(
    body.includes("Completa listas para"),
    true,
    "AI anomalies empty state should mention completing lists",
  );
});

Deno.test("UI: app.js addPrice refreshes products list", async () => {
  const res = await route(new Request("http://localhost/app/app.js"), ctx());
  const body = await res.text();
  const start = body.indexOf("async function addPrice");
  const end = body.indexOf("async function delProduct", start);
  const fnBody = body.slice(start, end);
  assertEquals(
    fnBody.includes("loadProducts()"),
    true,
    "addPrice should call loadProducts() to refresh prices",
  );
});

Deno.test("UI: app.js forecast shows guidance when no data", async () => {
  const res = await route(new Request("http://localhost/app/app.js"), ctx());
  const body = await res.text();
  assertEquals(
    body.includes("Sin datos"),
    true,
    "forecast should show empty state when predictedTotal is 0",
  );
  assertEquals(
    body.includes(
      "Completa listas y usa la despensa para generar predicciones",
    ),
    true,
    "forecast empty state should guide user",
  );
});

Deno.test("UI: index.html has pantry section with table", async () => {
  const res = await route(new Request("http://localhost/"), ctx());
  const body = await res.text();
  assertEquals(
    body.includes('data-tab="pantry"'),
    true,
    "missing pantry sidebar item",
  );
  assertEquals(body.includes("tab-pantry"), true, "missing pantry section");
  assertEquals(body.includes("pantryTable"), true, "missing pantry table");
  assertEquals(body.includes("fa-warehouse"), true, "missing warehouse icon");
});

Deno.test("UI: app.js has pantry functions", async () => {
  const res = await route(new Request("http://localhost/app/app.js"), ctx());
  const body = await res.text();
  assertEquals(
    body.includes("async function loadPantry"),
    true,
    "missing loadPantry()",
  );
  assertEquals(
    body.includes("/api/pantry"),
    true,
    "loadPantry should fetch /api/pantry",
  );
  assertEquals(body.includes("advanceStatus"), true, "missing advanceStatus()");
  assertEquals(body.includes("delPantryItem"), true, "missing delPantryItem()");
});

Deno.test("UI: index.html has history section under pantry", async () => {
  const res = await route(new Request("http://localhost/"), ctx());
  const body = await res.text();
  assertEquals(
    body.includes('data-tab="pantry-history"') ||
      body.includes("tab-pantry-history"),
    true,
    "missing history section",
  );
  assertEquals(
    body.includes("pantryHistoryTable") || body.includes("historyTable"),
    true,
    "missing history table",
  );
  assertEquals(
    body.includes("fa-history") || body.includes("fa-clock"),
    true,
    "missing history icon",
  );
});

Deno.test("UI: app.js has loadPantryHistory function", async () => {
  const res = await route(new Request("http://localhost/app/app.js"), ctx());
  const body = await res.text();
  assertEquals(
    body.includes("async function loadPantryHistory"),
    true,
    "missing loadPantryHistory()",
  );
  assertEquals(
    body.includes("/api/pantry/history"),
    true,
    "loadPantryHistory should fetch /api/pantry/history",
  );
});

Deno.test("API: /health now included (sanity)", async () => {
  const res = await route(new Request("http://localhost/health"), ctx());
  assertEquals(res.status, 200);
  assertEquals((await res.json()).status, "ok");
});
