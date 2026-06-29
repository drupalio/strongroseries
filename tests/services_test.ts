import { assertEquals, assertThrows } from "@std/assert";
import {
  BudgetService,
  ConfigurationService,
  GroceryListService,
  MasterListService,
  PantryService,
  ProductService,
  StoreService,
} from "../src/application/services.ts";
import { Validator } from "../src/application/validator.ts";
import {
  EntityNotFoundException,
  ValidationException,
} from "../src/domain/exception.ts";
import {
  Budget,
  GroceryItem,
  GroceryList,
  PantryItem,
  Product,
  ProductPrice,
  Store,
} from "../src/domain/entity.ts";
import type {
  BudgetRepository,
  CategoryRepository,
  GroceryItemRepository,
  GroceryListRepository,
  PantryHistoryRepository,
  PantryRepository,
  ProductPriceRepository,
  ProductRepository,
  ProductTypeRepository,
  StoreRepository,
  UnitRepository,
} from "../src/domain/repository.ts";
import { ItemOp, UndoRedoStack } from "../src/application/utils.ts";
import { currentYearMonth, localDate, todayISO, yearMonth } from "../src/domain/dates.ts";

// --- In-memory fakes ---
class FakeStoreRepo implements StoreRepository {
  next = 1;
  data = new Map<number, Store>();
  findAll(): Store[] {
    return [...this.data.values()].sort((a, b) =>
      (a.name ?? "").localeCompare(b.name ?? "")
    );
  }
  findById(id: number): Store | null {
    return this.data.get(id) ?? null;
  }
  save(s: Store): Store {
    if (s.id == null) s.id = this.next++;
    this.data.set(s.id, s);
    return s;
  }
  deleteById(id: number): void {
    this.data.delete(id);
  }
}
class FakeProductRepo implements ProductRepository {
  next = 1;
  data = new Map<number, Product>();
  findAll(): Product[] {
    return [...this.data.values()].sort((a, b) =>
      (a.name ?? "").localeCompare(b.name ?? "")
    );
  }
  findByStoreId(sid: number): Product[] {
    return this.findAll().filter((p) => p.storeId === sid);
  }
  findRecurrentByStoreId(sid: number): Product[] {
    return this.findByStoreId(sid).filter((p) =>
      p.productType === "Recurrente"
    );
  }
  findById(id: number): Product | null {
    return this.data.get(id) ?? null;
  }
  save(p: Product): Product {
    if (p.id == null) p.id = this.next++;
    this.data.set(p.id, p);
    return p;
  }
  deleteById(id: number): void {
    this.data.delete(id);
  }
}
class FakePriceRepo implements ProductPriceRepository {
  next = 1;
  data = new Map<number, ProductPrice>();
  findByProductId(pid: number): ProductPrice[] {
    return [...this.data.values()].filter((p) => p.productId === pid).sort((
      a,
      b,
    ) => (b.effectiveDate ?? "").localeCompare(a.effectiveDate ?? ""));
  }
  findCurrentByProductId(pid: number): ProductPrice | null {
    const list = this.findByProductId(pid).sort((a, b) => {
      const d = (b.effectiveDate ?? "").localeCompare(a.effectiveDate ?? "");
      return d !== 0 ? d : (b.id! - a.id!);
    });
    return list[0] ?? null;
  }
  save(p: ProductPrice): ProductPrice {
    if (p.id == null) p.id = this.next++;
    this.data.set(p.id, p);
    return p;
  }
  deleteById(id: number): void {
    this.data.delete(id);
  }
}
class FakeListRepo implements GroceryListRepository {
  next = 1;
  data = new Map<number, GroceryList>();
  findAll(): GroceryList[] {
    return [...this.data.values()].sort((a, b) =>
      (b.month ?? "").localeCompare(a.month ?? "")
    );
  }
  findByStoreId(sid: number): GroceryList[] {
    return this.findAll().filter((l) => l.storeId === sid);
  }
  findById(id: number): GroceryList | null {
    return this.data.get(id) ?? null;
  }
  save(l: GroceryList): GroceryList {
    if (l.id == null) l.id = this.next++;
    this.data.set(l.id, l);
    return l;
  }
  deleteById(id: number): void {
    this.data.delete(id);
  }
  deleteByMonth(m: string): void {
    for (const [id, l] of this.data) if (l.month === m) this.data.delete(id);
  }
  findCompletedByStoreId(sid: number): GroceryList[] {
    return this.findByStoreId(sid).filter((l) => l.completed).sort((a, b) =>
      (b.month ?? "").localeCompare(a.month ?? "")
    );
  }
  countCompletedByStoreId(sid: number): number {
    return this.findCompletedByStoreId(sid).length;
  }
  findByDateRange(s: string, e: string): GroceryList[] {
    return this.findAll().filter((l) => l.month! >= s && l.month! <= e);
  }
  findByItemNameContains(name: string): GroceryList[] {
    throw new Error("not used in service tests");
  }
}
class FakeItemRepo implements GroceryItemRepository {
  next = 1;
  data = new Map<number, GroceryItem>();
  findByGroceryListId(lid: number): GroceryItem[] {
    return [...this.data.values()].filter((i) => i.groceryListId === lid).sort((
      a,
      b,
    ) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));
  }
  findById(id: number): GroceryItem | null {
    return this.data.get(id) ?? null;
  }
  save(i: GroceryItem): GroceryItem {
    if (i.id == null) i.id = this.next++;
    this.data.set(i.id, i);
    return i;
  }
  deleteById(id: number): void {
    this.data.delete(id);
  }
  deleteByGroceryListId(lid: number): void {
    for (const [id, i] of this.data) {
      if (i.groceryListId === lid) this.data.delete(id);
    }
  }
  countByProductId(pid: number): number {
    return [...this.data.values()].filter((i) => i.productId === pid).length;
  }
  findStoreIdsByProductId(pid: number): number[] {
    return [];
  }
}
class FakePantryRepo implements PantryRepository {
  next = 1;
  data = new Map<number, PantryItem>();
  findAll(): PantryItem[] {
    return [...this.data.values()];
  }
  findById(id: number): PantryItem | null {
    return this.data.get(id) ?? null;
  }
  findByProductId(pid: number): PantryItem[] {
    return this.findAll().filter((p) => p.productId === pid);
  }
  save(p: PantryItem): PantryItem {
    if (p.id == null) p.id = this.next++;
    this.data.set(p.id, p);
    return p;
  }
  deleteById(id: number): void {
    this.data.delete(id);
  }
}

class FakePantryHistoryRepo {
  data = new Map<string, any[]>();
  next = 1;
  findByPeriod(period: string): any[] {
    return this.data.get(period) ?? [];
  }
  findAllPeriods(): string[] {
    return [...this.data.keys()].sort();
  }
  save(entry: any): void {
    const arr = this.data.get(entry.period) ?? [];
    arr.push({ ...entry, id: this.next++ });
    this.data.set(entry.period, arr);
  }
}

class FakeBudgetRepo implements BudgetRepository {
  next = 1;
  data = new Map<number, Budget>();
  findAll(): Budget[] {
    return [...this.data.values()].sort((a, b) =>
      (a.period ?? "").localeCompare(b.period ?? "")
    );
  }
  findByPeriod(p: string): Budget | null {
    return [...this.data.values()].find((b) => b.period === p) ?? null;
  }
  save(b: Budget): Budget {
    if (b.id == null) b.id = this.next++;
    this.data.set(b.id, b);
    return b;
  }
  deleteById(id: number): void {
    this.data.delete(id);
  }
}
class FakeNameRepo {
  data = new Set<string>();
  findAll(): string[] {
    return [...this.data].sort();
  }
  save(n: string): void {
    this.data.add(n);
  }
  delete(n: string): void {
    this.data.delete(n);
  }
}

// ===== StoreService (port of StoreServiceTest) =====
function freshStoreService() {
  const r = new FakeStoreRepo();
  return { r, s: new StoreService(r) };
}

Deno.test("StoreService: shouldReturnAllStores", () => {
  const { r, s } = freshStoreService();
  r.save(new Store(1, "Walmart", "#FF0000"));
  r.save(new Store(2, "Costco", "#00FF00"));
  assertEquals(s.getAllStores().map((d) => d.name), ["Costco", "Walmart"]); // sorted by name
});

Deno.test("StoreService: empty list", () => {
  const { s } = freshStoreService();
  assertEquals(s.getAllStores(), []);
});

Deno.test("StoreService: getStoreById", () => {
  const { r, s } = freshStoreService();
  r.save(new Store(1, "Walmart", "#FF0000"));
  const d = s.getStoreById(1);
  assertEquals(d.id, 1);
  assertEquals(d.name, "Walmart");
  assertEquals(d.color, "#FF0000");
});

Deno.test("StoreService: not found throws with Tienda", () => {
  const { s } = freshStoreService();
  const e = assertThrows(() => s.getStoreById(999), EntityNotFoundException);
  assertEquals((e as Error).message.includes("Tienda"), true);
});

Deno.test("StoreService: createStore", () => {
  const { r, s } = freshStoreService();
  const d = s.createStore({ id: null, name: "Nuevo Super", color: "#0000FF" });
  assertEquals(d.name, "Nuevo Super");
  assertEquals(d.color, "#0000FF");
  assertEquals(d.id != null, true);
  assertEquals(r.findAll().length, 1);
});

Deno.test("StoreService: updateStore", () => {
  const { r, s } = freshStoreService();
  r.save(new Store(1, "Viejo", "#FFFFFF"));
  const d = s.updateStore(1, { id: 1, name: "Nuevo Nombre", color: "#FF00FF" });
  assertEquals(d.name, "Nuevo Nombre");
  assertEquals(d.color, "#FF00FF");
});

Deno.test("StoreService: deleteStore", () => {
  const { r, s } = freshStoreService();
  r.save(new Store(1, "Walmart", "#FF0000"));
  s.deleteStore(1);
  assertEquals(r.findAll().length, 0);
});

Deno.test("StoreService: delete non-existent throws", () => {
  const { s } = freshStoreService();
  assertThrows(() => s.deleteStore(999), EntityNotFoundException);
});

// ===== GroceryListService (port of GroceryListServiceTest) =====
function freshListService() {
  const lists = new FakeListRepo();
  const items = new FakeItemRepo();
  const products = new FakeProductRepo();
  const prices = new FakePriceRepo();
  const stores = new FakeStoreRepo();
  return {
    lists,
    items,
    products,
    prices,
    stores,
    s: new GroceryListService(lists, items, products, prices, stores),
  };
}

Deno.test("GroceryListService: getAllLists", () => {
  const ctx = freshListService();
  ctx.lists.save(new GroceryList(1, 100, "Lista 1", yearMonth(2026, 4), false));
  ctx.lists.save(new GroceryList(2, 100, "Lista 2", yearMonth(2026, 4), true));
  ctx.stores.save(new Store(100, "Walmart", ""));
  const r = ctx.s.getAllLists();
  assertEquals(r.length, 2);
});

Deno.test("GroceryListService: getListById", () => {
  const ctx = freshListService();
  ctx.lists.save(
    new GroceryList(1, 100, "Mi Lista", yearMonth(2026, 4), false),
  );
  ctx.stores.save(new Store(100, "Walmart", ""));
  const d = ctx.s.getListById(1);
  assertEquals(d.id, 1);
  assertEquals(d.name, "Mi Lista");
  assertEquals(d.month, "2026-04");
});

Deno.test("GroceryListService: not found throws Lista de compras", () => {
  const ctx = freshListService();
  const e = assertThrows(() => ctx.s.getListById(999), EntityNotFoundException);
  assertEquals((e as Error).message.includes("Lista de compras"), true);
});

Deno.test("GroceryListService: delete non-existent throws", () => {
  const ctx = freshListService();
  assertThrows(() => ctx.s.deleteList(999), EntityNotFoundException);
});

Deno.test("GroceryListService: createList with month", () => {
  const ctx = freshListService();
  ctx.stores.save(new Store(100, "Walmart", ""));
  const d = ctx.s.createList({
    id: null,
    storeId: 100,
    storeName: "Walmart",
    name: "Lista futura",
    month: currentYearMonth(),
    completed: false,
    itemCount: 0,
    estimatedTotal: 0,
  });
  assertEquals(d.id != null, true);
  assertEquals(d.month, currentYearMonth());
});

Deno.test("GroceryListService: mark completed", () => {
  const ctx = freshListService();
  const now = currentYearMonth();
  ctx.lists.save(new GroceryList(1, 100, "Lista", now, false));
  ctx.stores.save(new Store(100, "Walmart", ""));
  const d = ctx.s.updateList(1, {
    id: 1,
    storeId: 100,
    storeName: "Walmart",
    name: "Lista",
    month: now,
    completed: true,
    itemCount: 0,
    estimatedTotal: 0,
  });
  assertEquals(d.completed, true);
});

Deno.test("GroceryListService: delete list and its items", () => {
  const ctx = freshListService();
  ctx.lists.save(new GroceryList(1, 100, "Lista", yearMonth(2026, 4), false));
  ctx.items.save(new GroceryItem(1, 1, 10, "Leche", 2, "Litro", 25.5, false));
  ctx.s.deleteList(1);
  assertEquals(ctx.lists.findById(1), null);
  assertEquals(ctx.items.findByGroceryListId(1).length, 0);
});

Deno.test("GroceryListService: estimatedTotal = 151.00", () => {
  const ctx = freshListService();
  ctx.lists.save(
    new GroceryList(1, 100, "Lista con Items", yearMonth(2026, 4), false),
  );
  ctx.stores.save(new Store(100, "Walmart", ""));
  ctx.items.save(new GroceryItem(1, 1, 10, "Leche", 2, "Litro", 25.50, false));
  ctx.items.save(new GroceryItem(2, 1, 20, "Pan", 1, "Pieza", 100.00, false));
  const d = ctx.s.getListById(1);
  assertEquals(d.estimatedTotal, 25.50 * 2 + 100.00 * 1);
});

Deno.test("GroceryListService: getItemsByListId", () => {
  const ctx = freshListService();
  ctx.items.save(new GroceryItem(1, 1, 10, "Leche", 2, "Litro", 25.00, false));
  ctx.items.save(new GroceryItem(2, 1, 20, "Pan", 1, "Pieza", 50.00, true));
  ctx.products.save(
    new Product(10, 100, "Leche", "Litro", "Recurrente", "Lacteos"),
  );
  ctx.products.save(
    new Product(20, 100, "Pan", "Pieza", "Recurrente", "Panaderia"),
  );
  const r = ctx.s.getItemsByListId(1);
  assertEquals(r.map((i) => i.productName), ["Leche", "Pan"]);
});

Deno.test("GroceryListService: addItem with current price", () => {
  const ctx = freshListService();
  ctx.lists.save(new GroceryList(1, 100, "Lista", yearMonth(2026, 4), false));
  ctx.products.save(
    new Product(10, 100, "Leche", "Litro", "Recurrente", "Lacteos"),
  );
  ctx.prices.save(new ProductPrice(1, 10, 25.50, todayISO()));
  ctx.s.addItem(1, 10, 3);
  const items = ctx.items.findByGroceryListId(1);
  assertEquals(items.length, 1);
  assertEquals(items[0].quantity, 3);
  assertEquals(items[0].priceAtPurchase, 25.50);
});

Deno.test("GroceryListService: addItem idempotent (already in list)", () => {
  const ctx = freshListService();
  ctx.lists.save(new GroceryList(1, 100, "Lista", yearMonth(2026, 4), false));
  ctx.products.save(
    new Product(10, 100, "Leche", "Litro", "Recurrente", "Lacteos"),
  );
  ctx.items.save(new GroceryItem(1, 1, 10, "Leche", 1, "Litro", 0, false));
  ctx.s.addItem(1, 10, 3);
  assertEquals(ctx.items.findByGroceryListId(1).length, 1);
});

Deno.test("GroceryListService: addItem to non-existent list throws", () => {
  const ctx = freshListService();
  const e = assertThrows(
    () => ctx.s.addItem(999, 10, 1),
    EntityNotFoundException,
  );
  assertEquals((e as Error).message.includes("Lista de compras"), true);
});

// ===== Validator =====
Deno.test("Validator: accumulates errors", () => {
  let threw = false;
  try {
    Validator.of({} as any).isNotEmpty(null, "nombre").isNotEmpty("", "unidad")
      .validate();
  } catch (e) {
    threw = true;
    assertEquals(e instanceof ValidationException, true);
    assertEquals((e as ValidationException).errors.length, 2);
  }
  assertEquals(threw, true);
});

Deno.test("Validator: no errors passes", () => {
  Validator.of({} as any).isNotEmpty("ok", "nombre").validate();
});

// ===== UndoRedoStack =====
Deno.test("UndoRedoStack: push/undo/redo", () => {
  const st = new UndoRedoStack<string>(3);
  st.push("a");
  st.push("b");
  st.push("c");
  assertEquals(st.undo("current"), "c");
  assertEquals(st.undo("c"), "b");
  assertEquals(st.canRedo(), true);
  assertEquals(st.redo("b"), "c");
});

Deno.test("UndoRedoStack: evicts oldest", () => {
  const st = new UndoRedoStack<number>(2);
  st.push(1);
  st.push(2);
  st.push(3);
  assertEquals(st.undo(0), 3);
  assertEquals(st.undo(3), 2);
  assertEquals(st.undo(2), null); // 1 evicted
});

// ===== BudgetService + MasterListService + ConfigurationService smoke =====
function freshBudgetCtx() {
  const lists = new FakeListRepo();
  const items = new FakeItemRepo();
  const budgets = new FakeBudgetRepo();
  const stores = new FakeStoreRepo();
  return {
    lists,
    items,
    budgets,
    stores,
    s: new BudgetService(lists, items, budgets),
  };
}

Deno.test("BudgetService: monthly budgets 12 entries + difference", () => {
  const ctx = freshBudgetCtx();
  ctx.lists.save(new GroceryList(1, 100, "L", yearMonth(2026, 4), true));
  ctx.items.save(new GroceryItem(1, 1, 10, "Leche", 2, "Litro", 10, false));
  ctx.stores.save(new Store(100, "W", ""));
  const bs = ctx.s.getMonthlyBudgets(2026);
  assertEquals(bs.length, 12);
  const april = bs.find((b) => b.month === 4)!;
  assertEquals(april.estimatedBudget, 20);
  assertEquals(april.period, "Abril 2026");
});

Deno.test("BudgetService: reconcile marks lists completed and upserts budget", () => {
  const ctx = freshBudgetCtx();
  ctx.lists.save(new GroceryList(1, 100, "L", yearMonth(2026, 4), false));
  const dto = {
    period: "Abril 2026",
    year: 2026,
    month: 4,
    estimatedBudget: 100,
    actualSpent: 80,
    difference: 20,
  };
  ctx.s.reconcileBudget(dto, 80);
  assertEquals(ctx.lists.findById(1)?.completed, true);
  assertEquals(ctx.budgets.findByPeriod(yearMonth(2026, 4))?.actualSpent, 80);
});

Deno.test("MasterListService: detail resolves store name via repository", () => {
  const lists = new FakeListRepo();
  const items = new FakeItemRepo();
  const stores = new FakeStoreRepo();
  stores.save(new Store(100, "Walmart", "#FF0000"));
  lists.save(new GroceryList(1, 100, "Lista A", yearMonth(2026, 4), false));
  items.save(new GroceryItem(1, 1, 10, "Leche", 2, "Litro", 10, false));
  const ms = new MasterListService(lists, items, stores);
  const detail = ms.getMasterListDetail("Abril", 2026);
  assertEquals(detail.stores.length, 1);
  assertEquals(detail.stores[0].storeName, "Walmart");
  assertEquals(detail.stores[0].storeColor, "#FF0000");
  assertEquals(detail.stores[0].storeTotal, 20);
});

Deno.test("ConfigurationService: CRUD on units/types/categories", () => {
  const u = new FakeNameRepo() as unknown as UnitRepository;
  const p = new FakeNameRepo() as unknown as ProductTypeRepository;
  const c = new FakeNameRepo() as unknown as CategoryRepository;
  const s = new ConfigurationService(u, p, c);
  s.addUnit("Nuevo");
  assertEquals(s.getAllUnits().includes("Nuevo"), true);
  s.deleteUnit("Nuevo");
  assertEquals(s.getAllUnits().includes("Nuevo"), false);
  s.addCategory("Cat");
  assertEquals(s.getAllCategories().includes("Cat"), true);
});

// ===== ProductService smoke =====
Deno.test("ProductService: create with price + validation", () => {
  const p = new FakeProductRepo();
  const pr = new FakePriceRepo();
  const st = new FakeStoreRepo();
  st.save(new Store(1, "S", ""));
  const s = new ProductService(p, pr, st);
  const d = s.createProduct({
    id: null,
    storeId: 1,
    storeName: "S",
    name: "Leche",
    unit: "Litro",
    productType: "Recurrente",
    category: "Lacteos",
    currentPrice: 25.5,
  });
  assertEquals(d.id != null, true);
  assertEquals(pr.findByProductId(d.id!).length, 1);
  assertEquals(pr.findCurrentByProductId(d.id!)?.price, 25.5);
  // validation
  assertThrows(
    () =>
      s.createProduct({
        id: null,
        storeId: 0,
        storeName: "",
        name: "",
        unit: "",
        productType: "",
        category: "",
        currentPrice: 0,
      }),
    ValidationException,
  );
});

// ===== PantryService =====
Deno.test("PantryService: consolidateFromList adds items", () => {
  const pr = new FakePantryRepo();
  const p = new FakeProductRepo();
  const pp = new FakePriceRepo();
  const st = new FakeStoreRepo();
  const ir = new FakeItemRepo();
  st.save(new Store(1, "S", ""));
  p.save(new Product(1, 1, "Arroz", "Kg", "Recurrente", "Abarrotes"));
  p.save(new Product(2, 1, "Frijol", "Kg", "Recurrente", "Abarrotes"));
  ir.save(new GroceryItem(null, 1, 1, "Arroz", 2, "Kg", 20, false));
  ir.save(new GroceryItem(null, 1, 2, "Frijol", 1, "Kg", 15, false));
  const s = new PantryService(pr, p, pp, st, ir);
  s.consolidateFromList(1);
  const all = s.getAll();
  assertEquals(all.length, 2);
  assertEquals(all[0].productName, "Arroz");
  assertEquals(all[0].quantity, 2);
  assertEquals(all[0].status, "Nuevo");
});

Deno.test("PantryService: consolidateFromList allows duplicates", () => {
  const pr = new FakePantryRepo();
  const p = new FakeProductRepo();
  const pp = new FakePriceRepo();
  const st = new FakeStoreRepo();
  const ir = new FakeItemRepo();
  st.save(new Store(1, "S", ""));
  p.save(new Product(1, 1, "Leche", "L", "Recurrente", "Lacteos"));
  ir.save(new GroceryItem(null, 1, 1, "Leche", 2, "L", 25, false));
  const s = new PantryService(pr, p, pp, st, ir);
  s.consolidateFromList(1);
  ir.save(new GroceryItem(null, 2, 1, "Leche", 1, "L", 25, false));
  s.consolidateFromList(2);
  const all = s.getAll();
  assertEquals(all.length, 2, "should create separate items (no merge)");
  assertEquals(all[0].status, "Nuevo");
  assertEquals(all[1].status, "Nuevo");
});

Deno.test("PantryService: delete item", () => {
  const pr = new FakePantryRepo();
  const p = new FakeProductRepo();
  const pp = new FakePriceRepo();
  const st = new FakeStoreRepo();
  const ir = new FakeItemRepo();
  st.save(new Store(1, "S", ""));
  p.save(new Product(1, 1, "Pan", "Pza", "Recurrente", "Panaderia"));
  ir.save(new GroceryItem(null, 1, 1, "Pan", 1, "Pza", 5, false));
  const s = new PantryService(pr, p, pp, st, ir);
  s.consolidateFromList(1);
  assertEquals(s.getAll().length, 1);
  s.deleteById(1);
  assertEquals(s.getAll().length, 0);
});

Deno.test("PantryService: delete non-existent throws", () => {
  const pr = new FakePantryRepo();
  const p = new FakeProductRepo();
  const pp = new FakePriceRepo();
  const st = new FakeStoreRepo();
  const ir = new FakeItemRepo();
  const s = new PantryService(pr, p, pp, st, ir);
  assertThrows(() => s.deleteById(999), EntityNotFoundException);
});

Deno.test("PantryService: updateStatus advances forward", () => {
  const pr = new FakePantryRepo();
  const p = new FakeProductRepo();
  const pp = new FakePriceRepo();
  const st = new FakeStoreRepo();
  const ir = new FakeItemRepo();
  st.save(new Store(1, "S", ""));
  p.save(new Product(1, 1, "Pan", "Pza", "Recurrente", "Panaderia"));
  ir.save(new GroceryItem(null, 1, 1, "Pan", 1, "Pza", 5, false));
  const s = new PantryService(pr, p, pp, st, ir);
  s.consolidateFromList(1);
  const item = s.getAll()[0];
  assertEquals(item.status, "Nuevo");
  s.updateStatus(item.id, "Comezado");
  assertEquals(s.getAll()[0].status, "Comezado");
  s.updateStatus(item.id, "Terminado");
  assertEquals(s.getAll()[0].status, "Terminado");
});

Deno.test("PantryService: updateStatus cannot go backward", () => {
  const pr = new FakePantryRepo();
  const p = new FakeProductRepo();
  const pp = new FakePriceRepo();
  const st = new FakeStoreRepo();
  const ir = new FakeItemRepo();
  st.save(new Store(1, "S", ""));
  p.save(new Product(1, 1, "Pan", "Pza", "Recurrente", "Panaderia"));
  ir.save(new GroceryItem(null, 1, 1, "Pan", 1, "Pza", 5, false));
  const s = new PantryService(pr, p, pp, st, ir);
  s.consolidateFromList(1);
  const item = s.getAll()[0];
  s.updateStatus(item.id, "Media vida");
  assertThrows(() => s.updateStatus(item.id, "Nuevo"), Error);
});

// ===== PantryService: History (records each status change) =====
Deno.test("PantryService: consolidate records Nuevo in history", () => {
  const pr = new FakePantryRepo();
  const p = new FakeProductRepo();
  const pp = new FakePriceRepo();
  const st = new FakeStoreRepo();
  const ir = new FakeItemRepo();
  const hr = new FakePantryHistoryRepo();
  st.save(new Store(1, "S", ""));
  p.save(new Product(1, 1, "Arroz", "Kg", "Recurrente", "Abarrotes"));
  const s = new PantryService(pr, p, pp, st, ir, hr as any);
  ir.save(new GroceryItem(null, 1, 1, "Arroz", 2, "Kg", 20, false));
  s.consolidateFromList(1);
  // Should record Nuevo in history for current month
  const periods = s.getHistoryPeriods();
  assertEquals(periods.length, 1);
  const entries = s.getHistory(periods[0]);
  assertEquals(entries.length, 1);
  assertEquals(entries[0].productName, "Arroz");
  assertEquals(entries[0].status, "Nuevo");
});

Deno.test("PantryService: status changes recorded in history", () => {
  const pr = new FakePantryRepo();
  const p = new FakeProductRepo();
  const pp = new FakePriceRepo();
  const st = new FakeStoreRepo();
  const ir = new FakeItemRepo();
  const hr = new FakePantryHistoryRepo();
  st.save(new Store(1, "S", ""));
  p.save(new Product(1, 1, "Arroz", "Kg", "Recurrente", "Abarrotes"));
  const s = new PantryService(pr, p, pp, st, ir, hr as any);
  ir.save(new GroceryItem(null, 1, 1, "Arroz", 2, "Kg", 20, false));
  s.consolidateFromList(1);
  const item = s.getAll()[0];
  // Advance through states — each change records an entry
  s.updateStatus(item.id, "Comezado");
  s.updateStatus(item.id, "Media vida");
  s.updateStatus(item.id, "Terminado");
  const periods = s.getHistoryPeriods();
  const entries = s.getHistory(periods[0]);
  assertEquals(entries.length, 4); // Nuevo + Comezado + Media vida + Terminado
  assertEquals(entries[0].status, "Nuevo");
  assertEquals(entries[1].status, "Comezado");
  assertEquals(entries[2].status, "Media vida");
  assertEquals(entries[3].status, "Terminado");
});

Deno.test("PantryService: Merma recorded in history", () => {
  const pr = new FakePantryRepo();
  const p = new FakeProductRepo();
  const pp = new FakePriceRepo();
  const st = new FakeStoreRepo();
  const ir = new FakeItemRepo();
  const hr = new FakePantryHistoryRepo();
  st.save(new Store(1, "S", ""));
  p.save(new Product(1, 1, "Arroz", "Kg", "Recurrente", "Abarrotes"));
  const s = new PantryService(pr, p, pp, st, ir, hr as any);
  ir.save(new GroceryItem(null, 1, 1, "Arroz", 2, "Kg", 20, false));
  s.consolidateFromList(1);
  const item = s.getAll()[0];
  s.updateStatus(item.id, "Comezado");
  s.updateStatus(item.id, "Merma");
  const periods = s.getHistoryPeriods();
  const entries = s.getHistory(periods[0]);
  assertEquals(entries.length, 3); // Nuevo + Comezado + Merma
  assertEquals(entries[2].status, "Merma");
});

Deno.test("PantryService: soft delete recorded as Eliminado in history", () => {
  const pr = new FakePantryRepo();
  const p = new FakeProductRepo();
  const pp = new FakePriceRepo();
  const st = new FakeStoreRepo();
  const ir = new FakeItemRepo();
  const hr = new FakePantryHistoryRepo();
  st.save(new Store(1, "S", ""));
  p.save(new Product(1, 1, "Arroz", "Kg", "Recurrente", "Abarrotes"));
  const s = new PantryService(pr, p, pp, st, ir, hr as any);
  ir.save(new GroceryItem(null, 1, 1, "Arroz", 2, "Kg", 20, false));
  s.consolidateFromList(1);
  s.deleteById(1); // soft delete -> Eliminado
  const periods = s.getHistoryPeriods();
  const entries = s.getHistory(periods[0]);
  assertEquals(entries.length, 2); // Nuevo + Eliminado
  assertEquals(entries[1].status, "Eliminado");
});

Deno.test("PantryService: history is read-only", () => {
  const hr = new FakePantryHistoryRepo();
  const s = new PantryService(
    new FakePantryRepo(),
    new FakeProductRepo(),
    new FakePriceRepo(),
    new FakeStoreRepo(),
    new FakeItemRepo(),
    hr as any,
  );
  assertEquals(typeof s.getHistory, "function");
  assertEquals(typeof s.getHistoryPeriods, "function");
});

Deno.test("ProductService: update always inserts new price row", () => {
  const p = new FakeProductRepo();
  const pr = new FakePriceRepo();
  const st = new FakeStoreRepo();
  st.save(new Store(1, "S", ""));
  const s = new ProductService(p, pr, st);
  const d = s.createProduct({
    id: null,
    storeId: 1,
    storeName: "S",
    name: "Leche",
    unit: "Litro",
    productType: "Recurrente",
    category: "Lacteos",
    currentPrice: 10,
  });
  s.updateProduct(d.id!, { ...d, currentPrice: 12 });
  assertEquals(pr.findByProductId(d.id!).length, 2);
  assertEquals(pr.findCurrentByProductId(d.id!)?.price, 12);
});
