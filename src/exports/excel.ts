import ExcelJS from "npm:exceljs@4.4.0";
import type {
  MasterListDetailDto,
  MasterListSummaryDto,
} from "../application/dto.ts";

export async function exportMasterListExcel(
  summary: MasterListSummaryDto[] | null,
  details: MasterListDetailDto[] | null,
): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  if (summary) createSummarySheet(wb, summary);
  if (details) createDetailSheets(wb, details);
  const buf = await wb.xlsx.writeBuffer();
  return new Uint8Array(buf as ArrayBuffer);
}

function createSummarySheet(
  wb: ExcelJS.Workbook,
  summary: MasterListSummaryDto[],
): void {
  const ws = wb.addWorksheet("Resumen");
  ws.mergeCells("A1:C1");
  const title = ws.getCell("A1");
  title.value = "Resumen de Listas Maestras";
  title.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
  title.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF00008B" },
  };
  title.alignment = { horizontal: "center" };

  const header = ws.getRow(3);
  header.values = ["Mes", "Tiendas", "Total"];
  header.eachCell((c) => {
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF00008B" },
    };
    c.alignment = { horizontal: "center" };
    c.border = thin();
  });

  summary.forEach((s, i) => {
    const row = ws.getRow(4 + i);
    row.values = [s.month, s.storeNames, s.total];
    row.getCell(3).numFmt = "$#,##0.00";
    row.getCell(3).alignment = { horizontal: "right" };
    row.eachCell((c) => c.border = thin());
  });
  ws.columns[0].width = 20;
  ws.columns[1].width = 40;
  ws.columns[2].width = 15;
}

function createDetailSheets(
  wb: ExcelJS.Workbook,
  details: MasterListDetailDto[],
): void {
  for (const dto of details) {
    const name = dto.month.length > 25 ? dto.month.substring(0, 25) : dto.month;
    const ws = wb.addWorksheet(name);
    ws.mergeCells("A1:E1");
    const title = ws.getCell("A1");
    title.value = dto.month;
    title.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
    title.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF00008B" },
    };
    title.alignment = { horizontal: "center" };

    const header = ws.getRow(3);
    header.values = [
      "Comprado",
      "Nombre del Producto",
      "Cant.",
      "Precio Unit.",
      "Total",
    ];
    header.eachCell((c) => {
      c.font = { bold: true, color: { argb: "FFFFFFFF" } };
      c.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF00008B" },
      };
      c.alignment = { horizontal: "center" };
      c.border = thin();
    });

    let r = 4;
    let sheetTotal = 0;
    for (const store of dto.stores) {
      const storeRow = ws.getRow(r++);
      ws.mergeCells(`A${r - 1}:E${r - 1}`);
      storeRow.getCell(1).value = `${store.storeName} - ${store.listName}`;
      storeRow.getCell(1).font = { bold: true };
      const fill = store.storeColor
        ? hexToArgb(store.storeColor)
        : "FFFF9ACD32";
      storeRow.getCell(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: fill },
      };
      let alt = false;
      for (const item of store.items) {
        const row = ws.getRow(r++);
        row.values = [
          "[ ]",
          item.productName,
          item.quantity,
          item.price,
          item.total,
        ];
        row.getCell(3).alignment = { horizontal: "center" };
        row.getCell(4).numFmt = "$#,##0.00";
        row.getCell(5).numFmt = "$#,##0.00";
        if (alt) {
          row.eachCell((c) => {
            c.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFC0C0C0" },
            };
          });
        }
        row.eachCell((c) => c.border = thin());
        alt = !alt;
        sheetTotal += item.total;
      }
    }
    r++;
    const totalRow = ws.getRow(r);
    ws.mergeCells(`A${r}:D${r}`);
    totalRow.getCell(1).value = "TOTAL";
    totalRow.getCell(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    totalRow.getCell(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF00008B" },
    };
    totalRow.getCell(5).value = sheetTotal;
    totalRow.getCell(5).numFmt = "$#,##0.00";
    ws.views = [{ state: "frozen", ySplit: 3 }];
    ws.columns.forEach((c, i) => {
      c.width = [10, 60, 12, 16, 16][i];
    });
  }
}

function thin(): Partial<ExcelJS.Borders> {
  return {
    top: { style: "thin" },
    bottom: { style: "thin" },
    left: { style: "thin" },
    right: { style: "thin" },
  };
}
function hexToArgb(hex: string): string {
  if (!hex.startsWith("#")) return "FF00008B";
  return "FF" + hex.substring(1).toUpperCase();
}
