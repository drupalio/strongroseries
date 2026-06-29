import type {
  BudgetRepository as IBudgetRepository,
  GroceryItemRepository as IGroceryItemRepository,
  GroceryListRepository as IGroceryListRepository,
  PantryHistoryRepository as IPantryHistoryRepository,
  PantryRepository as IPantryRepository,
  ProductPriceRepository as IProductPriceRepository,
  ProductRepository as IProductRepository,
  SimpleNameRepository,
  StoreRepository as IStoreRepository,
} from "../domain/repository.ts";
import {
  Budget,
  GroceryItem,
  GroceryList,
  PANTRY_STATUS_ORDER,
  PantryHistoryEntry,
  PantryItem,
  type PantryItemStatus,
  Product,
  ProductPrice,
  Store,
} from "../domain/entity.ts";
import {
  type LocalDate,
  parseYearMonth,
  type YearMonth,
} from "../domain/dates.ts";
import { Database } from "./database.ts";

type Params = (string | number | null)[];

export class StoreRepository implements IStoreRepository {
  constructor(private db: Database) {}
  findAll(): Store[] {
    return this.db.query<Record<string, any>>(
      "SELECT * FROM stores ORDER BY name",
    ).map(mapStore);
  }
  findById(id: number): Store | null {
    const r = this.db.queryFirst<Record<string, any>>(
      "SELECT * FROM stores WHERE id = ?",
      [id],
    );
    return r ? mapStore(r) : null;
  }
  save(store: Store): Store {
    if (store.id == null) {
      store.id = this.db.runReturningId(
        "INSERT INTO stores (name, color) VALUES (?, ?) RETURNING id",
        [store.name, store.color],
      );
    } else {
      this.db.run(
        "UPDATE stores SET name = ?, color = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [store.name, store.color, store.id],
      );
    }
    return store;
  }
  deleteById(id: number): void {
    this.db.run("DELETE FROM stores WHERE id = ?", [id]);
  }
}

export class ProductRepository implements IProductRepository {
  constructor(private db: Database) {}
  findAll(): Product[] {
    return this.db.query<Record<string, any>>(
      "SELECT * FROM products ORDER BY name",
    ).map(mapProduct);
  }
  findByStoreId(storeId: number): Product[] {
    return this.db.query<Record<string, any>>(
      "SELECT * FROM products WHERE store_id = ? ORDER BY name",
      [storeId],
    ).map(mapProduct);
  }
  findRecurrentByStoreId(storeId: number): Product[] {
    return this.db.query<Record<string, any>>(
      "SELECT * FROM products WHERE store_id = ? AND product_type = 'Recurrente' ORDER BY name",
      [storeId],
    ).map(mapProduct);
  }
  findById(id: number): Product | null {
    const r = this.db.queryFirst<Record<string, any>>(
      "SELECT * FROM products WHERE id = ?",
      [id],
    );
    return r ? mapProduct(r) : null;
  }
  save(product: Product): Product {
    if (product.id == null) {
      product.id = this.db.runReturningId(
        "INSERT INTO products (store_id, name, unit, product_type, category) VALUES (?, ?, ?, ?, ?) RETURNING id",
        [
          product.storeId,
          product.name,
          product.unit,
          product.productType,
          product.category,
        ],
      );
    } else {
      this.db.run(
        "UPDATE products SET store_id = ?, name = ?, unit = ?, product_type = ?, category = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [
          product.storeId,
          product.name,
          product.unit,
          product.productType,
          product.category,
          product.id,
        ],
      );
    }
    return product;
  }
  deleteById(id: number): void {
    this.db.run("DELETE FROM products WHERE id = ?", [id]);
  }
}

export class ProductPriceRepository implements IProductPriceRepository {
  constructor(private db: Database) {}
  findByProductId(productId: number): ProductPrice[] {
    return this.db.query<Record<string, any>>(
      "SELECT * FROM product_prices WHERE product_id = ? ORDER BY effective_date DESC",
      [productId],
    ).map(mapPrice);
  }
  findCurrentByProductId(productId: number): ProductPrice | null {
    const r = this.db.queryFirst<Record<string, any>>(
      "SELECT * FROM product_prices WHERE product_id = ? ORDER BY effective_date DESC, id DESC LIMIT 1",
      [productId],
    );
    return r ? mapPrice(r) : null;
  }
  save(price: ProductPrice): ProductPrice {
    const priceVal = price.price;
    const dateVal = price.effectiveDate;
    console.log("[ProductPriceRepository.save] INSERT:", { productId: price.productId, price: priceVal, date: dateVal, id: price.id });
    if (price.id == null) {
      price.id = this.db.runReturningId(
        "INSERT INTO product_prices (product_id, price, effective_date) VALUES (?, ?, ?) RETURNING id",
        [price.productId, priceVal, dateVal],
      );
      console.log("[ProductPriceRepository.save] INSERT OK, new id:", price.id);
    } else {
      this.db.run(
        "UPDATE product_prices SET price = ?, effective_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [priceVal, dateVal, price.id],
      );
      console.log("[ProductPriceRepository.save] UPDATE OK, id:", price.id);
    }
    return price;
  }
  deleteById(id: number): void {
    this.db.run("DELETE FROM product_prices WHERE id = ?", [id]);
  }
}

export class GroceryListRepository implements IGroceryListRepository {
  constructor(private db: Database) {}
  findAll(): GroceryList[] {
    return this.db.query<Record<string, any>>(
      "SELECT * FROM grocery_lists ORDER BY month DESC, name",
    ).map(mapList);
  }
  findByStoreId(storeId: number): GroceryList[] {
    return this.db.query<Record<string, any>>(
      "SELECT * FROM grocery_lists WHERE store_id = ? ORDER BY month DESC",
      [storeId],
    ).map(mapList);
  }
  findById(id: number): GroceryList | null {
    const r = this.db.queryFirst<Record<string, any>>(
      "SELECT * FROM grocery_lists WHERE id = ?",
      [id],
    );
    return r ? mapList(r) : null;
  }
  save(list: GroceryList): GroceryList {
    if (list.id == null) {
      list.id = this.db.runReturningId(
        "INSERT INTO grocery_lists (store_id, name, month, completed) VALUES (?, ?, ?, ?) RETURNING id",
        [list.storeId, list.name, list.month, list.completed ? 1 : 0],
      );
    } else {
      this.db.run(
        "UPDATE grocery_lists SET store_id = ?, name = ?, month = ?, completed = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [list.storeId, list.name, list.month, list.completed ? 1 : 0, list.id],
      );
    }
    return list;
  }
  deleteById(id: number): void {
    this.db.run("DELETE FROM grocery_lists WHERE id = ?", [id]);
  }
  deleteByMonth(month: YearMonth): void {
    this.db.run("DELETE FROM grocery_lists WHERE month = ?", [month]);
  }
  findCompletedByStoreId(storeId: number): GroceryList[] {
    return this.db.query<Record<string, any>>(
      "SELECT * FROM grocery_lists WHERE store_id = ? AND completed = 1 ORDER BY month DESC",
      [storeId],
    ).map(mapList);
  }
  countCompletedByStoreId(storeId: number): number {
    return this.db.queryFirstScalar<number>(
      "SELECT COUNT(*) AS c FROM grocery_lists WHERE store_id = ? AND completed = 1",
      [storeId],
    ) ?? 0;
  }
  findByDateRange(start: YearMonth, end: YearMonth): GroceryList[] {
    return this.db.query<Record<string, any>>(
      "SELECT * FROM grocery_lists WHERE month >= ? AND month <= ? ORDER BY month DESC",
      [start, end],
    ).map(mapList);
  }
  findByItemNameContains(itemName: string): GroceryList[] {
    return this.db.query<Record<string, any>>(
      "SELECT DISTINCT gl.* FROM grocery_lists gl JOIN grocery_items gi ON gl.id = gi.grocery_list_id WHERE LOWER(gi.product_name) LIKE LOWER(?) ORDER BY gl.month DESC",
      [`%${itemName}%`],
    ).map(mapList);
  }
}

export class GroceryItemRepository implements IGroceryItemRepository {
  constructor(private db: Database) {}
  findByGroceryListId(groceryListId: number): GroceryItem[] {
    return this.db.query<Record<string, any>>(
      "SELECT * FROM grocery_items WHERE grocery_list_id = ? ORDER BY created_at",
      [groceryListId],
    ).map(mapItem);
  }
  findById(id: number): GroceryItem | null {
    const r = this.db.queryFirst<Record<string, any>>(
      "SELECT * FROM grocery_items WHERE id = ?",
      [id],
    );
    return r ? mapItem(r) : null;
  }
  save(item: GroceryItem): GroceryItem {
    const priceVal = item.priceAtPurchase;
    if (item.id == null) {
      item.id = this.db.runReturningId(
        "INSERT INTO grocery_items (grocery_list_id, product_id, product_name, unit, quantity, price_at_purchase, checked) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id",
        [
          item.groceryListId,
          item.productId,
          item.productName,
          item.unit,
          item.quantity,
          priceVal,
          item.checked ? 1 : 0,
        ],
      );
    } else {
      this.db.run(
        "UPDATE grocery_items SET quantity = ?, price_at_purchase = ?, checked = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [item.quantity, priceVal, item.checked ? 1 : 0, item.id],
      );
    }
    return item;
  }
  deleteById(id: number): void {
    this.db.run("DELETE FROM grocery_items WHERE id = ?", [id]);
  }
  deleteByGroceryListId(groceryListId: number): void {
    this.db.run("DELETE FROM grocery_items WHERE grocery_list_id = ?", [
      groceryListId,
    ]);
  }
  countByProductId(productId: number): number {
    return this.db.queryFirstScalar<number>(
      "SELECT COUNT(*) AS c FROM grocery_items WHERE product_id = ?",
      [productId],
    ) ?? 0;
  }
  findStoreIdsByProductId(productId: number): number[] {
    const rows = this.db.query<Record<string, any>>(
      "SELECT DISTINCT gl.store_id AS sid FROM grocery_items gi JOIN grocery_lists gl ON gi.grocery_list_id = gl.id WHERE gi.product_id = ?",
      [productId],
    );
    return rows.map((r) => r.sid as number);
  }
}

export class BudgetRepository implements IBudgetRepository {
  constructor(private db: Database) {}
  findAll(): Budget[] {
    return this.db.query<Record<string, any>>(
      "SELECT * FROM budgets ORDER BY period",
    ).map(mapBudget);
  }
  findByPeriod(period: YearMonth): Budget | null {
    const r = this.db.queryFirst<Record<string, any>>(
      "SELECT * FROM budgets WHERE period = ?",
      [period],
    );
    return r ? mapBudget(r) : null;
  }
  save(budget: Budget): Budget {
    const est = String(budget.estimatedBudget);
    const act = String(budget.actualSpent);
    if (budget.id == null) {
      budget.id = this.db.runReturningId(
        "INSERT INTO budgets (period, estimated_budget, actual_spent) VALUES (?, ?, ?) RETURNING id",
        [budget.period, est, act],
      );
    } else {
      this.db.run(
        "UPDATE budgets SET estimated_budget = ?, actual_spent = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [est, act, budget.id],
      );
    }
    return budget;
  }
  deleteById(id: number): void {
    this.db.run("DELETE FROM budgets WHERE id = ?", [id]);
  }
}

export class PantryHistoryRepo implements IPantryHistoryRepository {
  constructor(private db: Database) {}
  findByPeriod(period: string): PantryHistoryEntry[] {
    return this.db.query<Record<string, any>>(
      "SELECT * FROM pantry_history WHERE period = ? ORDER BY id",
      [period],
    ).map(mapPantryHistory);
  }
  findAllPeriods(): string[] {
    const rows = this.db.query<Record<string, any>>(
      "SELECT DISTINCT period FROM pantry_history ORDER BY period",
    );
    return rows.map((r) => r.period as string);
  }
  save(entry: PantryHistoryEntry): void {
    this.db.run(
      "INSERT INTO pantry_history (period, product_id, product_name, quantity, status, unit, store_name, estimated_value, merma_reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        entry.period,
        entry.productId,
        entry.productName,
        entry.quantity,
        entry.status,
        entry.unit,
        entry.storeName,
        entry.estimatedValue,
        entry.mermaReason,
      ],
    );
  }
}

export class PantryRepository implements IPantryRepository {
  constructor(private db: Database) {}
  findAll(): PantryItem[] {
    return this.db.query<Record<string, any>>(
      "SELECT * FROM pantry_items ORDER BY id",
    ).map(mapPantryItem);
  }
  findById(id: number): PantryItem | null {
    const r = this.db.queryFirst<Record<string, any>>(
      "SELECT * FROM pantry_items WHERE id = ?",
      [id],
    );
    return r ? mapPantryItem(r) : null;
  }
  findByProductId(productId: number): PantryItem[] {
    return this.db.query<Record<string, any>>(
      "SELECT * FROM pantry_items WHERE product_id = ? ORDER BY id",
      [productId],
    ).map(mapPantryItem);
  }
  save(item: PantryItem): PantryItem {
    if (item.id == null) {
      item.id = this.db.runReturningId(
        "INSERT INTO pantry_items (product_id, quantity, status, merma_reason) VALUES (?, ?, ?, ?) RETURNING id",
        [item.productId, item.quantity, item.status, item.mermaReason],
      );
    } else {
      this.db.run(
        "UPDATE pantry_items SET quantity = ?, status = ?, merma_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [item.quantity, item.status, item.mermaReason, item.id],
      );
    }
    return item;
  }
  deleteById(id: number): void {
    this.db.run("DELETE FROM pantry_items WHERE id = ?", [id]);
  }
}

export class SimpleNameRepoImpl implements SimpleNameRepository {
  constructor(private db: Database, private table: string) {}
  findAll(): string[] {
    return this.db.query<Record<string, any>>(
      `SELECT name FROM ${this.table} ORDER BY name`,
    ).map((r) => r.name as string);
  }
  save(name: string): void {
    this.db.run(`INSERT OR IGNORE INTO ${this.table} (name) VALUES (?)`, [
      name,
    ]);
  }
  delete(name: string): void {
    this.db.run(`DELETE FROM ${this.table} WHERE name = ?`, [name]);
  }
}

export class CategoryRepository extends SimpleNameRepoImpl {
  constructor(db: Database) {
    super(db, "categories");
  }
}
export class ProductTypeRepository extends SimpleNameRepoImpl {
  constructor(db: Database) {
    super(db, "product_types");
  }
}
export class UnitRepository extends SimpleNameRepoImpl {
  constructor(db: Database) {
    super(db, "units");
  }
}

function mapStore(r: Record<string, any>): Store {
  const s = new Store(Number(r.id), r.name, r.color);
  s.createdAt = r.created_at ?? s.createdAt;
  s.updatedAt = r.updated_at ?? s.updatedAt;
  return s;
}
function mapProduct(r: Record<string, any>): Product {
  const p = new Product(
    Number(r.id),
    Number(r.store_id),
    r.name,
    r.unit,
    r.product_type,
    r.category,
  );
  p.createdAt = r.created_at ?? p.createdAt;
  p.updatedAt = r.updated_at ?? p.updatedAt;
  return p;
}
function mapPrice(r: Record<string, any>): ProductPrice {
  const price = Number(r.price);
  const pp = new ProductPrice(
    Number(r.id),
    Number(r.product_id),
    price,
    r.effective_date,
  );
  pp.createdAt = r.created_at ?? pp.createdAt;
  pp.updatedAt = r.updated_at ?? pp.updatedAt;
  return pp;
}
function mapList(r: Record<string, any>): GroceryList {
  const l = new GroceryList(
    Number(r.id),
    Number(r.store_id),
    r.name,
    r.month as YearMonth,
    Number(r.completed) === 1,
  );
  l.createdAt = r.created_at ?? l.createdAt;
  l.updatedAt = r.updated_at ?? l.updatedAt;
  return l;
}
function mapItem(r: Record<string, any>): GroceryItem {
  const i = new GroceryItem(
    Number(r.id),
    Number(r.grocery_list_id),
    Number(r.product_id),
    r.product_name,
    Number(r.quantity ?? 1),
    r.unit,
    Number(r.price_at_purchase),
    Number(r.checked) === 1,
  );
  i.createdAt = r.created_at ?? i.createdAt;
  i.updatedAt = r.updated_at ?? i.updatedAt;
  return i;
}
function mapPantryItem(r: Record<string, any>): PantryItem {
  const p = new PantryItem(
    Number(r.id),
    Number(r.product_id),
    Number(r.quantity),
    r.status as PantryItemStatus,
    r.merma_reason,
  );
  p.createdAt = r.created_at ?? p.createdAt;
  p.updatedAt = r.updated_at ?? p.updatedAt;
  return p;
}

function mapPantryHistory(r: Record<string, any>): PantryHistoryEntry {
  return new PantryHistoryEntry(
    Number(r.id),
    r.period as string,
    Number(r.product_id),
    r.product_name,
    Number(r.quantity),
    r.status as PantryItemStatus,
    r.unit,
    r.store_name,
    Number(r.estimated_value),
    r.merma_reason,
    r.created_at,
  );
}

function mapBudget(r: Record<string, any>): Budget {
  const b = new Budget(Number(r.id), r.period as YearMonth, Number(r.estimated_budget), Number(r.actual_spent));
  b.createdAt = r.created_at ?? b.createdAt;
  b.updatedAt = r.updated_at ?? b.updatedAt;
  return b;
}
