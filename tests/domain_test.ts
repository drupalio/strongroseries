import { assertEquals, assertNotEquals } from "@std/assert";
import { Product, ProductPrice, Store } from "../src/domain/entity.ts";
import { localDate } from "../src/domain/dates.ts";

Deno.test("Store: round-trips name and color", () => {
  const store = new Store(1, "Walmart", "#FF0000");
  assertEquals(store.id, 1);
  assertEquals(store.name, "Walmart");
  assertEquals(store.color, "#FF0000");
});

Deno.test("Store: setters mutate fields", () => {
  const store = new Store();
  store.setName("Nuevo Super");
  store.setColor("#00FF00");
  assertEquals(store.name, "Nuevo Super");
  assertEquals(store.color, "#00FF00");
});

Deno.test("Store: empty color allowed", () => {
  const store = new Store();
  store.setName("Test");
  store.setColor("");
  assertEquals(store.name, "Test");
  assertEquals(store.color, "");
});

Deno.test("Store: unique ids", () => {
  const s1 = new Store(1, "A", "#FF0000");
  const s2 = new Store(2, "B", "#00FF00");
  assertNotEquals(s1.id, s2.id);
});

Deno.test("Product: round-trips all fields", () => {
  const p = new Product(
    1,
    100,
    "Leche",
    "Litro",
    "Recurrente",
    "Lacteos",
  );
  assertEquals(p.id, 1);
  assertEquals(p.storeId, 100);
  assertEquals(p.name, "Leche");
  assertEquals(p.unit, "Litro");
  assertEquals(p.productType, "Recurrente");
  assertEquals(p.category, "Lacteos");
});

Deno.test("Product: setters mutate", () => {
  const p = new Product();
  p.setName("Yogur");
  p.setUnit("Kilogramo");
  p.setProductType("Fijo");
  p.setCategory("Lacteos");
  assertEquals(p.name, "Yogur");
  assertEquals(p.unit, "Kilogramo");
  assertEquals(p.productType, "Fijo");
  assertEquals(p.category, "Lacteos");
});

Deno.test("Product: empty category allowed", () => {
  const p = new Product();
  p.setCategory("");
  assertEquals(p.category, "");
});

Deno.test("Product: unique ids", () => {
  const p1 = new Product(1, 1, "P1", "Pieza", "Recurrente", "");
  const p2 = new Product(2, 1, "P2", "Paquete", "Fijo", "");
  assertNotEquals(p1.id, p2.id);
});

Deno.test("ProductPrice: round-trips", () => {
  const pp = new ProductPrice(1, 100, 25.50, localDate(2026, 4, 24));
  assertEquals(pp.id, 1);
  assertEquals(pp.productId, 100);
  assertEquals(pp.price, 25.50);
  assertEquals(pp.effectiveDate, "2026-04-24");
});

Deno.test("ProductPrice: update price", () => {
  const pp = new ProductPrice();
  pp.setPrice(30.00);
  assertEquals(pp.price, 30.00);
});

Deno.test("ProductPrice: zero price allowed", () => {
  const pp = new ProductPrice();
  pp.setPrice(0);
  assertEquals(pp.price, 0);
});

Deno.test("ProductPrice: comparison", () => {
  const a = new ProductPrice(1, 100, 10.00, localDate(2026, 1, 1));
  const b = new ProductPrice(2, 100, 20.00, localDate(2026, 1, 1));
  if (!(a.price! < b.price!)) throw new Error("a should be < b");
  if (!(b.price! > a.price!)) throw new Error("b should be > a");
});

Deno.test("ProductPrice: copy preserves data", () => {
  const o = new ProductPrice(42, 99, 55.55, localDate(2026, 1, 15));
  const c = new ProductPrice();
  c.id = o.id;
  c.productId = o.productId;
  c.price = o.price;
  c.effectiveDate = o.effectiveDate;
  assertEquals(c.id, o.id);
  assertEquals(c.productId, o.productId);
  assertEquals(c.price, o.price);
  assertEquals(c.effectiveDate, o.effectiveDate);
});
