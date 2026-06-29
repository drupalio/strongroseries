import type { Container } from "../container.ts";
import {
  EntityNotFoundException,
  ValidationException,
} from "../domain/exception.ts";
import {
  currentYearMonth,
  monthsAgoISO,
  parseYearMonth,
  todayISO,
  yearMonth,
} from "../domain/dates.ts";
import {
  exportGroceryListPdf,
  exportMasterListDetailPdf,
  exportMasterListItemPdf,
} from "../exports/pdf.ts";
import { exportMasterListExcel } from "../exports/excel.ts";
import type { UserContext } from "../ai/models.ts";
import type { BudgetDto, GroceryListDto, ProductDto, StoreDto } from "../application/dto.ts";
import {
  BudgetSchema,
  GroceryListSchema,
  ProductSchema,
  StoreSchema,
  validate,
  ValidationError,
} from "../infrastructure/validation.ts";
const PROJECT_ROOT = decodeURIComponent(new URL("../../", import.meta.url).pathname);
function readFile(p: string): Promise<string> {
  return Deno.readTextFile(PROJECT_ROOT + p);
}

const SW_JS = `
const CACHE = 'strong-groseries-v6';
self.addEventListener('install', (e) => {
  self.skipWaiting();
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});
// Network-first for GET /, /app/*, and /api/* (cache as offline fallback, ignore _= cache-busting)
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.pathname.startsWith('/api/backup')) return;
  if (u.pathname.startsWith('/api/') || u.pathname === '/' || u.pathname.startsWith('/app/')) {
    u.searchParams.delete('_');
    const key = u.toString();
    e.respondWith(
      caches.open(CACHE).then(async (c) => {
        try {
          const res = await fetch(req);
          if (res.ok) c.put(key, res.clone());
          return res;
        } catch {
          const cached = await c.match(key);
          if (cached) return cached;
          return new Response(JSON.stringify({ error: 'offline' }), { status: 503, headers: { 'content-type': 'application/json' } });
        }
      })
    );
  } else {
    e.respondWith(caches.match(req).then((c) => c || fetch(req)));
  }
});
`;

const MANIFEST = {
  name: "StrongGroseries",
  short_name: "Groseries",
  description: "Gestión de compras con IA local",
  start_url: "/",
  display: "standalone",
  background_color: "#0a0a0f",
  theme_color: "#7c3aed",
  icons: [
    { src: "/icon.png", sizes: "192x192", type: "image/png" },
    { src: "/icon.png", sizes: "512x512", type: "image/png" },
  ],
};

type Params = Record<string, string>;

export async function route(req: Request, c: Container): Promise<Response> {
  const url = new URL(req.url);
  const method = req.method;
  const path = url.pathname;
  console.log(`[router] ${method} ${path}`);

  // Health
  if (path === "/" && method === "GET") {
    return new Response(await readFile("web/index.html"), {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-cache, no-store, must-revalidate",
      },
    });
  }
  if (url.pathname === "/app/app.js") {
    return new Response(await readFile("web/app.js"), {
      headers: {
        "content-type": "application/javascript; charset=utf-8",
        "cache-control": "no-cache, no-store, must-revalidate",
      },
    });
  }
  if (path === "/sw.js" && method === "GET") {
    return new Response(SW_JS, {
      headers: {
        "content-type": "application/javascript; charset=utf-8",
        "service-worker-allowed": "/",
      },
    });
  }
  if (path === "/manifest.json" && method === "GET") {
    return Response.json(MANIFEST, {
      headers: { "content-type": "application/manifest+json" },
    });
  }
  if (path === "/icon.png" && method === "GET") {
    const bytes = await Deno.readFile(new URL("../../web/icon.png", import.meta.url).pathname);
    return new Response(bytes, { headers: { "content-type": "image/png" } });
  }
  if (path === "/health" && method === "GET") return json({ status: "ok" });
  if (path === "/api" && method === "GET") {
    return json({ message: "Hello, world!", time: new Date().toISOString() });
  }

  // Stores
  if (path === "/api/stores" && method === "GET") {
    return json(c.stores.getAllStores());
  }
  if (path === "/api/stores" && method === "POST") {
    const body = await req.json();
    return json(c.stores.createStore(validate(StoreSchema, body) as StoreDto), 201);
  }
  const storeMatch = match(path, "/api/stores/:id");
  if (storeMatch) {
    const id = Number(storeMatch.id);
    if (method === "GET") return json(c.stores.getStoreById(id));
    if (method === "PUT") {
      return json(c.stores.updateStore(id, validate(StoreSchema, await req.json()) as StoreDto));
    }
    if (method === "DELETE") {
      c.stores.deleteStore(id);
      return json({ ok: true });
    }
  }

  // Products
  if (path === "/api/products" && method === "GET") {
    const storeId = url.searchParams.get("storeId");
    if (storeId) return json(c.products.getProductsByStore(Number(storeId)));
    const recurrent = url.searchParams.get("recurrent");
    if (recurrent && storeId) {
      return json(c.products.getRecurrentProductsByStore(Number(storeId)));
    }
    return json(c.products.getAllProducts());
  }
  if (path === "/api/products" && method === "POST") {
    const body = await req.json();
    console.log("[router] POST /api/products body:", JSON.stringify(body));
    return json(c.products.createProduct(validate(ProductSchema, body) as ProductDto), 201);
  }
  const productMatch = match(path, "/api/products/:id");
  if (productMatch) {
    const id = Number(productMatch.id);
    if (method === "GET") return json(c.products.getProductById(id));
    if (method === "PUT") {
      return json(c.products.updateProduct(id, validate(ProductSchema, await req.json()) as ProductDto));
    }
    if (method === "DELETE") {
      c.products.deleteProduct(id);
      return json({ ok: true });
    }
  }
  const priceMatch = match(path, "/api/products/:id/prices");
  if (priceMatch && method === "POST") {
    const b = await req.json();
    console.log("[router] POST /api/products/:id/prices body:", JSON.stringify(b), "id:", priceMatch.id);
    c.products.addPrice(
      Number(priceMatch.id),
      b.price,
      b.effectiveDate ?? todayISO(),
    );
    return json({ ok: true }, 201);
  }
  const priceHistMatch = match(path, "/api/products/:id/prices");
  if (priceHistMatch && method === "GET") {
    return json(c.products.getPriceHistory(Number(priceHistMatch.id)));
  }

  // Grocery lists
  if (path === "/api/lists" && method === "GET") {
    const storeId = url.searchParams.get("storeId");
    const q = url.searchParams.get("q");
    const month = url.searchParams.get("month");
    if (q) return json(c.lists.searchListsByItemName(q));
    if (storeId) return json(c.lists.getListsByStore(Number(storeId)));
    let all = c.lists.getAllLists();
    if (month) all = all.filter((l) => l.month === month);
    return json(all);
  }
  if (path === "/api/lists" && method === "POST") {
    return json(c.lists.createList(validate(GroceryListSchema, await req.json()) as GroceryListDto), 201);
  }
  const listMatch = match(path, "/api/lists/:id");
  if (listMatch) {
    const id = Number(listMatch.id);
    if (method === "GET") return json(c.lists.getListById(id));
    if (method === "PUT") return json(c.lists.updateList(id, validate(GroceryListSchema, await req.json()) as GroceryListDto));
    if (method === "DELETE") {
      c.lists.deleteList(id);
      return json({ ok: true });
    }
  }
  const itemsMatch = match(path, "/api/lists/:id/items");
  if (itemsMatch) {
    const id = Number(itemsMatch.id);
    if (method === "GET") return json(c.lists.getItemsByListId(id));
    if (method === "POST") {
      const b = await req.json();
      c.lists.addItem(id, Number(b.productId), Number(b.quantity ?? 1));
      return json({ ok: true }, 201);
    }
  }
  const itemMatch = match(path, "/api/items/:id");
  if (itemMatch) {
    const id = Number(itemMatch.id);
    if (method === "PATCH") {
      const b = await req.json();
      if (b.toggleChecked !== undefined) c.lists.toggleItemChecked(id);
      if (b.quantity !== undefined) {
        c.lists.updateItemQuantity(id, Number(b.quantity), b.unit);
      }
      if (b.priceAtPurchase !== undefined) {
        c.lists.updateItemPrice(id, Number(b.priceAtPurchase));
      }
      return json({ ok: true });
    }
    if (method === "DELETE") {
      c.lists.deleteItem(id);
      return json({ ok: true });
    }
  }

  // Master lists
  if (path === "/api/master-lists" && method === "GET") {
    return json(c.master.getMasterLists());
  }
  const mdMatch = match(path, "/api/master-lists/:month/:year");
  if (mdMatch) {
    const month = decodeURIComponent(mdMatch.month);
    const year = Number(mdMatch.year);
    if (method === "GET") {
      return json(c.master.getMasterListDetail(month, year));
    }
    if (method === "DELETE") {
      c.master.deleteMasterList(month, year);
      return json({ ok: true });
    }
  }

  // Budgets
  const budgetsYearMatch = match(path, "/api/budgets/:year");
  if (budgetsYearMatch && method === "GET") {
    return json(c.budgets.getMonthlyBudgets(Number(budgetsYearMatch.year)));
  }
  const budgetMonthMatch = match(path, "/api/budgets/:year/:month");
  if (budgetMonthMatch && method === "GET") {
    return json(
      c.budgets.getMonthlyBudget(
        Number(budgetMonthMatch.year),
        Number(budgetMonthMatch.month),
      ),
    );
  }
  if (path === "/api/budgets/consolidate" && method === "POST") {
    const b = validate(BudgetSchema, await req.json()) as BudgetDto;
    c.budgets.consolidateBudget(b.year, b.month);
    const ym = yearMonth(b.year, b.month);
    const lists = c.listRepo.findAll().filter((l) =>
      l.month === ym && l.completed
    );
    for (const l of lists) c.pantry.consolidateFromList(l.id!);
    return json({ ok: true });
  }
  if (path === "/api/budgets/reconcile" && method === "POST") {
    const b = validate(BudgetSchema, await req.json()) as BudgetDto;
    const result = c.budgets.reconcileBudget(b, b.actualSpent);
    const ym = yearMonth(b.year, b.month);
    const lists = c.listRepo.findAll().filter((l) =>
      l.month === ym && l.completed
    );
    for (const l of lists) c.pantry.consolidateFromList(l.id!);
    return json(result);
  }
  if (path === "/api/budgets/rollover" && method === "GET") {
    const y = Number(url.searchParams.get("year")),
      m = Number(url.searchParams.get("month")),
      ml = url.searchParams.get("masterListId");
    return json({
      rollover: c.budgets.calculateSuggestedRollover(
        y,
        m,
        ml ? Number(ml) : null,
      ),
    });
  }

  // Configuration
  for (const kind of ["units", "product-types", "categories"] as const) {
    const base = `/api/${kind}`;
    if (path === base && method === "GET") return json(getConfigAll(c, kind));
    if (path === base && method === "POST") {
      const b = await req.json();
      getConfigAdd(c, kind, b.name);
      return json({ ok: true }, 201);
    }
    const one = match(path, `${base}/:name`);
    if (one && method === "DELETE") {
      getConfigDelete(c, kind, decodeURIComponent(one.name));
      return json({ ok: true });
    }
  }

  // Backup
  if (path === "/api/backup" && method === "GET") {
    const now = new Date();
    const ts = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}_${String(now.getHours()).padStart(2,"0")}-${String(now.getMinutes()).padStart(2,"0")}`;
    const filename = `_${ts}.db`;
    const bytes = c.db.export();
    await Deno.writeFile(filename, bytes);
    return json({ ok: true, filename, message: `Backup guardado como ${filename}` });
  }
  if (path === "/api/backup/list" && method === "GET") {
    const files: string[] = [];
    for await (const entry of Deno.readDir(".")) {
      if (entry.isFile && entry.name.startsWith("_") && entry.name.endsWith(".db")) {
        files.push(entry.name);
      }
    }
    files.sort().reverse();
    const byDay: Record<string, string[]> = {};
    for (const f of files) {
      const day = f.slice(1, 11);
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(f);
    }
    return json(byDay);
  }
  if (path === "/api/backup/restore" && method === "POST") {
    const body = await req.json();
    const filename = body.filename;
    if (!filename) return json({ error: "Nombre de archivo requerido" }, 400);
    const bytes = await Deno.readFile(filename);
    await Deno.writeFile("groseries.db", bytes);
    c.db.reload(bytes);
    return json({ ok: true, message: "Base de datos restaurada" });
  }

  // AI
  if (path === "/api/ai/recommend" && method === "GET") {
    return json(c.ai.recommend(defaultCtx()));
  }
  if (path === "/api/ai/forecast" && method === "GET") {
    const ctx = defaultCtx();
    // Pantry history
    const periods = c.pantry.getHistoryPeriods();
    const allHistory: any[] = [];
    for (const p of periods) allHistory.push(...c.pantry.getHistory(p));
    ctx.pantryHistory = allHistory.map((h) => ({
      productId: h.productId,
      productName: h.productName,
      quantity: h.quantity,
      status: h.status,
      period: h.period,
    }));
    // Pantry current stock (PantryItem has productId but not name/unit — look up from ProductRepo)
    const allItems = c.pantry.getAll();
    ctx.pantryCurrentStock = allItems.map((item) => {
      const prod = c.products.getProductById(item.productId);
      return {
        productId: item.productId,
        productName: prod?.name ?? "?",
        quantity: item.quantity,
        unit: prod?.unit,
      };
    });
    // Spending input
    const spendingStart = monthsAgoISO(12);
    const spendingEnd = todayISO();
    const monthlyTotals: Record<string, number> = {};
    const completedLists = c.lists.getAllLists().filter((l) => l.completed);
    for (const list of completedLists) {
      const month = list.month;
      if (!month) continue;
      const items = c.lists.getItemsByListId(list.id!);
      const total = items.reduce(
        (sum, item) => sum + (item.priceAtPurchase ?? 0) * (item.quantity ?? 1),
        0,
      );
      monthlyTotals[month] = (monthlyTotals[month] ?? 0) + total;
    }
    ctx.spendingInput = { monthlyTotals, currentMonthBreakdown: {} };
    return json(c.ai.forecast(ctx));
  }
  if (path === "/api/ai/anomalies" && method === "GET") {
    return json(c.ai.detectAnomalies());
  }
  if (path === "/api/ai/search" && method === "GET") {
    const q = url.searchParams.get("q") ?? "";
    const n = Number(url.searchParams.get("n") ?? 10);
    return json(c.ai.semanticSearchN(q, n));
  }
  if (path === "/api/search" && method === "GET") {
    const q = (url.searchParams.get("q") ?? "").toLowerCase().trim();
    if (!q) return json({ stores: [], products: [], lists: [] });
    const stores = c.stores.getAllStores().filter((s) =>
      (s.name).toLowerCase().includes(q)
    );
    const products = c.products.getAllProducts().filter((p) =>
      (p.name).toLowerCase().includes(q) ||
      (p.category).toLowerCase().includes(q)
    );
    const lists = c.lists.getAllLists().filter((l) =>
      (l.name).toLowerCase().includes(q)
    );
    return json({ stores, products, lists });
  }

  // Pantry
  if (path === "/api/pantry" && method === "GET") {
    return json(c.pantry.getAll());
  }
  if (path === "/api/pantry/consolidate" && method === "POST") {
    const b = await req.json();
    const items = c.itemRepo.findByGroceryListId(Number(b.listId));
    if (items.length === 0) return json({ ok: true });
    c.pantry.consolidateFromList(Number(b.listId));
    return json({ ok: true });
  }
  // Pantry history (must come before /api/pantry/:id to avoid matching "history" as :id)
  if (path === "/api/pantry/history" && method === "GET") {
    return json(c.pantry.getHistoryPeriods());
  }
  const histMatch = match(path, "/api/pantry/history/:year/:month");
  if (histMatch && method === "GET") {
    const year = Number(histMatch.year);
    const month = Number(histMatch.month);
    if (month < 1 || month > 12) return json({ error: "Mes inválido" }, 400);
    const period = yearMonth(year, month);
    return json(c.pantry.getHistory(period));
  }

  const pantryMatch = match(path, "/api/pantry/:id");
  if (pantryMatch) {
    const id = Number(pantryMatch.id);
    if (method === "PATCH") {
      const b = await req.json();
      if (b.status) c.pantry.updateStatus(id, b.status, b.mermaReason);
      return json({ ok: true });
    }
    if (method === "DELETE") {
      let mermaReason;
      try {
        const b = await req.json();
        mermaReason = b.mermaReason;
      } catch { /* no body */ }
      c.pantry.deleteById(id, mermaReason);
      return json({ ok: true });
    }
  }

  // Exports — generate + open with system default app (desktop mode)
  async function generateAndOpen(
    name: string,
    bytes: Uint8Array,
  ): Promise<Response> {
    const tmp = `${Deno.cwd()}/${name}`;
    await Deno.writeFile(tmp, bytes);
    try {
      const cmd = new Deno.Command("open", { args: [tmp] });
      cmd.spawn();
    } catch {}
    return json({ ok: true, file: name });
  }
  const expOpenList = match(path, "/api/export-open/pdf/list/:id");
  if (expOpenList && method === "GET") {
    const id = Number(expOpenList.id);
    const list = c.lists.getListById(id);
    const items = c.lists.getItemsByListId(id);
    return generateAndOpen(
      `lista-${id}.pdf`,
      await exportGroceryListPdf(list, items),
    );
  }
  const expOpenMd = match(path, "/api/export-open/pdf/master/:month/:year");
  if (expOpenMd && method === "GET") {
    const month = decodeURIComponent(expOpenMd.month);
    const year = Number(expOpenMd.year);
    return generateAndOpen(
      `master-${month}-${year}.pdf`,
      await exportMasterListDetailPdf(
        c.master.getMasterListDetail(month, year),
      ),
    );
  }
  const expOpenXlsx = match(path, "/api/export-open/xlsx/master/:month/:year");
  if (expOpenXlsx && method === "GET") {
    const month = decodeURIComponent(expOpenXlsx.month);
    const year = Number(expOpenXlsx.year);
    return generateAndOpen(
      `master-${month}-${year}.xlsx`,
      await exportMasterListExcel(null, [
        c.master.getMasterListDetail(month, year),
      ]),
    );
  }
  const expOpenAll = match(path, "/api/export-open/pdf/master/all");
  if (expOpenAll && method === "GET") {
    const summaries = c.master.getMasterLists();
    const items = summaries.map((s) => {
      const parts = s.month.split(" ");
      const detail = c.master.getMasterListDetail(parts[0], Number(parts[1]));
      return detail.stores.map((st) => ({
        month: detail.month,
        storeName: st.storeName,
        listName: st.listName,
        itemCount: st.items.length,
        estimatedTotal: st.storeTotal,
      }));
    }).flat();
    return generateAndOpen(
      "master-all.pdf",
      await exportMasterListItemPdf(items),
    );
  }
  const expOpenAllXlsx = match(path, "/api/export-open/xlsx/master/all");
  if (expOpenAllXlsx && method === "GET") {
    const summaries = c.master.getMasterLists().map((s) => ({
      id: s.id,
      month: s.month,
      storeNames: s.storeNames,
      total: s.total,
    }));
    const details = summaries.map((s) => {
      const p = s.month.split(" ");
      return c.master.getMasterListDetail(p[0], Number(p[1]));
    });
    return generateAndOpen(
      "master-all.xlsx",
      await exportMasterListExcel(summaries, details),
    );
  }
  // Legacy browser-download routes (keep for curl/non-desktop use)
  const expListMatch = match(path, "/api/exports/pdf/list/:id");
  if (expListMatch && method === "GET") {
    const id = Number(expListMatch.id);
    const list = c.lists.getListById(id);
    const items = c.lists.getItemsByListId(id);
    const bytes = await exportGroceryListPdf(list, items);
    return new Response(bytes as BodyInit, {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="lista-${id}.pdf"`,
      },
    });
  }
  const expMdMatch = match(path, "/api/exports/pdf/master/:month/:year");
  if (expMdMatch && method === "GET") {
    const month = decodeURIComponent(expMdMatch.month);
    const year = Number(expMdMatch.year);
    const detail = c.master.getMasterListDetail(month, year);
    const bytes = await exportMasterListDetailPdf(detail);
    return new Response(bytes as BodyInit, {
      headers: {
        "content-type": "application/pdf",
        "content-disposition":
          `attachment; filename="master-${month}-${year}.pdf"`,
      },
    });
  }

  return new Response("Not Found", { status: 404 });
}

function defaultCtx(): UserContext {
  return {
    userId: "default",
    analysisStartDate: monthsAgo(3),
    analysisEndDate: todayISO(),
    monthlyBudget: 0,
    preferredStoreIds: [],
    excludedCategories: [],
  };
}
function monthsAgo(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${
    String(d.getDate()).padStart(2, "0")
  }`;
}

function getConfigAll(
  c: Container,
  kind: "units" | "product-types" | "categories",
): string[] {
  if (kind === "units") return c.config.getAllUnits();
  if (kind === "product-types") return c.config.getAllProductTypes();
  return c.config.getAllCategories();
}
function getConfigAdd(
  c: Container,
  kind: "units" | "product-types" | "categories",
  name: string,
): void {
  if (kind === "units") c.config.addUnit(name);
  else if (kind === "product-types") c.config.addProductType(name);
  else c.config.addCategory(name);
}
function getConfigDelete(
  c: Container,
  kind: "units" | "product-types" | "categories",
  name: string,
): void {
  if (kind === "units") c.config.deleteUnit(name);
  else if (kind === "product-types") c.config.deleteProductType(name);
  else c.config.deleteCategory(name);
}

function match(path: string, pattern: string): Params | null {
  const pp = pattern.split("/").filter(Boolean);
  const ap = path.split("/").filter(Boolean);
  if (pp.length !== ap.length) return null;
  const out: Params = {};
  for (let i = 0; i < pp.length; i++) {
    if (pp[i].startsWith(":")) out[pp[i].slice(1)] = ap[i];
    else if (pp[i] !== ap[i]) return null;
  }
  return out;
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "content-type": "application/json" },
  });
}

export function handleError(e: unknown): Response {
  console.log("[router] ERROR:", e instanceof Error ? e.message : String(e), e instanceof Error ? e.stack : "");
  if (e instanceof EntityNotFoundException) {
    return Response.json({
      error: e.message,
      entity: e.entityName,
      id: e.entityId,
    }, { status: 404 });
  }
  if (e instanceof ValidationException || e instanceof ValidationError) {
    return Response.json({ error: e.message, errors: e.errors }, {
      status: 400,
    });
  }
  const msg = e instanceof Error ? e.message : String(e);
  return Response.json({ error: msg }, { status: 500 });
}
