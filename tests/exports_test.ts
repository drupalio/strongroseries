import { assertEquals } from "@std/assert";
import {
  exportGroceryListPdf,
  exportMasterListDetailPdf,
  exportMasterListItemPdf,
} from "../src/exports/pdf.ts";
import { exportMasterListExcel } from "../src/exports/excel.ts";
import type {
  GroceryItemDto,
  GroceryListDto,
  MasterListDetailDto,
  MasterListSummaryDto,
} from "../src/application/dto.ts";

Deno.test("PDF: exportGroceryListPdf produces %PDF bytes", async () => {
  const list: GroceryListDto = {
    id: 1,
    storeId: 1,
    storeName: "Walmart",
    name: "Lista A",
    month: "2026-04",
    completed: false,
    itemCount: 2,
    estimatedTotal: 80,
  };
  const items: GroceryItemDto[] = [
    {
      id: 1,
      groceryListId: 1,
      productId: 10,
      productName: "Leche",
      unit: "Litro",
      quantity: 2,
      priceAtPurchase: 25,
      currentPrice: 25,
      checked: false,
    },
    {
      id: 2,
      groceryListId: 1,
      productId: 20,
      productName: "Pan",
      unit: "Pieza",
      quantity: 1,
      priceAtPurchase: 30,
      currentPrice: 30,
      checked: true,
    },
  ];
  const bytes = await exportGroceryListPdf(list, items);
  assertEquals(bytes.length > 0, true);
  const magic = new TextDecoder().decode(bytes.slice(0, 5));
  assertEquals(magic, "%PDF-");
});

Deno.test("PDF: exportMasterListDetailPdf produces %PDF bytes", async () => {
  const detail: MasterListDetailDto = {
    month: "Abril 2026",
    stores: [{
      storeName: "Walmart",
      storeColor: "#FF0000",
      listName: "Lista A",
      items: [{
        productName: "Leche",
        quantity: 2,
        unit: "Litro",
        price: 25,
        total: 50,
      }],
      storeTotal: 50,
    }],
  };
  const bytes = await exportMasterListDetailPdf(detail);
  assertEquals(bytes.length > 0, true);
  assertEquals(new TextDecoder().decode(bytes.slice(0, 5)), "%PDF-");
});

Deno.test("PDF: exportMasterListItemPdf produces %PDF bytes", async () => {
  const bytes = await exportMasterListItemPdf([
    {
      month: "Abril 2026",
      storeName: "Walmart",
      listName: "L1",
      itemCount: 3,
      estimatedTotal: 100,
    },
  ]);
  assertEquals(bytes.length > 0, true);
  assertEquals(new TextDecoder().decode(bytes.slice(0, 5)), "%PDF-");
});

Deno.test("XLSX: exportMasterListExcel produces PK (zip) bytes", async () => {
  const summary: MasterListSummaryDto[] = [
    { id: 1, month: "Abril 2026", storeNames: "Walmart", total: 100 },
  ];
  const detail: MasterListDetailDto = {
    month: "Abril 2026",
    stores: [{
      storeName: "Walmart",
      storeColor: "#FF0000",
      listName: "L1",
      items: [{
        productName: "Leche",
        quantity: 2,
        unit: "Litro",
        price: 25,
        total: 50,
      }],
      storeTotal: 50,
    }],
  };
  const bytes = await exportMasterListExcel(summary, [detail]);
  assertEquals(bytes.length > 0, true);
  assertEquals(new TextDecoder().decode(bytes.slice(0, 2)), "PK");
});
