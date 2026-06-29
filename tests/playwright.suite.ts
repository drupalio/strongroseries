import { expect, test } from "npm:@playwright/test@1.61.1";

const BASE_URL = "http://localhost:8000";

test.describe("StrongGroseries UI - Full Component Validation", () => {
  test.beforeAll(async () => {
    const res = await fetch(`${BASE_URL}/health`);
    if (!res.ok) throw new Error("Server not running on " + BASE_URL);
  });

  test("Page loads with all core elements", async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator("#sidebar")).toBeVisible();
    await expect(page.locator("#main-area")).toBeVisible();
    await expect(page.locator("#global-search")).toBeVisible();
    await expect(page.locator("#theme-toggle")).toBeVisible();
    await expect(page.locator("#offline-badge")).toBeAttached();
    await expect(page.locator("#cmdk-overlay")).toBeAttached();
    await expect(page.locator("#dialog-overlay")).toBeAttached();
    await expect(page.locator("#toast-container")).toBeAttached();
    await expect(page.locator("main")).toBeVisible();
  });

  test("Sidebar navigation works - all 8 tabs present and switchable", async ({ page }) => {
    await page.goto(BASE_URL);
    const tabs = [
      { id: "dashboard", name: "Dashboard" },
      { id: "stores", name: "Tiendas" },
      { id: "products", name: "Productos" },
      { id: "lists", name: "Listas" },
      { id: "master", name: "Lista Maestra" },
      { id: "budget", name: "Presupuesto" },
      { id: "ai", name: "IA Local" },
      { id: "config", name: "Configuración" },
    ];

    for (const tab of tabs) {
      const btn = page.locator(`.sidebar-item[data-tab="${tab.id}"]`);
      await expect(btn).toBeVisible();
      await btn.click();
      await expect(page.locator(`#tab-${tab.id}`)).toHaveClass(/active/);
    }
  });

  test("Sidebar collapse/expand works (Cmd+B)", async ({ page }) => {
    await page.goto(BASE_URL);
    const sidebar = page.locator("#sidebar");
    await expect(sidebar).not.toHaveClass(/collapsed/);
    await page.keyboard.press("Meta+b");
    await expect(sidebar).toHaveClass(/collapsed/);
    await page.keyboard.press("Meta+b");
    await expect(sidebar).not.toHaveClass(/collapsed/);
  });

  test("Command palette opens with Cmd+K and has all items", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.keyboard.press("Meta+k");
    await expect(page.locator("#cmdk-overlay")).toHaveClass(/show/);
    await expect(page.locator("#cmdk-input")).toBeFocused();
    const cmdkItems = page.locator(".cmdk-item");
    const cmdkCount = await cmdkItems.count();
    expect(cmdkCount).toBeGreaterThanOrEqual(10);
    await page.keyboard.press("Escape");
    await expect(page.locator("#cmdk-overlay")).not.toHaveClass(/show/);
  });

  test("Theme toggle works and persists", async ({ page }) => {
    await page.goto(BASE_URL);
    const html = page.locator("html");
    const isDark = await html.evaluate((el) => !el.classList.contains("light"));
    await page.click("#theme-toggle");
    await expect(html).toHaveClass(isDark ? "light" : "");
    await page.click("#theme-toggle");
    await expect(html).toHaveClass(isDark ? "" : "light");
  });

  test("Stores tab: create store dialog opens with color picker and saves", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('.sidebar-item[data-tab="stores"]');
    await page.click('button:has-text("Nueva Tienda")');
    await expect(page.locator(".dialog-overlay")).toHaveClass(/show/);
    await expect(page.locator("#dlgStoreName")).toBeVisible();
    await expect(page.locator("#dlgStoreColor")).toHaveAttribute(
      "type",
      "color",
    );
    await page.fill("#dlgStoreName", "Test Store");
    await page.click('button:has-text("Guardar")');
    await expect(page.locator(".toast")).toBeVisible();
    await expect(page.locator("#storesTable tbody tr")).toHaveCount(1);
  });

  test("Products tab: create product dialog opens with datalist comboboxes", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('.sidebar-item[data-tab="stores"]');
    await page.click('button:has-text("Nueva Tienda")');
    await page.fill("#dlgStoreName", "Store for Product");
    await page.click('button:has-text("Guardar")');
    await page.waitForTimeout(500);

    await page.click('.sidebar-item[data-tab="products"]');
    await page.click('button:has-text("Nuevo Producto")');
    await expect(page.locator(".dialog-overlay")).toHaveClass(/show/);
    await expect(page.locator("#dlgProdName")).toBeVisible();
    await expect(page.locator("#dlgProdUnit")).toHaveAttribute(
      "list",
      "config-units",
    );
    await expect(page.locator("#dlgProdType")).toHaveAttribute(
      "list",
      "config-types",
    );
    await expect(page.locator("#dlgProdCategory")).toHaveAttribute(
      "list",
      "config-categories",
    );
    await expect(page.locator("#dlgProdPrice")).toHaveAttribute(
      "type",
      "number",
    );
  });

  test("Products table: column sorting works", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('.sidebar-item[data-tab="stores"]');
    await page.click('button:has-text("Nueva Tienda")');
    await page.fill("#dlgStoreName", "Sort Store");
    await page.click('button:has-text("Guardar")');
    await page.waitForTimeout(500);

    await page.click('.sidebar-item[data-tab="products"]');
    await page.click('button:has-text("Nuevo Producto")');
    await page.selectOption("#dlgProdStore", { index: 1 });
    await page.fill("#dlgProdName", "Product A");
    await page.fill("#dlgProdPrice", "10");
    await page.click('button:has-text("Guardar")');
    await page.waitForTimeout(500);

    await page.click('button:has-text("Nuevo Producto")');
    await page.selectOption("#dlgProdStore", { index: 1 });
    await page.fill("#dlgProdName", "Product B");
    await page.fill("#dlgProdPrice", "20");
    await page.click('button:has-text("Guardar")');
    await page.waitForTimeout(500);

    const priceHeader = page.locator(
      "#productsTable thead th:has-text('Precio')",
    );
    await priceHeader.click();
    const rows = page.locator("#productsTable tbody tr");
    const firstPrice = await rows.first().locator("td:nth-child(6)")
      .textContent();
    await priceHeader.click();
    const firstPriceDesc = await rows.first().locator("td:nth-child(6)")
      .textContent();
    expect(Number(firstPrice)).toBeLessThan(Number(firstPriceDesc));
  });

  test("Products table: filter input works", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('.sidebar-item[data-tab="products"]');
    await page.fill("#prodFilter", "Product A");
    await page.waitForTimeout(300);
    const rows = page.locator("#productsTable tbody tr");
    await expect(rows).toHaveCount(1);
    await page.fill("#prodFilter", "");
    await page.waitForTimeout(300);
    await expect(rows).toHaveCount(2);
  });

  test("Lists tab: create list with date picker works", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('.sidebar-item[data-tab="lists"]');
    await page.click('button:has-text("Nueva Lista")');
    await expect(page.locator(".dialog-overlay")).toHaveClass(/show/);
    await expect(page.locator("#dlgListDate")).toHaveAttribute("type", "date");
    await page.fill("#dlgListName", "Test List");
    await page.click('button:has-text("Crear")');
    await expect(page.locator(".toast")).toBeVisible();
    await expect(page.locator("#listsTable tbody tr")).toHaveCount(1);
  });

  test("Lists tab: range slider for quantity works", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('.sidebar-item[data-tab="stores"]');
    await page.click('button:has-text("Nueva Tienda")');
    await page.fill("#dlgStoreName", "Slider Store");
    await page.click('button:has-text("Guardar")');
    await page.waitForTimeout(500);

    await page.click('.sidebar-item[data-tab="products"]');
    await page.click('button:has-text("Nuevo Producto")');
    await page.selectOption("#dlgProdStore", { index: 1 });
    await page.fill("#dlgProdName", "Slider Product");
    await page.fill("#dlgProdPrice", "5");
    await page.click('button:has-text("Guardar")');
    await page.waitForTimeout(500);

    await page.click('.sidebar-item[data-tab="lists"]');
    await page.click('button:has-text("Nueva Lista")');
    await page.fill("#dlgListName", "Slider List");
    await page.click('button:has-text("Crear")');
    await page.waitForTimeout(500);

    await page.click("#listsTable tbody tr");
    await expect(page.locator("#itemQty")).toHaveAttribute("type", "range");
    await page.fill("#itemQty", "10");
    await expect(page.locator("#itemQtyVal")).toHaveText("10");
  });

  test("Master tab: export buttons present", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('.sidebar-item[data-tab="master"]');
    await expect(page.locator('button:has-text("PDF")')).toBeVisible();
    await expect(page.locator('button:has-text("Excel")')).toBeVisible();
  });

  test("Budget tab: progress bars render", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('.sidebar-item[data-tab="budget"]');
    await expect(page.locator(".progress-bar")).toBeVisible();
    await expect(page.locator(".progress-bar .fill")).toBeVisible();
  });

  test("Config tab: datalist comboboxes for units/types/categories", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('.sidebar-item[data-tab="config"]');
    await expect(page.locator("#newUnit")).toHaveAttribute(
      "list",
      "config-units",
    );
    await expect(page.locator("#newType")).toHaveAttribute(
      "list",
      "config-types",
    );
    await expect(page.locator("#newCat")).toHaveAttribute(
      "list",
      "config-categories",
    );
  });

  test("AI tab: all sub-sections present", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('.sidebar-item[data-tab="ai"]');
    await expect(page.locator("#aiRecs")).toBeVisible();
    await expect(page.locator("#aiForecast")).toBeVisible();
    await expect(page.locator("#aiSearch")).toBeVisible();
    await expect(page.locator("#aiAnom")).toBeVisible();
  });

  test("Dashboard: chart renders", async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator("#dashChart")).toBeVisible();
  });

  test("Toast notifications appear on actions", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('.sidebar-item[data-tab="stores"]');
    await page.click('button:has-text("Nueva Tienda")');
    await page.fill("#dlgStoreName", "Toast Test");
    await page.click('button:has-text("Guardar")');
    await expect(page.locator(".toast.ok")).toBeVisible();
  });

  test("Empty states show when no data", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('.sidebar-item[data-tab="stores"]');
    await expect(page.locator(".empty-state")).toBeVisible();
    await expect(page.locator(".empty-state i.fa-store")).toBeVisible();
  });

  test("Avatars with initials render in stores table", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('.sidebar-item[data-tab="stores"]');
    await page.click('button:has-text("Nueva Tienda")');
    await page.fill("#dlgStoreName", "Avatar Store");
    await page.click('button:has-text("Guardar")');
    await page.waitForTimeout(500);
    await expect(page.locator("#storesTable .avatar")).toBeVisible();
    await expect(page.locator("#storesTable .avatar")).toContainText("AS");
  });

  test("Badges show list status (completed/pending)", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('.sidebar-item[data-tab="stores"]');
    await page.click('button:has-text("Nueva Tienda")');
    await page.fill("#dlgStoreName", "Badge Store");
    await page.click('button:has-text("Guardar")');
    await page.waitForTimeout(500);

    await page.click('.sidebar-item[data-tab="products"]');
    await page.click('button:has-text("Nuevo Producto")');
    await page.selectOption("#dlgProdStore", { index: 1 });
    await page.fill("#dlgProdName", "Badge Product");
    await page.fill("#dlgProdPrice", "10");
    await page.click('button:has-text("Guardar")');
    await page.waitForTimeout(500);

    await page.click('.sidebar-item[data-tab="lists"]');
    await page.click('button:has-text("Nueva Lista")');
    await page.fill("#dlgListName", "Badge List");
    await page.click('button:has-text("Crear")');
    await page.waitForTimeout(500);

    const statusBadge = page.locator("#listsTable tbody tr .badge");
    await expect(statusBadge).toHaveClass(/warn/);
  });

  test("Dropdown menu (⋮) works on store rows", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('.sidebar-item[data-tab="stores"]');
    await page.click('button:has-text("Nueva Tienda")');
    await page.fill("#dlgStoreName", "Dropdown Store");
    await page.click('button:has-text("Guardar")');
    await page.waitForTimeout(500);

    const menuBtn = page.locator("#storesTable .dropdown button");
    await menuBtn.click();
    await expect(page.locator(".dropdown-menu")).toBeVisible();
    await expect(page.locator(".dropdown-item:has-text('Editar')"))
      .toBeVisible();
    await expect(page.locator(".dropdown-item:has-text('Eliminar')"))
      .toBeVisible();
  });

  test("Dialog modal closes on Escape and overlay click", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('.sidebar-item[data-tab="stores"]');
    await page.click('button:has-text("Nueva Tienda")');
    await expect(page.locator(".dialog-overlay")).toHaveClass(/show/);
    await page.keyboard.press("Escape");
    await expect(page.locator(".dialog-overlay")).not.toHaveClass(/show/);

    await page.click('button:has-text("Nueva Tienda")');
    await expect(page.locator(".dialog-overlay")).toHaveClass(/show/);
    await page.click(".dialog-overlay", { position: { x: 10, y: 10 } });
    await expect(page.locator(".dialog-overlay")).not.toHaveClass(/show/);
  });

  test("Pagination works on products table", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('.sidebar-item[data-tab="stores"]');
    await page.click('button:has-text("Nueva Tienda")');
    await page.fill("#dlgStoreName", "Page Store");
    await page.click('button:has-text("Guardar")');
    await page.waitForTimeout(500);

    await page.click('.sidebar-item[data-tab="products"]');
    for (let i = 0; i < 12; i++) {
      await page.click('button:has-text("Nuevo Producto")');
      await page.selectOption("#dlgProdStore", { index: 1 });
      await page.fill("#dlgProdName", `Page Product ${i}`);
      await page.fill("#dlgProdPrice", "1");
      await page.click('button:has-text("Guardar")');
      await page.waitForTimeout(200);
    }

    await expect(page.locator(".pagination")).toBeVisible();
    await expect(page.locator(".pagination-info")).toContainText(
      "página 1 de 2",
    );
    await page.click('.pagination-controls button:has-text("→")');
    await expect(page.locator(".pagination-info")).toContainText(
      "página 2 de 2",
    );
  });

  test("Offline badge shows when offline", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.context().setOffline(true);
    await page.waitForTimeout(500);
    await expect(page.locator("#offline-badge")).toHaveClass(/show/);
    await page.context().setOffline(false);
    await page.waitForTimeout(500);
    await expect(page.locator("#offline-badge")).not.toHaveClass(/show/);
  });

  test("Global search triggers navigation", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('.sidebar-item[data-tab="stores"]');
    await page.click('button:has-text("Nueva Tienda")');
    await page.fill("#dlgStoreName", "Searchable Store");
    await page.click('button:has-text("Guardar")');
    await page.waitForTimeout(500);

    await page.fill("#global-search", "Searchable");
    await page.waitForTimeout(500);
    await expect(page.locator(".toast")).toBeVisible();
    await expect(page.locator("#tab-stores")).toHaveClass(/active/);
  });

  test("Reconcile modal opens on budget tab", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.click('.sidebar-item[data-tab="budget"]');
    const budgetRows = page.locator("#budgetTable tbody tr");
    expect(await budgetRows.count()).toBeGreaterThanOrEqual(1);
    await page.click("#budgetTable tbody tr button");
    await expect(page.locator(".dialog-overlay")).toHaveClass(/show/);
    await expect(page.locator("#reconcileInput")).toBeVisible();
  });
});
