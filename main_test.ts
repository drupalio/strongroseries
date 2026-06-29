import { assertEquals } from "@std/assert";
import { route } from "./src/api/router.ts";
import { createContainer } from "./src/container.ts";
import { Database } from "./src/infrastructure/database.ts";

function ctx() {
  const db = new Database(":memory:");
  db.initializeSchema();
  return createContainer(db);
}

Deno.test("returns html on /", async () => {
  const res = await route(new Request("http://localhost/"), ctx());
  assertEquals(res.headers.get("content-type"), "text/html; charset=utf-8");
  const body = await res.text();
  assertEquals(body.includes("StrongGroseries"), true);
});

Deno.test("returns app.js on /app/app.js", async () => {
  const res = await route(new Request("http://localhost/app/app.js"), ctx());
  assertEquals(
    res.headers.get("content-type"),
    "application/javascript; charset=utf-8",
  );
  const body = await res.text();
  assertEquals(body.includes("loadDashboard"), true);
});

Deno.test("returns json on /api", async () => {
  const res = await route(new Request("http://localhost/api"), ctx());
  const data = await res.json();
  assertEquals(data.message, "Hello, world!");
  assertEquals(typeof data.time, "string");
});

Deno.test("GET /health returns ok", async () => {
  const res = await route(new Request("http://localhost/health"), ctx());
  assertEquals(res.status, 200);
  assertEquals((await res.json()).status, "ok");
});
