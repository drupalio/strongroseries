import type { LocalDate, YearMonth } from "./dates.ts";

export abstract class BaseEntity {
  id: number | null = null;
  createdAt: string;
  updatedAt: string;

  constructor(id: number | null = null) {
    const now = new Date().toISOString();
    this.createdAt = now;
    this.updatedAt = now;
    if (id !== null) this.id = id;
  }

  protected markUpdated(): void {
    this.updatedAt = new Date().toISOString();
  }
}

export class Store extends BaseEntity {
  name: string;
  color: string;

  constructor(
    id: number | null = null,
    name: string = "",
    color: string = "",
  ) {
    super(id);
    this.name = name;
    this.color = color;
  }
  setName(n: string) {
    this.name = n;
    this.markUpdated();
  }
  setColor(c: string) {
    this.color = c;
    this.markUpdated();
  }
}

export class Product extends BaseEntity {
  storeId: number;
  name: string;
  unit: string;
  productType: string;
  category: string;

  constructor(
    id: number | null = null,
    storeId: number = 0,
    name: string = "",
    unit: string = "",
    productType: string = "",
    category: string = "",
  ) {
    super(id);
    this.storeId = storeId;
    this.name = name;
    this.unit = unit;
    this.productType = productType;
    this.category = category;
  }
  setStoreId(v: number) {
    this.storeId = v;
    this.markUpdated();
  }
  setName(v: string) {
    this.name = v;
    this.markUpdated();
  }
  setUnit(v: string) {
    this.unit = v;
    this.markUpdated();
  }
  setProductType(v: string) {
    this.productType = v;
    this.markUpdated();
  }
  setCategory(v: string) {
    this.category = v;
    this.markUpdated();
  }
}

export class GroceryList extends BaseEntity {
  storeId: number;
  name: string;
  month: YearMonth;
  completed = false;

  constructor(
    id: number | null = null,
    storeId: number = 0,
    name: string = "",
    month: YearMonth = "",
    completed = false,
  ) {
    super(id);
    this.storeId = storeId;
    this.name = name;
    this.month = month;
    this.completed = completed;
  }
  setStoreId(v: number) {
    this.storeId = v;
    this.markUpdated();
  }
  setName(v: string) {
    this.name = v;
    this.markUpdated();
  }
  setMonth(v: YearMonth) {
    this.month = v;
    this.markUpdated();
  }
  setCompleted(v: boolean) {
    this.completed = v;
    this.markUpdated();
  }
}

export class GroceryItem extends BaseEntity {
  groceryListId: number;
  productId: number;
  productName: string;
  quantity = 1;
  unit: string;
  priceAtPurchase: number = 0;
  checked = false;

  constructor(
    id: number | null = null,
    groceryListId: number = 0,
    productId: number = 0,
    productName: string = "",
    quantity = 1,
    unit: string = "",
    priceAtPurchase: number = 0,
    checked = false,
  ) {
    super(id);
    this.groceryListId = groceryListId;
    this.productId = productId;
    this.productName = productName;
    this.quantity = quantity;
    this.unit = unit;
    this.priceAtPurchase = priceAtPurchase;
    this.checked = checked;
  }
  setGroceryListId(v: number) {
    this.groceryListId = v;
    this.markUpdated();
  }
  setProductId(v: number) {
    this.productId = v;
    this.markUpdated();
  }
  setProductName(v: string) {
    this.productName = v;
    this.markUpdated();
  }
  setQuantity(v: number) {
    this.quantity = v;
    this.markUpdated();
  }
  setUnit(v: string) {
    this.unit = v;
    this.markUpdated();
  }
  setPriceAtPurchase(v: number) {
    this.priceAtPurchase = v;
    this.markUpdated();
  }
  setChecked(v: boolean) {
    this.checked = v;
    this.markUpdated();
  }
}

export class ProductPrice extends BaseEntity {
  productId: number;
  price: number;
  effectiveDate: LocalDate;

  constructor(
    id: number | null = null,
    productId: number = 0,
    price: number = 0,
    effectiveDate: LocalDate = "",
  ) {
    super(id);
    this.productId = productId;
    this.price = price;
    this.effectiveDate = effectiveDate;
  }
  setProductId(v: number) {
    this.productId = v;
    this.markUpdated();
  }
  setPrice(v: number) {
    this.price = v;
    this.markUpdated();
  }
  setEffectiveDate(v: LocalDate) {
    this.effectiveDate = v;
    this.markUpdated();
  }
}

export type PantryItemStatus =
  | "Nuevo"
  | "Comezado"
  | "Media vida"
  | "Por terminar"
  | "Merma"
  | "Terminado"
  | "Eliminado";

export const PANTRY_STATUS_ORDER: PantryItemStatus[] = [
  "Nuevo",
  "Comezado",
  "Media vida",
  "Por terminar",
  "Terminado",
];

export class PantryHistoryEntry {
  constructor(
    public id: number | null = null,
    public period: string,
    public productId: number,
    public productName: string,
    public quantity: number = 1,
    public status: PantryItemStatus = "Nuevo",
    public unit: string = "",
    public storeName: string = "",
    public estimatedValue: number = 0,
    public mermaReason: string = "",
    public createdAt: string = new Date().toISOString(),
  ) {}
}

export class PantryItem extends BaseEntity {
  productId: number;
  quantity: number = 1;
  status: PantryItemStatus = "Nuevo";
  mermaReason: string = "";

  constructor(
    id: number | null = null,
    productId: number,
    quantity = 1,
    status: PantryItemStatus = "Nuevo",
    mermaReason = "",
  ) {
    super(id);
    this.productId = productId;
    this.quantity = quantity;
    this.status = status;
    this.mermaReason = mermaReason;
  }
  setQuantity(v: number) {
    this.quantity = v;
    this.markUpdated();
  }
  setStatus(v: PantryItemStatus) {
    this.status = v;
    this.markUpdated();
  }
  setMermaReason(v: string) {
    this.mermaReason = v;
    this.markUpdated();
  }
}

export class Budget extends BaseEntity {
  period: YearMonth;
  estimatedBudget: number;
  actualSpent: number;

  constructor(
    id: number | null = null,
    period: YearMonth = "",
    estimatedBudget: number = 0,
    actualSpent: number = 0,
  ) {
    super(id);
    this.period = period;
    this.estimatedBudget = estimatedBudget;
    this.actualSpent = actualSpent;
  }
  setPeriod(v: YearMonth) {
    this.period = v;
    this.markUpdated();
  }
  setEstimatedBudget(v: number) {
    this.estimatedBudget = v;
    this.markUpdated();
  }
  setActualSpent(v: number) {
    this.actualSpent = v;
    this.markUpdated();
  }
}
