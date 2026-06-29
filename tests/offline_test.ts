import { assertEquals } from "@std/assert";
import { route } from "../src/api/router.ts";
import { createContainer } from "../src/container.ts";
import { Database } from "../src/infrastructure/database.ts";

function ctx() {
  const db = new Database(":memory:");
  db.initializeSchema();
  return createContainer(db);
}

Deno.test("Offline: /sw.js served with JS content-type", async () => {
  const res = await route(new Request("http://localhost/sw.js"), ctx());
  assertEquals(res.status, 200);
  assertEquals(
    res.headers.get("content-type"),
    "application/javascript; charset=utf-8",
  );
  const body = await res.text();
  assertEquals(
    body.includes("addEventListener('install'"),
    true,
    "SW must have install handler",
  );
  assertEquals(
    body.includes("addEventListener('fetch'"),
    true,
    "SW must have fetch handler",
  );
  assertEquals(body.includes(".match("), true, "SW must do cache matching");
});

Deno.test("Offline: app.js registers service worker", async () => {
  const res = await route(new Request("http://localhost/app/app.js"), ctx());
  const body = await res.text();
  assertEquals(
    body.includes("navigator.serviceWorker.register"),
    true,
    "app.js must register SW",
  );
  assertEquals(body.includes("/sw.js"), true, "must register /sw.js");
});

Deno.test("Offline: app.js has localStorage cache helpers", async () => {
  const res = await route(new Request("http://localhost/app/app.js"), ctx());
  const body = await res.text();
  assertEquals(
    body.includes("localStorage.getItem"),
    true,
    "must read from localStorage",
  );
  assertEquals(
    body.includes("localStorage.setItem"),
    true,
    "must write to localStorage",
  );
  assertEquals(
    body.includes("cacheGet") || body.includes("cacheSet") ||
      body.includes("cachedFetch"),
    true,
    "must have cache helper",
  );
});

Deno.test("Offline: index.html has manifest link for PWA", async () => {
  const res = await route(new Request("http://localhost/"), ctx());
  const body = await res.text();
  assertEquals(
    body.includes('rel="manifest"') || body.includes("/manifest.json"),
    true,
    "should link manifest",
  );
});

Deno.test("Offline: /manifest.json served", async () => {
  const res = await route(new Request("http://localhost/manifest.json"), ctx());
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("content-type"), "application/manifest+json");
  const m = await res.json();
  assertEquals(m.name, "StrongGroseries");
  assertEquals(m.display, "standalone");
  assertEquals(Array.isArray(m.icons), true);
});
