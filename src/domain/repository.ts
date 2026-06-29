import type {
  Budget,
  GroceryItem,
  GroceryList,
  PantryHistoryEntry,
  PantryItem,
  Product,
  ProductPrice,
  Store,
} from "./entity.ts";
import type { LocalDate, YearMonth } from "./dates.ts";

export interface StoreRepository {
  findAll(): Store[];
  findById(id: number): Store | null;
  save(store: Store): Store;
  deleteById(id: number): void;
}

export interface ProductRepository {
  findAll(): Product[];
  findByStoreId(storeId: number): Product[];
  findRecurrentByStoreId(storeId: number): Product[];
  findById(id: number): Product | null;
  save(product: Product): Product;
  deleteById(id: number): void;
}

export interface ProductPriceRepository {
  findByProductId(productId: number): ProductPrice[];
  findCurrentByProductId(productId: number): ProductPrice | null;
  save(price: ProductPrice): ProductPrice;
  deleteById(id: number): void;
}

export interface GroceryListRepository {
  findAll(): GroceryList[];
  findByStoreId(storeId: number): GroceryList[];
  findById(id: number): GroceryList | null;
  save(list: GroceryList): GroceryList;
  deleteById(id: number): void;
  deleteByMonth(month: YearMonth): void;
  findCompletedByStoreId(storeId: number): GroceryList[];
  countCompletedByStoreId(storeId: number): number;
  findByDateRange(start: YearMonth, end: YearMonth): GroceryList[];
  findByItemNameContains(itemName: string): GroceryList[];
}

export interface GroceryItemRepository {
  findByGroceryListId(groceryListId: number): GroceryItem[];
  findById(id: number): GroceryItem | null;
  save(item: GroceryItem): GroceryItem;
  deleteById(id: number): void;
  deleteByGroceryListId(groceryListId: number): void;
  countByProductId(productId: number): number;
  findStoreIdsByProductId(productId: number): number[];
}

export interface BudgetRepository {
  findAll(): Budget[];
  findByPeriod(period: YearMonth): Budget | null;
  save(budget: Budget): Budget;
  deleteById(id: number): void;
}

export interface SimpleNameRepository {
  findAll(): string[];
  save(name: string): void;
  delete(name: string): void;
}

export interface PantryRepository {
  findAll(): PantryItem[];
  findById(id: number): PantryItem | null;
  findByProductId(productId: number): PantryItem[];
  save(item: PantryItem): PantryItem;
  deleteById(id: number): void;
}

export interface PantryHistoryRepository {
  findByPeriod(period: string): PantryHistoryEntry[];
  findAllPeriods(): string[];
  save(entry: PantryHistoryEntry): void;
}

export type UnitRepository = SimpleNameRepository;
export type ProductTypeRepository = SimpleNameRepository;
export type CategoryRepository = SimpleNameRepository;
