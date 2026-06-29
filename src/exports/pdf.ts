import PDFDocument from "npm:pdfkit@0.19.1";
import type {
  GroceryItemDto,
  GroceryListDto,
  MasterListDetailDto,
  MasterListItemDto,
} from "../application/dto.ts";

function money(n: number | null | undefined): string {
  return `$${(n != null ? n : 0).toFixed(2)}`;
}

function render(doc: PDFDocument.PDFDocument): Promise<Uint8Array> {
  return new Promise((resolve) => {
    const chunks: Uint8Array[] = [];
    doc.on("data", (c: Uint8Array) => chunks.push(c));
    doc.on("end", () => {
      let total = 0;
      for (const c of chunks) total += c.length;
      const out = new Uint8Array(total);
      let off = 0;
      for (const c of chunks) {
        out.set(c, off);
        off += c.length;
      }
      resolve(out);
    });
  });
}

export async function exportGroceryListPdf(
  list: GroceryListDto,
  items: GroceryItemDto[],
): Promise<Uint8Array> {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const pageH = 740;
  let y = 50;
  doc.fontSize(18).font("Helvetica-Bold").text(
    `Lista: ${list.name}`,
    50,
    y,
  );
  y += 28;
  doc.fontSize(11).font("Helvetica").text(`Tienda: ${list.storeName}`, 50, y);
  y += 16;
  doc.text(`Mes: ${list.month}`, 50, y);
  y += 16;
  const stateStr = list.completed ? "Completada" : "Pendiente";
  doc.text(`Estado: ${stateStr}`, 50, y);
  y += 24;
  doc.moveTo(50, y).lineTo(545, y).stroke();
  y += 18;
  doc.fontSize(10).font("Helvetica-Bold").text("Items:", 50, y);
  y += 18;
  let total = 0;
  for (const it of items) {
    if (y > pageH - 20) {
      doc.addPage();
      y = 50;
      doc.fontSize(10).font("Helvetica-Bold").text(
        `${list.name ?? "Lista"} (cont.)`,
        50,
        y,
      );
      y += 18;
    }
    const check = it.checked ? "[X]" : "[ ]";
    doc.fontSize(10).font("Helvetica").fill("#000").text(
      `${check}  ${it.productName}`,
      50,
      y,
      { lineBreak: false },
    );
    const qtyStr = `x${it.quantity}${it.unit ? " " + it.unit : ""}`;
    doc.text(qtyStr, 310, y, { lineBreak: false });
    const price = it.currentPrice ?? 0;
    doc.text(money(price), 420, y, { lineBreak: false });
    total += price * it.quantity;
    y += 18;
  }
  y += 8;
  if (y > pageH - 10) {
    doc.addPage();
    y = 50;
  }
  doc.moveTo(50, y).lineTo(545, y).stroke();
  y += 16;
  doc.fontSize(12).font("Helvetica-Bold").text(
    `Total: ${money(list.estimatedTotal)}`,
    50,
    y,
  );
  doc.end();
  return render(doc);
}

export async function exportMasterListDetailPdf(
  detail: MasterListDetailDto,
): Promise<Uint8Array> {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const pageW = 495, pageH = 700;
  let y = 50;
  const grandTotal = detail.stores.reduce(
    (a, s) => a + s.items.reduce((b, i) => b + i.total, 0),
    0,
  );
  doc.fontSize(16).font("Helvetica-Bold").text(detail.month, 50, y, {
    continued: false,
  });
  y += 24;
  doc.fontSize(11).font("Helvetica").text(
    `Total general: ${money(grandTotal)}`,
    50,
    y,
  );
  y += 30;
  const colProd = 50, colQty = 360, colPrice = 420;
  const headerY = y;
  doc.rect(colProd, headerY, pageW, 16).fill("#1a1a2e");
  doc.fill("#fff").fontSize(9).font("Helvetica-Bold").text(
    "Nombre del Producto",
    colProd + 4,
    headerY + 4,
    { lineBreak: false },
  );
  doc.text("Cant.", colQty + 4, headerY + 4, { lineBreak: false });
  doc.text("Precio", colPrice + 4, headerY + 4, { lineBreak: false });
  y = headerY + 22;
  for (const store of detail.stores) {
    if (y > pageH - 30) {
      doc.addPage();
      y = 50;
    }
    doc.rect(colProd, y, pageW, 16).fill("#f0f0f0");
    doc.fill("#000").fontSize(9).font("Helvetica-Bold").text(
      `${store.storeName} — ${store.listName}`,
      colProd + 4,
      y + 4,
      { lineBreak: false },
    );
    y += 20;
    for (const item of store.items) {
      if (y > pageH - 20) {
        doc.addPage();
        y = 50;
      }
      doc.font("Helvetica").fontSize(9).fill("#000").text(
        `[ ]  ${truncate(item.productName, 55)}`,
        colProd + 2,
        y,
        { lineBreak: false },
      );
      doc.text(String(item.quantity), colQty + 2, y, { lineBreak: false });
      doc.text(money(item.price), colPrice + 2, y, { lineBreak: false });
      y += 14;
    }
  }
  y += 10;
  if (y > pageH - 10) {
    doc.addPage();
    y = 50;
  }
  doc.moveTo(50, y).lineTo(545, y).stroke();
  y += 14;
  doc.fontSize(12).font("Helvetica-Bold").text(
    `Total general: ${money(grandTotal)}`,
    50,
    y,
  );
  doc.end();
  return render(doc);
}

export async function exportMasterListItemPdf(
  items: MasterListItemDto[],
): Promise<Uint8Array> {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  let y = 750;
  doc.fontSize(18).font("Helvetica-Bold").text("Lista Maestra", 50, y);
  y -= 30;
  doc.fontSize(12).font("Helvetica-Bold").text(
    "Mes       Tienda         Lista          Items    Total",
    50,
    y,
  );
  y -= 20;
  doc.moveTo(50, y).lineTo(545, y).stroke();
  y -= 10;
  let grand = 0;
  for (const it of items) {
    if (y < 100) {
      doc.addPage();
      y = 750;
    }
    doc.font("Helvetica").text(
      `${pad(it.month, 10)} ${pad(it.storeName, 15)} ${pad(it.listName, 15)} ${
        pad(String(it.itemCount), 10)
      } ${money(it.estimatedTotal)}`,
      50,
      y,
    );
    grand += it.estimatedTotal;
    y -= 20;
  }
  y -= 10;
  doc.moveTo(50, y).lineTo(545, y).stroke();
  y -= 20;
  doc.font("Helvetica-Bold").fontSize(14).text(
    `TOTAL GENERAL: ${money(grand)}`,
    50,
    y,
  );
  doc.end();
  return render(doc);
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.substring(0, n - 3) + "...";
}
function pad(s: string, n: number): string {
  return s.length >= n ? s.substring(0, n) : s + " ".repeat(n - s.length);
}
