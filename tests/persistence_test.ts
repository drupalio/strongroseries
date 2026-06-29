import { assertEquals, assertRejects } from "@std/assert";
import { Database } from "../src/infrastructure/database.ts";
import {
  Budget,
  GroceryItem,
  GroceryList,
  Product,
  ProductPrice,
  Store,
} from "../src/domain/entity.ts";
import {
  BudgetRepository,
  CategoryRepository,
  GroceryItemRepository,
  GroceryListRepository,
  ProductPriceRepository,
  ProductRepository,
  StoreRepository,
} from "../src/infrastructure/repositories.ts";
import { EntityNotFoundException } from "../src/domain/exception.ts";
import { localDate, todayISO, yearMonth } from "../src/domain/dates.ts";

function freshDb(): {
  db: Database;
  stores: StoreRepository;
  products: ProductRepository;
  prices: ProductPriceRepository;
  lists: GroceryListRepository;
  items: GroceryItemRepository;
  budgets: BudgetRepository;
  categories: CategoryRepository;
} {
  const db = new Database(":memory:");
  db.initializeSchema();
  return {
    db,
    stores: new StoreRepository(db),
    products: new ProductRepository(db),
    prices: new ProductPriceRepository(db),
    lists: new GroceryListRepository(db),
    items: new GroceryItemRepository(db),
    budgets: new BudgetRepository(db),
    categories: new CategoryRepository(db),
  };
}

Deno.test("schema: seeds units, product types, categories", () => {
  const { db, categories } = freshDb();
  const units = db.queryFirstScalar<number>("SELECT COUNT(*) FROM units") ?? 0;
  const types =
    db.queryFirstScalar<number>("SELECT COUNT(*) FROM product_types") ?? 0;
  const cats = db.queryFirstScalar<number>("SELECT COUNT(*) FROM categories") ??
    0;
  assertEquals(units >= 24, true, `units=${units}`);
  assertEquals(types, 5);
  assertEquals(cats >= 33, true, `cats=${cats}`);
  assertEquals(categories.findAll().length, cats);
});

Deno.test("Store repo: save insert + findById + findAll + delete", () => {
  const { stores } = freshDb();
  const s = new Store(null, "Walmart", "#FF0000");
  const saved = stores.save(s);
  assertEquals(saved.id !== null, true);
  const found = stores.findById(saved.id!)!;
  assertEquals(found.name, "Walmart");
  assertEquals(found.color, "#FF0000");
  assertEquals(stores.findAll().length, 1);
  stores.deleteById(saved.id!);
  assertEquals(stores.findAll().length, 0);
});

Deno.test("Store repo: save update", () => {
  const { stores } = freshDb();
  const s = stores.save(new Store(null, "A", "#000000"));
  s.setName("B");
  s.setColor("#FFFFFF");
  stores.save(s);
  const found = stores.findById(s.id!)!;
  assertEquals(found.name, "B");
  assertEquals(found.color, "#FFFFFF");
});

Deno.test("Product repo: save + findByStoreId + findRecurrent + delete", () => {
  const { stores, products } = freshDb();
  const s = stores.save(new Store(null, "S", ""));
  const p1 = products.save(
    new Product(null, s.id!, "Leche", "Litro", "Recurrente", "Lacteos"),
  );
  const p2 = products.save(
    new Product(null, s.id!, "Pan", "Pieza", "Eventual", "Panaderia"),
  );
  assertEquals(products.findAll().length, 2);
  assertEquals(products.findByStoreId(s.id!).length, 2);
  assertEquals(products.findRecurrentByStoreId(s.id!).length, 1);
  assertEquals(products.findRecurrentByStoreId(s.id!)[0].name, "Leche");
  products.deleteById(p2.id!);
  assertEquals(products.findAll().length, 1);
});

Deno.test("ProductPrice repo: save + findByProductId + findCurrent + delete", () => {
  const { stores, products, prices } = freshDb();
  const s = stores.save(new Store(null, "S", ""));
  const p = products.save(
    new Product(null, s.id!, "Leche", "Litro", "Recurrente", "Lacteos"),
  );
  prices.save(new ProductPrice(null, p.id!, 10.00, localDate(2026, 1, 1)));
  prices.save(new ProductPrice(null, p.id!, 12.00, localDate(2026, 2, 1)));
  prices.save(new ProductPrice(null, p.id!, 11.00, localDate(2026, 3, 1)));
  assertEquals(prices.findByProductId(p.id!).length, 3);
  assertEquals(prices.findCurrentByProductId(p.id!)?.price, 11.00);
  // same date, latest id wins
  prices.save(new ProductPrice(null, p.id!, 13.00, localDate(2026, 3, 1)));
  assertEquals(prices.findCurrentByProductId(p.id!)?.price, 13.00);
});

Deno.test("GroceryList repo: save + findByStoreId + completed + dateRange + searchByItem + deleteByMonth", () => {
  const { stores, products, lists, items } = freshDb();
  const s = stores.save(new Store(null, "S", ""));
  const l1 = lists.save(
    new GroceryList(null, s.id!, "Lista A", yearMonth(2026, 4), false),
  );
  const l2 = lists.save(
    new GroceryList(null, s.id!, "Lista B", yearMonth(2026, 3), true),
  );
  assertEquals(lists.findAll().length, 2);
  assertEquals(lists.findByStoreId(s.id!).length, 2);
  assertEquals(lists.findCompletedByStoreId(s.id!).length, 1);
  assertEquals(lists.countCompletedByStoreId(s.id!), 1);
  assertEquals(
    lists.findByDateRange(yearMonth(2026, 1), yearMonth(2026, 5)).length,
    2,
  );
  // search by item name
  const p = products.save(
    new Product(
      null,
      s.id!,
      "Leche Entera",
      "Litro",
      "Recurrente",
      "Lacteos",
    ),
  );
  items.save(
    new GroceryItem(null, l1.id!, p.id!, "Leche Entera", 2, "Litro", 10, false),
  );
  assertEquals(lists.findByItemNameContains("leche").length, 1);
  lists.deleteByMonth(yearMonth(2026, 4));
  assertEquals(lists.findAll().length, 1);
});

Deno.test("GroceryItem repo: save + findByGroceryListId + toggle + countByProduct + deleteByGroceryListId", () => {
  const { stores, products, lists, items } = freshDb();
  const s = stores.save(new Store(null, "S", ""));
  const p = products.save(
    new Product(null, s.id!, "Pan", "Pieza", "Recurrente", "Panaderia"),
  );
  const l = lists.save(
    new GroceryList(null, s.id!, "L", yearMonth(2026, 4), false),
  );
  const i = items.save(
    new GroceryItem(null, l.id!, p.id!, "Pan", 2, "Pieza", 5.5, false),
  );
  assertEquals(items.findByGroceryListId(l.id!).length, 1);
  i.setChecked(true);
  items.save(i);
  assertEquals(items.findById(i.id!)?.checked, true);
  // price null when <= 0
  const i2 = items.save(
    new GroceryItem(null, l.id!, p.id!, "Pan", 1, "Pieza", 0, false),
  );
  assertEquals(items.findById(i2.id!)?.priceAtPurchase, 0);
  assertEquals(items.countByProductId(p.id!), 2);
  items.deleteByGroceryListId(l.id!);
  assertEquals(items.findByGroceryListId(l.id!).length, 0);
});

Deno.test("Budget repo: save + findByPeriod + budgets stored as TEXT", () => {
  const { budgets } = freshDb();
  const b = budgets.save(
    new Budget(null, yearMonth(2026, 4), 1500.00, 1200.00),
  );
  const found = budgets.findByPeriod(yearMonth(2026, 4))!;
  assertEquals(found.estimatedBudget, 1500.00);
  assertEquals(found.actualSpent, 1200.00);
  // stored as text
  const raw = budgets as any;
  const row = raw.db.queryFirst(
    "SELECT estimated_budget, actual_spent FROM budgets WHERE id = ?",
    [b.id!],
  );
  assertEquals(row.estimated_budget, "1500");
  assertEquals(row.actual_spent, "1200");
});

Deno.test("Category repo: findAll, save (ignore dup), delete", () => {
  const { categories } = freshDb();
  const before = categories.findAll().length;
  categories.save("NuevaCat");
  assertEquals(categories.findAll().includes("NuevaCat"), true);
  categories.save("NuevaCat");
  assertEquals(categories.findAll().length, before + 1);
  categories.delete("NuevaCat");
  assertEquals(categories.findAll().includes("NuevaCat"), false);
});

Deno.test("EntityNotFoundException: message format", () => {
  const e = new EntityNotFoundException("Tienda", 42);
  assertEquals(e.message, "Tienda no encontrado con id: 42");
  assertEquals(e.entityName, "Tienda");
  assertEquals(e.entityId, 42);
});
