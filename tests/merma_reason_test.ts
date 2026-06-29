import { PantryService } from "../src/application/services.ts";
import {
  GroceryItem,
  PantryItem,
  Product,
  Store,
} from "../src/domain/entity.ts";
import { assertEquals } from "@std/assert";

// Minimal fakes (same pattern as services_test.ts)
class FakePantryRepo {
  data = new Map<number, any>();
  next = 1;
  findAll() {
    return [...this.data.values()].filter((p: any) => p.status !== "Eliminado");
  }
  findById(id: number) {
    return this.data.get(id) ?? null;
  }
  findByProductId(productId: number) {
    return [...this.data.values()].filter((p: any) =>
      p.productId === productId
    );
  }
  save(item: any) {
    if (item.id == null) item.id = this.next++;
    this.data.set(item.id, item);
    return item;
  }
  deleteById(id: number) {
    this.data.delete(id);
  }
}
class FakeProductRepo {
  data = new Map<number, any>();
  findAll() {
    return [...this.data.values()];
  }
  findById(id: number) {
    return this.data.get(id) ?? null;
  }
  save(p: any) {
    this.data.set(p.id!, p);
    return p;
  }
  deleteById(id: number) {
    this.data.delete(id);
  }
}
class FakePriceRepo {
  data = new Map<number, any>();
  findAll() {
    return [];
  }
  findById(id: number) {
    return null;
  }
  findByProductId(id: number) {
    return [];
  }
  findCurrentByProductId(id: number) {
    return this.data.get(id) ?? null;
  }
  save(pp: any) {
    this.data.set(pp.productId, pp);
    return pp;
  }
  deleteById(id: number) {}
}
class FakeStoreRepo {
  data = new Map<number, any>();
  findAll() {
    return [...this.data.values()];
  }
  findById(id: number) {
    return this.data.get(id) ?? null;
  }
  save(s: any) {
    this.data.set(s.id!, s);
    return s;
  }
  deleteById(id: number) {
    this.data.delete(id);
  }
}
class FakeItemRepo {
  data: any[] = [];
  next = 1;
  findAll() {
    return this.data;
  }
  findById(id: number) {
    return this.data.find((i: any) => i.id === id) ?? null;
  }
  findByGroceryListId(id: number) {
    return this.data.filter((i: any) => i.groceryListId === id);
  }
  save(item: any) {
    if (item.id == null) item.id = this.next++;
    this.data.push(item);
    return item;
  }
  deleteById(id: number) {
    this.data = this.data.filter((i: any) => i.id !== id);
  }
}
class FakeHistRepo {
  data = new Map<string, any[]>();
  next = 1;
  findByPeriod(period: string) {
    return this.data.get(period) ?? [];
  }
  findAllPeriods() {
    return [...this.data.keys()].sort();
  }
  save(entry: any) {
    const arr = this.data.get(entry.period) ?? [];
    arr.push({ ...entry, id: this.next++ });
    this.data.set(entry.period, arr);
  }
}

Deno.test("PantryService: Merma records reason in history", () => {
  const pr = new FakePantryRepo();
  const prodR = new FakeProductRepo();
  const ppR = new FakePriceRepo();
  const stR = new FakeStoreRepo();
  const itR = new FakeItemRepo();
  const histR = new FakeHistRepo();
  stR.save(new Store(1, "S", ""));
  prodR.save(new Product(1, 1, "Arroz", "Kg", "Recurrente", "Abarrotes"));
  const svc = new PantryService(
    pr as any,
    prodR as any,
    ppR as any,
    stR as any,
    itR as any,
    histR as any,
  );
  itR.save(new GroceryItem(null, 1, 1, "Arroz", 2, "Kg", 20, false));
  svc.consolidateFromList(1);
  const item = svc.getAll()[0];
  svc.updateStatus(item.id, "Merma", "Caducidad");
  const periods = svc.getHistoryPeriods();
  const entries = svc.getHistory(periods[0]);
  const m = entries.find((e) => e.status === "Merma");
  assertEquals(
    m!.mermaReason,
    "Caducidad",
    "Merma mermaReason should be 'Caducidad'",
  );
});

Deno.test("PantryService: delete records reason in history", () => {
  const pr = new FakePantryRepo();
  const prodR = new FakeProductRepo();
  const ppR = new FakePriceRepo();
  const stR = new FakeStoreRepo();
  const itR = new FakeItemRepo();
  const histR = new FakeHistRepo();
  stR.save(new Store(1, "S", ""));
  prodR.save(new Product(2, 1, "Pan", "Pza", "Recurrente", "Panaderia"));
  const svc = new PantryService(
    pr as any,
    prodR as any,
    ppR as any,
    stR as any,
    itR as any,
    histR as any,
  );
  pr.save(new PantryItem(null, 2, 3, "Nuevo"));
  const all = pr.findAll();
  const saved = all.find((p) => p.productId === 2);
  svc.deleteById(saved!.id!, "Obsolescencia");
  const periods = svc.getHistoryPeriods();
  const entries = svc.getHistory(periods[0]);
  const d = entries.find((e) => e.status === "Eliminado");
  assertEquals(
    d!.mermaReason,
    "Obsolescencia",
    "Delete mermaReason should be 'Obsolescencia'",
  );
});
