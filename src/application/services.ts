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
import { EntityNotFoundException } from "../domain/exception.ts";
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
} from "../domain/repository.ts";
import { ProductMapper, StoreMapper } from "./mappers.ts";
import { Validator } from "./validator.ts";
import type {
  BudgetDto,
  GroceryItemDto,
  GroceryListDto,
  ItemDetailDto,
  MasterListDetailDto,
  MasterListSummaryDto,
  PantryDto,
  PantryHistoryDto,
  PriceHistoryDto,
  ProductDto,
  StoreDto,
  StoreItemsDto,
} from "./dto.ts";
import { budgetDto } from "./dto.ts";
import {
  currentYearMonth,
  type LocalDate,
  monthFromSpanish,
  parseYearMonth,
  spanishMonth,
  todayISO,
  type YearMonth,
  yearMonth,
} from "../domain/dates.ts";

export class StoreService {
  constructor(private storeRepository: StoreRepository) {}
  getAllStores(): StoreDto[] {
    return this.storeRepository.findAll().map(StoreMapper.toDto);
  }
  getStoreById(id: number): StoreDto {
    const s = this.storeRepository.findById(id);
    if (!s) throw new EntityNotFoundException("Tienda", id);
    return StoreMapper.toDto(s);
  }
  createStore(dto: StoreDto): StoreDto {
    this.validateStore(dto);
    return StoreMapper.toDto(
      this.storeRepository.save(StoreMapper.toEntity(dto)),
    );
  }
  updateStore(id: number, dto: StoreDto): StoreDto {
    this.validateStore(dto);
    const existing = this.storeRepository.findById(id);
    if (!existing) throw new EntityNotFoundException("Tienda", id);
    existing.setName(dto.name);
    existing.setColor(dto.color);
    return StoreMapper.toDto(this.storeRepository.save(existing));
  }
  deleteStore(id: number): void {
    if (!this.storeRepository.findById(id)) {
      throw new EntityNotFoundException("Tienda", id);
    }
    this.storeRepository.deleteById(id);
  }
  private validateStore(dto: StoreDto): void {
    Validator.of(dto).isNotEmpty(dto.name, "nombre").hasMaxLength(
      dto.name,
      "nombre",
      100,
    ).validate();
  }
}

export class ProductService {
  constructor(
    private productRepository: ProductRepository,
    private priceRepository: ProductPriceRepository,
    private storeRepository: StoreRepository,
  ) {}
  getAllProducts(): ProductDto[] {
    return this.productRepository.findAll().map((p) =>
      this.toDtoWithStoreAndPrice(p)
    );
  }
  getProductsByStore(storeId: number): ProductDto[] {
    return this.productRepository.findByStoreId(storeId).map((p) =>
      this.toDtoWithStoreAndPrice(p)
    );
  }
  getRecurrentProductsByStore(storeId: number): ProductDto[] {
    return this.productRepository.findRecurrentByStoreId(storeId).map((p) =>
      this.toDtoWithStoreAndPrice(p)
    );
  }
  getProductById(id: number): ProductDto {
    const p = this.productRepository.findById(id);
    if (!p) throw new EntityNotFoundException("Producto", id);
    return this.toDtoWithStoreAndPrice(p);
  }
  createProduct(dto: ProductDto): ProductDto {
    console.log("[ProductService.createProduct] dto recibido:", JSON.stringify(dto));
    this.validateProduct(dto);
    const saved = this.productRepository.save(ProductMapper.toEntity(dto));
    console.log("[ProductService.createProduct] producto guardado id:", saved.id);
    const price = new ProductPrice(
      null,
      saved.id!,
      dto.currentPrice,
      todayISO(),
    );
    console.log("[ProductService.createProduct] price a guardar:", { productId: price.productId, price: price.price, date: price.effectiveDate });
    this.priceRepository.save(price);
    console.log("[ProductService.createProduct] precio guardado");
    return this.toDtoWithStoreAndPrice(saved);
  }
  updateProduct(id: number, dto: ProductDto): ProductDto {
    this.validateProduct(dto);
    const existing = this.productRepository.findById(id);
    if (!existing) throw new EntityNotFoundException("Producto", id);
    existing.setStoreId(dto.storeId);
    existing.setName(dto.name);
    existing.setUnit(dto.unit);
    existing.setProductType(dto.productType);
    existing.setCategory(dto.category);
    const updated = this.productRepository.save(existing);
    // Java behavior: always inserts a new price row on update
    const price = new ProductPrice(
      null,
      id,
      dto.currentPrice,
      todayISO(),
    );
    this.priceRepository.save(price);
    return this.toDtoWithStoreAndPrice(updated);
  }
  deleteProduct(id: number): void {
    if (!this.productRepository.findById(id)) {
      throw new EntityNotFoundException("Producto", id);
    }
    this.productRepository.deleteById(id);
  }
  addPrice(productId: number, price: number, effectiveDate: LocalDate): void {
    console.log("[ProductService.addPrice] llamado:", { productId, price, effectiveDate });
    if (!this.productRepository.findById(productId)) {
      console.log("[ProductService.addPrice] producto NO encontrado:", productId);
      throw new EntityNotFoundException("Producto", productId);
    }
    console.log("[ProductService.addPrice] producto existe, guardando precio...");
    this.priceRepository.save(
      new ProductPrice(null, productId, price, effectiveDate),
    );
    console.log("[ProductService.addPrice] precio guardado exitosamente");
  }
  getPriceHistory(productId: number): PriceHistoryDto[] {
    return this.priceRepository.findByProductId(productId).map((p) => ({
      id: p.id,
      productId: p.productId,
      price: p.price,
      effectiveDate: p.effectiveDate,
    }));
  }
  private validateProduct(dto: ProductDto): void {
    Validator.of(dto)
      .isNotEmpty(dto.name, "nombre")
      .isNotNull(dto.storeId, "tienda")
      .isNotEmpty(dto.unit, "unidad")
      .isNotEmpty(dto.productType, "tipo de producto")
      .hasMaxLength(dto.name, "nombre", 255)
      .validate();
  }
  private toDtoWithStoreAndPrice(p: Product): ProductDto {
    const store = this.storeRepository.findById(p.storeId!);
    const storeName = store ? store.name : "";
    const cur = this.priceRepository.findCurrentByProductId(p.id!);
    return ProductMapper.toDto(p, storeName, cur ? cur.price : 0);
  }
}

export class GroceryListService {
  constructor(
    private listRepository: GroceryListRepository,
    private itemRepository: GroceryItemRepository,
    private productRepository: ProductRepository,
    private priceRepository: ProductPriceRepository,
    private storeRepository: StoreRepository,
  ) {}

  getAllLists(): GroceryListDto[] {
    return this.listRepository.findAll().map((l) => this.toDtoWithDetails(l));
  }
  getListsByStore(storeId: number): GroceryListDto[] {
    return this.listRepository.findByStoreId(storeId).map((l) =>
      this.toDtoWithDetails(l)
    );
  }
  getListById(id: number): GroceryListDto {
    const l = this.listRepository.findById(id);
    if (!l) throw new EntityNotFoundException("Lista de compras", id);
    return this.toDtoWithDetails(l);
  }
  createList(dto: GroceryListDto): GroceryListDto {
    this.validateList(dto);
    const entity = new GroceryList(
      null,
      dto.storeId,
      dto.name,
      dto.month,
      false,
    );
    return this.toDtoWithDetails(this.listRepository.save(entity));
  }
  updateList(id: number, dto: GroceryListDto): GroceryListDto {
    this.validateList(dto);
    const existing = this.listRepository.findById(id);
    if (!existing) throw new EntityNotFoundException("Lista de compras", id);
    existing.setName(dto.name);
    existing.setMonth(dto.month);
    existing.setCompleted(dto.completed);
    return this.toDtoWithDetails(this.listRepository.save(existing));
  }
  completeList(id: number): void {
    const list = this.listRepository.findById(id);
    if (!list) throw new EntityNotFoundException("Lista de compras", id);
    list.setCompleted(true);
    this.listRepository.save(list);
    BudgetService.incrementSpendingVersion();
  }
  deleteList(id: number): void {
    if (!this.listRepository.findById(id)) {
      throw new EntityNotFoundException("Lista de compras", id);
    }
    this.itemRepository.deleteByGroceryListId(id);
    this.listRepository.deleteById(id);
  }
  addItem(listId: number, productId: number, quantity: number): void {
    if (!this.listRepository.findById(listId)) {
      throw new EntityNotFoundException("Lista de compras", listId);
    }
    if (!this.productRepository.findById(productId)) {
      throw new EntityNotFoundException("Producto", productId);
    }
    const existing = this.itemRepository.findByGroceryListId(listId);
    if (existing.some((i) => i.productId === productId)) return; // idempotent
    const cur = this.priceRepository.findCurrentByProductId(productId);
    const price = cur ? cur.price : 0;
    const product = this.productRepository.findById(productId)!;
    const item = new GroceryItem(
      null,
      listId,
      productId,
      product.name,
      quantity,
      product.unit,
      price,
      false,
    );
    this.itemRepository.save(item);
  }
  toggleItemChecked(itemId: number): void {
    const item = this.itemRepository.findById(itemId);
    if (!item) throw new EntityNotFoundException("Item", itemId);
    item.setChecked(!item.checked);
    this.itemRepository.save(item);
  }
  deleteItem(itemId: number): void {
    this.itemRepository.deleteById(itemId);
  }
  undoAddItem(listId: number, productId: number): void {
    const items = this.itemRepository.findByGroceryListId(listId);
    const found = items.find((i) => i.productId === productId);
    if (found) this.itemRepository.deleteById(found.id!);
  }
  undoRemoveItem(
    listId: number,
    productId: number,
    productName: string,
    quantity: number,
    unit: string,
  ): void {
    const cur = this.priceRepository.findCurrentByProductId(productId);
    const price = cur ? cur.price : 0;
    this.itemRepository.save(
      new GroceryItem(
        null,
        listId,
        productId,
        productName,
        quantity,
        unit,
        price,
        false,
      ),
    );
  }
  undoUpdateQuantity(
    itemId: number,
    oldQuantity: number,
    oldUnit: string,
  ): void {
    const item = this.itemRepository.findById(itemId);
    if (!item) throw new EntityNotFoundException("Item", itemId);
    item.setQuantity(oldQuantity);
    item.setUnit(oldUnit);
    this.itemRepository.save(item);
  }
  updateItemQuantity(itemId: number, quantity: number, unit: string): void {
    const item = this.itemRepository.findById(itemId);
    if (!item) throw new EntityNotFoundException("Item", itemId);
    item.setQuantity(quantity);
    item.setUnit(unit);
    this.itemRepository.save(item);
  }
  updateItemPrice(itemId: number, price: number): void {
    console.log(
      `[GroceryListService.updateItemPrice] itemId=${itemId} price=${price}`,
    );
    const item = this.itemRepository.findById(itemId);
    if (!item) {
      console.error(
        `[GroceryListService.updateItemPrice] item ${itemId} NOT FOUND`,
      );
      throw new EntityNotFoundException("Item", itemId);
    }
    console.log(
      `[GroceryListService.updateItemPrice] found item:`,
      JSON.stringify({
        id: item.id,
        productName: item.productName,
        oldPrice: item.priceAtPurchase,
      }),
    );
    item.setPriceAtPurchase(price);
    const saved = this.itemRepository.save(item);
    console.log(
      `[GroceryListService.updateItemPrice] saved item:`,
      JSON.stringify({ id: saved.id, priceAtPurchase: saved.priceAtPurchase }),
    );
  }
  getItemsByListId(listId: number): GroceryItemDto[] {
    return this.itemRepository.findByGroceryListId(listId).map((i) =>
      this.toItemDto(i)
    );
  }
  getPurchaseFrequency(productId: number): number {
    return this.itemRepository.countByProductId(productId);
  }
  getPurchaseFrequencyByStore(productId: number, storeId: number): number {
    const storeIds = this.itemRepository.findStoreIdsByProductId(productId);
    return storeIds.includes(storeId)
      ? this.itemRepository.countByProductId(productId)
      : 0;
  }
  getCompletedListStreak(storeId: number): number {
    const lists = this.listRepository.findCompletedByStoreId(storeId);
    if (lists.length === 0) return 0;
    let streak = 0;
    let current = currentYearMonth();
    for (const l of lists) {
      if (l.month === current || l.month === prevMonth(current)) {
        streak++;
        current = prevMonth(current);
      } else break;
    }
    return streak;
  }
  getTotalCompletedLists(storeId: number): number {
    return this.listRepository.countCompletedByStoreId(storeId);
  }
  searchListsByItemName(itemName: string): GroceryListDto[] {
    return this.listRepository.findByItemNameContains(itemName).map((l) =>
      this.toDtoWithDetails(l)
    );
  }
  searchListsByDateRange(start: YearMonth, end: YearMonth): GroceryListDto[] {
    return this.listRepository.findByDateRange(start, end).map((l) =>
      this.toDtoWithDetails(l)
    );
  }

  private validateList(dto: GroceryListDto): void {
    Validator.of(dto).isNotEmpty(dto.name, "nombre").isNotNull(
      dto.storeId,
      "tienda",
    ).check(dto.month != null, "mes no puede ser nulo")
      .check(
        dto.month >= currentYearMonth(),
        "no se pueden crear listas en meses pasados",
      ).validate();
  }
  private toDtoWithDetails(list: GroceryList): GroceryListDto {
    const store = this.storeRepository.findById(list.storeId!);
    const storeName = store ? store.name : "";
    const items = this.itemRepository.findByGroceryListId(list.id!);
    const total = items.reduce(
      (acc, i) => acc + (i.priceAtPurchase ?? 0) * i.quantity,
      0,
    );
    return {
      id: list.id,
      storeId: list.storeId,
      storeName,
      name: list.name,
      month: list.month,
      completed: list.completed,
      itemCount: items.length,
      estimatedTotal: total,
    };
  }
  private toItemDto(item: GroceryItem): GroceryItemDto {
    const product = this.productRepository.findById(item.productId!);
    const productName = item.productName && item.productName.length > 0
      ? item.productName
      : (product ? product.name : "");
    const unit = item.unit && item.unit.length > 0
      ? item.unit
      : (product ? product.unit : "");
    const cur = this.priceRepository.findCurrentByProductId(item.productId!);
    return {
      id: item.id,
      groceryListId: item.groceryListId,
      productId: item.productId,
      productName,
      unit,
      quantity: item.quantity,
      priceAtPurchase: item.priceAtPurchase,
      currentPrice: cur ? cur.price : 0,
      checked: item.checked,
    };
  }
}

export class MasterListService {
  constructor(
    private listRepository: GroceryListRepository,
    private itemRepository: GroceryItemRepository,
    private storeRepository: StoreRepository,
  ) {}

  getMasterLists(): MasterListSummaryDto[] {
    const grouped = new Map<string, GroceryList[]>();
    for (const l of this.listRepository.findAll()) {
      const key = l.month;
      const arr = grouped.get(key) ?? [];
      arr.push(l);
      grouped.set(key, arr);
    }
    const out: MasterListSummaryDto[] = [];
    for (const [ym, lists] of grouped) {
      const storeNames = lists.map((l) => this.storeNameFor(l)).join(", ");
      const total = lists.reduce((acc, l) => acc + this.sumItems(l.id!), 0);
      const { year, month } = parseYearMonth(ym);
      out.push({
        id: lists[0].id,
        month: `${spanishMonth(month)} ${year}`,
        storeNames,
        total,
      });
    }
    return out;
  }
  getMasterListDetail(month: string, year: number): MasterListDetailDto {
    const m = monthFromSpanish(month);
    const ym = yearMonth(year, m);
    const lists = this.listRepository.findAll().filter((l) => l.month === ym);
    const stores: StoreItemsDto[] = lists.map((list) => {
      const store = this.storeRepository.findById(list.storeId!);
      const items = this.itemRepository.findByGroceryListId(list.id!);
      const itemDetails: ItemDetailDto[] = items.map((i) => ({
        productName: i.productName,
        quantity: i.quantity,
        unit: i.unit,
        price: i.priceAtPurchase ?? 0,
        total: (i.priceAtPurchase ?? 0) * i.quantity,
      }));
      const storeTotal = itemDetails.reduce((a, d) => a + d.total, 0);
      return {
        storeName: store ? store.name : "",
        storeColor: store ? store.color : "",
        listName: list.name,
        items: itemDetails,
        storeTotal,
      };
    });
    return { month: `${month} ${year}`, stores };
  }
  deleteMasterList(month: string, year: number): void {
    const m = monthFromSpanish(month);
    this.listRepository.deleteByMonth(yearMonth(year, m));
  }
  getGroceryListIdForMasterList(month: string, year: number): number | null {
    const m = monthFromSpanish(month);
    const ym = yearMonth(year, m);
    const found = this.listRepository.findAll().find((l) => l.month === ym);
    return found ? found.id : null;
  }
  private storeNameFor(l: GroceryList): string {
    const s = this.storeRepository.findById(l.storeId!);
    return s ? s.name : "";
  }
  private sumItems(listId: number): number {
    return this.itemRepository.findByGroceryListId(listId).reduce(
      (a, i) => a + (i.priceAtPurchase ?? 0) * i.quantity,
      0,
    );
  }
}

export class BudgetService {
  static #spendingVersion = 0;

  static get spendingVersion(): number {
    return BudgetService.#spendingVersion;
  }
  static incrementSpendingVersion(): void {
    BudgetService.#spendingVersion++;
  }

  constructor(
    private listRepository: GroceryListRepository,
    private itemRepository: GroceryItemRepository,
    private budgetRepository: BudgetRepository,
  ) {}

  getMonthlyBudgets(year: number): BudgetDto[] {
    const out: BudgetDto[] = [];
    for (let m = 1; m <= 12; m++) {
      const ym = yearMonth(year, m);
      const saved = this.budgetRepository.findByPeriod(ym);
      const estimated = saved?.estimatedBudget ??
        this.calculateEstimatedForMonth(ym);
      const actual = saved ? saved.actualSpent ?? 0 : 0;
      out.push(
        budgetDto(`${spanishMonth(m)} ${year}`, year, m, estimated, actual),
      );
    }
    return out;
  }
  getYearlyBudgets(): BudgetDto[] {
    const byYear = new Map<number, GroceryList[]>();
    for (const l of this.listRepository.findAll()) {
      if (!l.month) continue;
      const y = parseYearMonth(l.month).year;
      const arr = byYear.get(y) ?? [];
      arr.push(l);
      byYear.set(y, arr);
    }
    const out: BudgetDto[] = [];
    for (const [year, lists] of byYear) {
      const estimated = lists.reduce((acc, l) => acc + this.sumItems(l.id!), 0);
      let actual = 0;
      for (let m = 1; m <= 12; m++) {
        const b = this.budgetRepository.findByPeriod(yearMonth(year, m));
        if (b && b.actualSpent != null) actual += b.actualSpent;
      }
      out.push(budgetDto(String(year), year, 0, estimated, actual));
    }
    return out;
  }
  getMonthlyBudget(year: number, month: number): BudgetDto {
    const ym = yearMonth(year, month);
    const estimated = this.calculateEstimatedForMonth(ym);
    const saved = this.budgetRepository.findByPeriod(ym);
    const actual = saved ? saved.actualSpent ?? 0 : 0;
    return budgetDto(
      `${spanishMonth(month)} ${year}`,
      year,
      month,
      estimated,
      actual,
    );
  }
  consolidateBudget(year: number, month: number): void {
    BudgetService.#spendingVersion++;
    const ym = yearMonth(year, month);
    let actualTotal = 0;
    for (const l of this.listRepository.findAll()) {
      if (l.month === ym) {
        actualTotal += this.sumItems(l.id!);
        l.setCompleted(true);
        this.listRepository.save(l);
      }
    }
    let entity = this.budgetRepository.findByPeriod(ym);
    if (!entity) {
      entity = new Budget(
        null,
        ym,
        this.calculateEstimatedForMonth(ym),
        actualTotal,
      );
      this.budgetRepository.save(entity);
    }
  }
  reconcileBudget(budget: BudgetDto, actualSpent: number): BudgetDto {
    BudgetService.#spendingVersion++;
    const ym = yearMonth(budget.year, budget.month);
    let entity = this.budgetRepository.findByPeriod(ym);
    if (!entity) {
      const estimated = this.calculateEstimatedForMonth(ym);
      entity = new Budget(null, ym, estimated, actualSpent);
    } else {
      entity.setActualSpent(actualSpent);
    }
    this.budgetRepository.save(entity);
    for (const l of this.listRepository.findAll()) {
      if (l.month === ym) {
        l.setCompleted(true);
        this.listRepository.save(l);
      }
    }
    return budgetDto(
      budget.period,
      budget.year,
      budget.month,
      entity.estimatedBudget ?? 0,
      actualSpent,
    );
  }
  calculateSuggestedRollover(
    currentYear: number,
    currentMonth: number,
    masterListId: number | null,
  ): number {
    const currentYm = yearMonth(currentYear, currentMonth);
    const current = this.budgetRepository.findByPeriod(currentYm);
    if (!current) return 0;
    const estimated = current.estimatedBudget ?? 0;
    const actual = masterListId != null
      ? this.actualSpentForMasterList(masterListId)
      : (current.actualSpent ?? 0);
    const unused = estimated - actual;
    if (unused < 0) return 0;
    const avg = this.averageMonthlySpend(masterListId);
    if (avg === 0) return unused;
    const suggestedExtra = avg * 0.1;
    return unused > suggestedExtra ? suggestedExtra : unused;
  }
  private calculateEstimatedForMonth(ym: YearMonth): number {
    return this.listRepository.findAll().filter((l) => l.month === ym).reduce(
      (a, l) => a + this.sumItems(l.id!),
      0,
    );
  }
  private actualSpentForMasterList(id: number): number {
    return this.sumItems(id);
  }
  private averageMonthlySpend(masterListId: number | null): number {
    const now = currentYearMonth();
    const months: YearMonth[] = [];
    for (let i = 5; i >= 0; i--) months.push(prevN(now, i));
    let total = 0;
    let withData = 0;
    for (const ym of months) {
      let lists = this.listRepository.findAll().filter((l) => l.month === ym);
      if (masterListId != null) {
        lists = lists.filter((l) => l.id === masterListId);
      }
      const spent = lists.reduce((a, l) => a + this.sumItems(l.id!), 0);
      if (spent > 0) {
        total += spent;
        withData++;
      }
    }
    return withData > 0 ? total / withData : 0;
  }
  private sumItems(listId: number): number {
    return this.itemRepository.findByGroceryListId(listId).reduce(
      (a, i) => a + (i.priceAtPurchase ?? 0) * i.quantity,
      0,
    );
  }
}

export class PantryService {
  static #historyVersion = 0;
  static #pantryVersion = 0;

  static get historyVersion(): number {
    return PantryService.#historyVersion;
  }
  static get pantryVersion(): number {
    return PantryService.#pantryVersion;
  }

  constructor(
    private pantryRepository: PantryRepository,
    private productRepository: ProductRepository,
    private priceRepository: ProductPriceRepository,
    private storeRepository: StoreRepository,
    private itemRepository: GroceryItemRepository,
    private historyRepository?: PantryHistoryRepository,
  ) {}
  getAll(): PantryDto[] {
    return this.pantryRepository.findAll().filter((p) =>
      p.status !== "Eliminado"
    ).map((p) => this.toDto(p));
  }
  consolidateFromList(listId: number): void {
    PantryService.#pantryVersion++;
    const items = this.itemRepository.findByGroceryListId(listId);
    for (const item of items) {
      const saved = this.pantryRepository.save(
        new PantryItem(null, item.productId!, item.quantity, "Nuevo"),
      );
      this.recordHistory(saved, "Nuevo");
    }
  }
  updateStatus(
    id: number,
    status: PantryItemStatus,
    mermaReason?: string,
  ): void {
    PantryService.#pantryVersion++;
    const item = this.pantryRepository.findById(id);
    if (!item) throw new EntityNotFoundException("Item de despensa", id);
    if (status === "Merma" || status === "Eliminado") {
      if (item.status === status) return;
      item.setStatus(status);
      if (status === "Merma" && mermaReason !== undefined) {
        item.setMermaReason(mermaReason);
      }
      this.pantryRepository.save(item);
      this.recordHistory(item, status);
      return;
    }
    if (item.status === "Merma") {
      throw new Error("No se puede cambiar un item marcado como Merma");
    }
    const curIdx = PANTRY_STATUS_ORDER.indexOf(item.status);
    const newIdx = PANTRY_STATUS_ORDER.indexOf(status);
    if (newIdx <= curIdx) {
      throw new Error(
        `No se puede regresar a "${status}" desde "${item.status}"`,
      );
    }
    item.setStatus(status);
    this.pantryRepository.save(item);
    this.recordHistory(item, status);
  }
  deleteById(id: number, mermaReason?: string): void {
    PantryService.#pantryVersion++;
    const item = this.pantryRepository.findById(id);
    if (!item) throw new EntityNotFoundException("Item de despensa", id);
    item.setStatus("Eliminado");
    if (mermaReason !== undefined) item.setMermaReason(mermaReason);
    this.pantryRepository.save(item);
    this.recordHistory(item, "Eliminado");
  }
  getHistory(period: string): PantryHistoryDto[] {
    if (!this.historyRepository) return [];
    return this.historyRepository.findByPeriod(period).map((e) => ({
      id: e.id,
      period: e.period,
      productId: e.productId,
      productName: e.productName,
      quantity: e.quantity,
      status: e.status,
      unit: e.unit,
      storeName: e.storeName,
      estimatedValue: e.estimatedValue,
      mermaReason: e.mermaReason,
    }));
  }
  getHistoryPeriods(): string[] {
    if (!this.historyRepository) return [];
    return this.historyRepository.findAllPeriods();
  }
  private recordHistory(item: PantryItem, status: PantryItemStatus): void {
    PantryService.#historyVersion++;
    if (!this.historyRepository) return;
    const period = currentYearMonth();
    const prod = this.productRepository.findById(item.productId);
    const productName = prod ? prod.name : "";
    const unit = prod ? prod.unit : "";
    let storeName = "";
    if (prod && prod.storeId != null) {
      const store = this.storeRepository.findById(prod.storeId);
      if (store) storeName = store.name;
    }
    const price = this.priceRepository.findCurrentByProductId(item.productId);
    const estimatedValue = price && price.price != null
      ? price.price * item.quantity
      : 0;
    const entry = new PantryHistoryEntry(
      null,
      period,
      item.productId,
      productName,
      item.quantity,
      status,
      unit,
      storeName,
      estimatedValue,
      item.mermaReason,
    );
    this.historyRepository.save(entry);
  }
  private toDto(p: PantryItem): PantryDto {
    let storeName = "";
    let productName = "";
    let unit = "";
    let currentPrice = 0;
    const prod = this.productRepository.findById(p.productId);
    if (prod) {
      productName = prod.name;
      unit = prod.unit;
      if (prod.storeId != null) {
        const store = this.storeRepository.findById(prod.storeId);
        if (store) storeName = store.name;
      }
      const price = this.priceRepository.findCurrentByProductId(p.productId);
      if (price) currentPrice = price.price;
    }
    const nextStates = p.status === "Merma" || p.status === "Eliminado"
      ? []
      : PANTRY_STATUS_ORDER.slice(
        PANTRY_STATUS_ORDER.indexOf(p.status as any) + 1,
      );
    return {
      id: p.id!,
      productId: p.productId,
      productName,
      quantity: p.quantity,
      unit,
      storeName,
      estimatedValue: currentPrice * p.quantity,
      status: p.status,
      nextStates,
      mermaReason: p.mermaReason,
    };
  }
}

export class ConfigurationService {
  constructor(
    private unitRepository: UnitRepository,
    private productTypeRepository: ProductTypeRepository,
    private categoryRepository: CategoryRepository,
  ) {}
  getAllUnits(): string[] {
    return this.unitRepository.findAll();
  }
  addUnit(name: string): void {
    this.unitRepository.save(name);
  }
  deleteUnit(name: string): void {
    this.unitRepository.delete(name);
  }
  getAllProductTypes(): string[] {
    return this.productTypeRepository.findAll();
  }
  addProductType(name: string): void {
    this.productTypeRepository.save(name);
  }
  deleteProductType(name: string): void {
    this.productTypeRepository.delete(name);
  }
  getAllCategories(): string[] {
    return this.categoryRepository.findAll();
  }
  addCategory(name: string): void {
    this.categoryRepository.save(name);
  }
  deleteCategory(name: string): void {
    this.categoryRepository.delete(name);
  }
}

function prevMonth(ym: YearMonth): YearMonth {
  const { year, month } = parseYearMonth(ym);
  if (month === 1) return yearMonth(year - 1, 12);
  return yearMonth(year, month - 1);
}
function prevN(ym: YearMonth, n: number): YearMonth {
  let cur = ym;
  for (let i = 0; i < n; i++) cur = prevMonth(cur);
  return cur;
}
