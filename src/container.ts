import { Database } from "./infrastructure/database.ts";
import {
  BudgetRepository,
  CategoryRepository,
  GroceryItemRepository,
  GroceryListRepository,
  PantryHistoryRepo,
  PantryRepository,
  ProductPriceRepository,
  ProductRepository,
  ProductTypeRepository,
  StoreRepository,
  UnitRepository,
} from "./infrastructure/repositories.ts";
import {
  BudgetService,
  ConfigurationService,
  GroceryListService,
  MasterListService,
  PantryService,
  ProductService,
  StoreService,
} from "./application/services.ts";
import { AIService } from "./ai/ai_service.ts";

export interface Container {
  db: Database;
  stores: StoreService;
  products: ProductService;
  lists: GroceryListService;
  master: MasterListService;
  budgets: BudgetService;
  config: ConfigurationService;
  ai: AIService;
  pantry: PantryService;
  storeRepo: StoreRepository;
  productRepo: ProductRepository;
  priceRepo: ProductPriceRepository;
  listRepo: GroceryListRepository;
  itemRepo: GroceryItemRepository;
  budgetRepo: BudgetRepository;
  pantryRepo: PantryRepository;
  pantryHistoryRepo: PantryHistoryRepo;
}

export function createContainer(db?: Database): Container {
  const dbPath = (() => {
    if (db) return null;
    return Deno.cwd() + "/groseries.db";
  })();
  const database = db ?? new Database(dbPath!);
  if (!db) database.initializeSchema();
  const storeRepo = new StoreRepository(database);
  const productRepo = new ProductRepository(database);
  const priceRepo = new ProductPriceRepository(database);
  const listRepo = new GroceryListRepository(database);
  const itemRepo = new GroceryItemRepository(database);
  const budgetRepo = new BudgetRepository(database);
  const catRepo = new CategoryRepository(database);
  const ptRepo = new ProductTypeRepository(database);
  const unitRepo = new UnitRepository(database);
  const pantryRepo = new PantryRepository(database);
  const pantryHistoryRepo = new PantryHistoryRepo(database);
  const ai = new AIService(database);
  ai.initialize();
  return {
    db: database,
    storeRepo,
    productRepo,
    priceRepo,
    listRepo,
    itemRepo,
    budgetRepo,
    pantryRepo,
    pantryHistoryRepo,
    stores: new StoreService(storeRepo),
    products: new ProductService(productRepo, priceRepo, storeRepo),
    lists: new GroceryListService(
      listRepo,
      itemRepo,
      productRepo,
      priceRepo,
      storeRepo,
    ),
    master: new MasterListService(listRepo, itemRepo, storeRepo),
    budgets: new BudgetService(listRepo, itemRepo, budgetRepo),
    pantry: new PantryService(
      pantryRepo,
      productRepo,
      priceRepo,
      storeRepo,
      itemRepo,
      pantryHistoryRepo,
    ),
    config: new ConfigurationService(unitRepo, ptRepo, catRepo),
    ai,
  };
}

let singleton: Container | null = null;
export function container(): Container {
  if (!singleton) singleton = createContainer();
  return singleton;
}
