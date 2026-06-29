import type { LocalDate, YearMonth } from "../domain/dates.ts";

export interface StoreDto {
  id: number | null;
  name: string;
  color: string;
}

export interface ProductDto {
  id: number | null;
  storeId: number;
  storeName: string;
  name: string;
  unit: string;
  productType: string;
  category: string;
  currentPrice: number;
}

export interface GroceryListDto {
  id: number | null;
  storeId: number;
  storeName: string;
  name: string;
  month: YearMonth;
  completed: boolean;
  itemCount: number;
  estimatedTotal: number;
}

export interface GroceryItemDto {
  id: number | null;
  groceryListId: number;
  productId: number;
  productName: string;
  unit: string;
  quantity: number;
  priceAtPurchase: number;
  currentPrice: number | null;
  checked: boolean;
}

export interface BudgetDto {
  period: string;
  year: number;
  month: number;
  estimatedBudget: number;
  actualSpent: number;
  difference: number;
}

export interface PriceHistoryDto {
  id: number | null;
  productId: number;
  price: number;
  effectiveDate: LocalDate;
}

export interface MasterListSummaryDto {
  id: number | null;
  month: string;
  storeNames: string;
  total: number;
}

export interface ItemDetailDto {
  productName: string;
  quantity: number;
  unit: string;
  price: number;
  total: number;
}

export interface StoreItemsDto {
  storeName: string;
  storeColor: string;
  listName: string;
  items: ItemDetailDto[];
  storeTotal: number;
}

export interface MasterListDetailDto {
  month: string;
  stores: StoreItemsDto[];
}

export interface MasterListItemDto {
  month: string;
  storeName: string;
  listName: string;
  itemCount: number;
  estimatedTotal: number;
}

export interface ConsolidatedMasterItemDto {
  storeName: string;
  productName: string;
  quantity: number;
  unit: string;
  price: number;
  total: number;
  listName: string;
}

import type { PantryItemStatus } from "../domain/entity.ts";

export interface PantryHistoryDto {
  id: number | null;
  period: string;
  productId: number;
  productName: string;
  quantity: number;
  status: string;
  unit: string;
  storeName: string;
  estimatedValue: number;
  mermaReason: string;
}

export interface PantryDto {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  unit: string;
  storeName: string;
  estimatedValue: number;
  status: PantryItemStatus;
  nextStates: PantryItemStatus[];
  mermaReason: string;
}

export interface MasterListDto {
  month: YearMonth;
  storeLists: GroceryListDto[];
  totalEstimated: number;
}

export function budgetDto(
  period: string,
  year: number,
  month: number,
  estimatedBudget: number,
  actualSpent: number,
): BudgetDto {
  return {
    period,
    year,
    month,
    estimatedBudget,
    actualSpent,
    difference: estimatedBudget - actualSpent,
  };
}
