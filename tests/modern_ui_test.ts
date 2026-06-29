import { assertEquals } from "@std/assert";
import { route } from "../src/api/router.ts";
import { createContainer } from "../src/container.ts";
import { Database } from "../src/infrastructure/database.ts";

function ctx() {
  const db = new Database(":memory:");
  db.initializeSchema();
  return createContainer(db);
}

Deno.test("ModernUI: sidebar exists with collapsible state", async () => {
  const res = await route(new Request("http://localhost/"), ctx());
  const body = await res.text();
  assertEquals(body.includes('id="sidebar"'), true, "missing sidebar element");
  assertEquals(
    body.includes("sidebar-rail") || body.includes("sidebar-toggle"),
    true,
    "missing sidebar toggle/rail",
  );
  assertEquals(
    body.includes("SidebarGroup") || body.includes("sidebar-group"),
    true,
    "missing sidebar group",
  );
});

Deno.test("ModernUI: command palette (Cmd+K) present", async () => {
  const res = await route(new Request("http://localhost/"), ctx());
  const body = await res.text();
  assertEquals(
    body.includes("command-palette") || body.includes("cmdk") ||
      body.includes('id="cmdk"'),
    true,
    "missing command palette",
  );
  assertEquals(
    body.includes("Cmd+K") || body.includes("cmd+k") ||
      body.includes('data-cmd="open"'),
    true,
    "missing Cmd+K shortcut hint",
  );
});

Deno.test("ModernUI: color input type=color for stores", async () => {
  const res = await route(new Request("http://localhost/"), ctx());
  const body = await res.text();
  assertEquals(
    body.includes('type="color"'),
    true,
    "missing native color picker",
  );
});

Deno.test("ModernUI: date input type=date for lists", async () => {
  const res = await route(new Request("http://localhost/"), ctx());
  const body = await res.text();
  assertEquals(
    body.includes('type="date"'),
    true,
    "missing native date picker",
  );
});

Deno.test("ModernUI: datalist combobox for unit/type/category", async () => {
  const res = await route(new Request("http://localhost/"), ctx());
  const body = await res.text();
  assertEquals(body.includes("<datalist"), true, "missing datalist combobox");
  assertEquals(
    body.includes('list="units-list"') || body.includes('list="config-units"'),
    true,
    "missing units datalist ref",
  );
});

Deno.test("ModernUI: dialog modal for creating entities", async () => {
  const res = await route(new Request("http://localhost/"), ctx());
  const body = await res.text();
  assertEquals(
    body.includes("dialog-overlay") || body.includes('class="dialog"') ||
      body.includes('role="dialog"'),
    true,
    "missing dialog modal",
  );
});

Deno.test("ModernUI: dropdown menu (⋮) in table rows", async () => {
  const res = await route(new Request("http://localhost/app/app.js"), ctx());
  const body = await res.text();
  assertEquals(
    body.includes("dropdown") || body.includes("rowMenu") ||
      body.includes("openRowMenu"),
    true,
    "missing dropdown menu in rows",
  );
});

Deno.test("ModernUI: data table with sort icons + filter + pagination", async () => {
  const res = await route(new Request("http://localhost/app/app.js"), ctx());
  const body = await res.text();
  assertEquals(
    body.includes("pagination") || body.includes("pageSize") ||
      body.includes("currentPage"),
    true,
    "missing pagination",
  );
  assertEquals(
    body.includes("filterInput") || body.includes("columnFilter") ||
      body.includes("filterValue"),
    true,
    "missing column filter",
  );
});

Deno.test("ModernUI: empty state with CTA", async () => {
  const res = await route(new Request("http://localhost/app/app.js"), ctx());
  const body = await res.text();
  assertEquals(
    body.includes("emptyState") || body.includes("empty-state") ||
      body.includes("No hay"),
    true,
    "missing empty state",
  );
});

Deno.test("ModernUI: avatar with initials for stores", async () => {
  const res = await route(new Request("http://localhost/app/app.js"), ctx());
  const body = await res.text();
  assertEquals(
    body.includes("avatar") || body.includes("initials") ||
      body.includes("getInitials"),
    true,
    "missing avatar/initials",
  );
});

Deno.test("ModernUI: badge for list status (completed/pending)", async () => {
  const res = await route(new Request("http://localhost/app/app.js"), ctx());
  const body = await res.text();
  assertEquals(
    body.includes("badge") &&
      (body.includes("completada") || body.includes("completed") ||
        body.includes("pendiente")),
    true,
    "missing status badge",
  );
});

Deno.test("ModernUI: progress bar for budget", async () => {
  const res = await route(new Request("http://localhost/app/app.js"), ctx());
  const body = await res.text();
  assertEquals(
    body.includes("progress") || body.includes("progressBar") ||
      body.includes("progress-bar"),
    true,
    "missing progress bar",
  );
});

Deno.test("ModernUI: range slider for quantity", async () => {
  const res = await route(new Request("http://localhost/"), ctx());
  const body = await res.text();
  assertEquals(body.includes('type="range"'), true, "missing range slider");
});

Deno.test("ModernUI: keyboard shortcut Cmd+B for sidebar, Cmd+K for palette", async () => {
  const res = await route(new Request("http://localhost/app/app.js"), ctx());
  const body = await res.text();
  assertEquals(
    body.includes("metaKey") && (body.includes('"b"') || body.includes("'b'")),
    true,
    "missing Cmd+B shortcut",
  );
  assertEquals(
    body.includes("metaKey") && (body.includes('"k"') || body.includes("'k'")),
    true,
    "missing Cmd+K shortcut",
  );
});

Deno.test("ModernUI: no text placeholder for color (#RRGGBB text)", async () => {
  const res = await route(new Request("http://localhost/"), ctx());
  const body = await res.text();
  assertEquals(
    body.includes('placeholder="#RRGGBB"'),
    false,
    "text placeholder for color still present — use type=color",
  );
});

Deno.test("ModernUI: month picker present in lists tab", async () => {
  const res = await route(new Request("http://localhost/"), ctx());
  const body = await res.text();
  assertEquals(
    body.includes('id="listMonthInput"'),
    true,
    "listMonthInput should be a month picker",
  );
});
