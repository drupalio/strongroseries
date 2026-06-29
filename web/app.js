const api = async (p, opts) => {
  console.log(`[API] ${opts?.method || "GET"} ${p}`, opts?.body || "");
  const r = await fetch(p, opts);
  const body = await r.json();
  console.log(`[API] response ${r.status}`, body);
  if (!r.ok) throw new Error(body.error || "Error del servidor");
  return body;
};
window.addEventListener("unhandledrejection", (e) => {
  if (e.reason?.message) toast(e.reason.message, "err");
});
const $ = (sel) =>
  /[ #\.>\[:]/.test(sel)
    ? document.querySelector(sel)
    : document.getElementById(sel) ?? document.querySelector(`#${sel}`);
const $$ = (sel) => document.querySelectorAll(sel);

if ("serviceWorker" in navigator) {
  window.addEventListener(
    "load",
    () => navigator.serviceWorker.register("/sw.js").catch(() => {}),
  );
}
function cacheGet(key) {
  try {
    const v = localStorage.getItem("cache:" + key);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}
function cacheSet(key, data) {
  try {
    localStorage.setItem("cache:" + key, JSON.stringify(data));
  } catch {}
}
async function cachedFetch(path, fallbackKey) {
  const url = path + (path.includes("?") ? "&" : "?") + "_=" + Date.now();
  try {
    const data = await fetch(url).then((r) => r.json());
    cacheSet(fallbackKey, data);
    return data;
  } catch {
    const cached = cacheGet(fallbackKey);
    if (cached) {
      toast("Usando cache local [offline]", "warn");
      return cached;
    }
    throw new Error("Sin datos");
  }
}
function toast(msg, kind = "ok") {
  const c = $("toast-container");
  if (!c) return;
  const t = document.createElement("div");
  t.className = "toast " + kind;
  const icon = kind === "ok"
    ? "check-circle"
    : kind === "warn"
    ? "exclamation-triangle"
    : "times-circle";
  t.innerHTML = `<i class="fas fa-${icon}"></i><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => {
    t.style.opacity = "0";
    setTimeout(() => t.remove(), 200);
  }, 3000);
}
window.toast = toast;

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase().slice(0, 2);
}
window.getInitials = getInitials;
function avatarColor(name) {
  if (!name) return "hsl(var(--primary))";
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${h}, 65%, 45%)`;
}
window.avatarColor = avatarColor;

(function initTheme() {
  const saved = localStorage.getItem("theme");
  if (saved === "light") document.documentElement.classList.add("light");
  const btn = $("theme-toggle");
  if (btn) {
    btn.onclick = () => {
      const isLight = document.documentElement.classList.toggle("light");
      localStorage.setItem("theme", isLight ? "light" : "dark");
      btn.innerHTML = isLight
        ? '<i class="fas fa-sun"></i>'
        : '<i class="fas fa-moon"></i>';
    };
  }
})();

(function initSidebar() {
  const sidebar = $("sidebar");
  const btn = $("sidebar-toggle");
  const navBtn = $("nav-toggle");
  if (btn) {
    btn.onclick = () => {
      sidebar.classList.toggle("collapsed");
      btn.innerHTML = sidebar.classList.contains("collapsed")
        ? '<i class="fas fa-angle-right"></i>'
        : '<i class="fas fa-angle-left"></i>';
    };
  }
  if (navBtn) navBtn.onclick = () => sidebar.classList.toggle("mobile-open");
  if (window.innerWidth <= 768) navBtn.style.display = "inline-flex";
  window.addEventListener("resize", () => {
    if (window.innerWidth <= 768) navBtn.style.display = "inline-flex";
    else navBtn.style.display = "none";
  });
})();

(function initOffline() {
  const badge = $("offline-badge");
  if (!badge) return;
  const update = () => badge.classList.toggle("show", !navigator.onLine);
  update();
  window.addEventListener("online", () => {
    update();
    toast("Conexión restablecida");
  });
  window.addEventListener("offline", () => {
    update();
    toast("Sin conexión — usando cache", "warn");
  });
})();

document.addEventListener("keydown", (e) => {
  if (e.metaKey && e.key === "b") {
    e.preventDefault();
    $("sidebar")?.classList.toggle("collapsed");
  }
  if (e.metaKey && e.key === "k") {
    e.preventDefault();
    openCmdK();
  }
  if (e.key === "Escape") {
    closeCmdK();
    closeDialog();
  }
});

const CMDK_ITEMS = [
  {
    group: "Navegación",
    icon: "home",
    label: "Dashboard",
    shortcut: "G D",
    action: () => navTo("dashboard"),
  },
  {
    group: "Navegación",
    icon: "store",
    label: "Tiendas",
    shortcut: "G S",
    action: () => navTo("stores"),
  },
  {
    group: "Navegación",
    icon: "shopping-bag",
    label: "Productos",
    shortcut: "G P",
    action: () => navTo("products"),
  },
  {
    group: "Navegación",
    icon: "list-check",
    label: "Listas",
    shortcut: "G L",
    action: () => navTo("lists"),
  },
  {
    group: "Navegación",
    icon: "clipboard-list",
    label: "Lista Maestra",
    shortcut: "G M",
    action: () => navTo("master"),
  },
  {
    group: "Navegación",
    icon: "chart-pie",
    label: "Presupuesto",
    shortcut: "G B",
    action: () => navTo("budget"),
  },
  {
    group: "Navegación",
    icon: "brain",
    label: "IA Local",
    shortcut: "G A",
    action: () => navTo("ai"),
  },
  {
    group: "Navegación",
    icon: "warehouse",
    label: "Despensa",
    shortcut: "G D",
    action: () => navTo("pantry"),
  },
  {
    group: "Navegación",
    icon: "history",
    label: "Histórico Despensa",
    shortcut: "G H",
    action: () => navTo("pantry-history"),
  },
  {
    group: "Navegación",
    icon: "cog",
    label: "Configuración",
    shortcut: "G C",
    action: () => navTo("config"),
  },
  {
    group: "Acciones",
    icon: "plus",
    label: "Nueva Tienda",
    action: () => {
      navTo("stores");
      openStoreDialog();
    },
  },
  {
    group: "Acciones",
    icon: "plus",
    label: "Nuevo Producto",
    action: () => {
      navTo("products");
      openProductDialog();
    },
  },
  {
    group: "Acciones",
    icon: "warehouse",
    label: "Ir a Despensa",
    action: () => navTo("pantry"),
  },
  {
    group: "Acciones",
    icon: "plus",
    label: "Nueva Lista",
    action: () => {
      navTo("lists");
      openListDialog();
    },
  },
  {
    group: "Acciones",
    icon: "file-pdf",
    label: "Exportar Todo PDF",
    action: () => exportMasterPdf(),
  },
  {
    group: "Acciones",
    icon: "file-excel",
    label: "Exportar Excel",
    action: () => exportMasterXlsx(),
  },
  {
    group: "Acciones",
    icon: "sync",
    label: "Recomendaciones IA",
    action: () => {
      navTo("ai");
      loadAI("recs");
    },
  },
  {
    group: "Acciones",
    icon: "database",
    label: "Crear Backup",
    action: () => {
      navTo("config");
      createBackup();
    },
  },
];
let cmdkActive = -1;
function openCmdK() {
  $("cmdk-overlay")?.classList.add("show");
  const input = $("cmdk-input");
  if (input) {
    input.value = "";
    input.focus();
  }
  renderCmdK("");
}
function closeCmdK() {
  $("cmdk-overlay")?.classList.remove("show");
}
function renderCmdK(q) {
  const list = $("cmdk-list");
  if (!list) return;
  const filtered = q
    ? CMDK_ITEMS.filter((i) => i.label.toLowerCase().includes(q.toLowerCase()))
    : CMDK_ITEMS;
  cmdkActive = -1;
  if (!filtered.length) {
    list.innerHTML =
      '<div class="cmdk-empty">No se encontraron resultados</div>';
    return;
  }
  const groups = {};
  for (const item of filtered) {
    (groups[item.group] = groups[item.group] || []).push(item);
  }
  list.innerHTML = Object.entries(groups).map(([g, items]) =>
    `<div class="cmdk-group-label">${g}</div>` + items.map((item, i) => {
      const idx = filtered.indexOf(item);
      return `<div class="cmdk-item ${
        idx === cmdkActive ? "active" : ""
      }" data-idx="${idx}"><i class="fas fa-${item.icon}"></i><span>${item.label}</span>${
        item.shortcut
          ? `<span class="cmdk-shortcut">${item.shortcut}</span>`
          : ""
      }</div>`;
    }).join("")
  ).join("");
  list.querySelectorAll(".cmdk-item").forEach((el) => {
    el.onclick = () => {
      const item = filtered[Number(el.dataset.idx)];
      item?.action();
      closeCmdK();
    };
    el.onmouseenter = () => {
      cmdkActive = Number(el.dataset.idx);
      list.querySelectorAll(".cmdk-item").forEach((x) =>
        x.classList.remove("active")
      );
      el.classList.add("active");
    };
  });
}
$("cmdk-input")?.addEventListener("input", (e) => renderCmdK(e.target.value));
$("cmdk-overlay")?.addEventListener("click", (e) => {
  if (e.target.id === "cmdk-overlay") closeCmdK();
});
document.addEventListener("keydown", (e) => {
  if (!$("cmdk-overlay")?.classList.contains("show")) return;
  const items = $("cmdk-list")?.querySelectorAll(".cmdk-item");
  if (!items?.length) return;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    cmdkActive = Math.min(cmdkActive + 1, items.length - 1);
    items.forEach((x, i) => x.classList.toggle("active", i === cmdkActive));
    items[cmdkActive]?.scrollIntoView({ block: "nearest" });
  }
  if (e.key === "ArrowUp") {
    e.preventDefault();
    cmdkActive = Math.max(cmdkActive - 1, 0);
    items.forEach((x, i) => x.classList.toggle("active", i === cmdkActive));
    items[cmdkActive]?.scrollIntoView({ block: "nearest" });
  }
  if (e.key === "Enter") {
    e.preventDefault();
    items[cmdkActive]?.click();
  }
});
window.openCmdK = openCmdK;
window.closeCmdK = closeCmdK;

function openDialog(html) {
  const overlay = $("dialog-overlay");
  const dialog = $("dialog");
  if (!overlay || !dialog) return;
  dialog.innerHTML = html;
  overlay.classList.add("show");
}
function closeDialog() {
  $("dialog-overlay")?.classList.remove("show");
}
$("dialog-overlay")?.addEventListener("click", (e) => {
  if (e.target.id === "dialog-overlay") closeDialog();
});
window.openDialog = openDialog;
window.closeDialog = closeDialog;

function emptyState(icon, title, msg, ctaLabel, ctaFn) {
  return `<div class="empty-state"><i class="fas fa-${icon}"></i><h4>${title}</h4><p>${msg}</p>${
    ctaLabel
      ? `<button class="btn" onclick="${ctaFn}">${ctaLabel}</button>`
      : ""
  }</div>`;
}
window.emptyState = emptyState;

function openRowMenu(btnId, actions) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  const dropdown = btn.parentElement;
  if (dropdown.classList.contains("open")) {
    dropdown.classList.remove("open");
    return;
  }
  document.querySelectorAll(".dropdown.open").forEach((d) =>
    d.classList.remove("open")
  );
  dropdown.classList.add("open");
  const menu = dropdown.querySelector(".dropdown-menu");
  if (menu) {
    menu.innerHTML = actions.map((a, i) =>
      a.sep
        ? '<div class="dropdown-separator"></div>'
        : `<button class="dropdown-item ${
          a.danger ? "danger" : ""
        }" data-act="${i}"><i class="fas fa-${a.icon}"></i> ${a.label}</button>`
    ).join("");
  }
  menu.querySelectorAll(".dropdown-item").forEach((el) =>
    el.onclick = () => {
      const a = actions[Number(el.dataset.act)];
      a?.fn?.();
      dropdown.classList.remove("open");
    }
  );
}
window.openRowMenu = openRowMenu;
document.addEventListener("click", (e) => {
  if (!e.target.closest(".dropdown")) {
    document.querySelectorAll(".dropdown.open").forEach((d) =>
      d.classList.remove("open")
    );
  }
});

function renderPagination(containerId, page, pageSize, total, onChange) {
  const c = $(containerId);
  if (!c) return;
  const pages = Math.ceil(total / pageSize) || 1;
  c.innerHTML = `
    <div class="pagination-info">${total} resultado(s) · página ${
    page + 1
  } de ${pages}</div>
    <div class="pagination-controls">
      <button class="btn secondary" ${
    page === 0 ? "disabled" : ""
  } onclick="window._pagPrev && window._pagPrev()"><i class="fas fa-chevron-left"></i></button>
      <button class="btn secondary" ${
    page >= pages - 1 ? "disabled" : ""
  } onclick="window._pagNext && window._pagNext()"><i class="fas fa-chevron-right"></i></button>
    </div>`;
  window._pagPrev = () => onChange(Math.max(0, page - 1));
  window._pagNext = () => onChange(Math.min(pages - 1, page + 1));
}
window.renderPagination = renderPagination;

function showSkeleton(tableId, cols) {
  const tb = $(tableId)?.querySelector("tbody");
  if (tb) {
    tb.innerHTML = Array.from({ length: 3 }, () =>
      `<tr>${
        Array.from(
          { length: cols },
          () => `<td><div class="skeleton" style="height:18px"></div></td>`,
        ).join("")
      }</tr>`).join("");
  }
}

const tableState = {};
function sortBy(rows, key, asc = true) {
  return rows.slice().sort((a, b) => {
    const av = a[key] ?? "", bv = b[key] ?? "";
    if (typeof av === "number" && typeof bv === "number") {
      return asc ? av - bv : bv - av;
    }
    return asc
      ? String(av).localeCompare(String(bv))
      : String(bv).localeCompare(String(av));
  });
}
window.sortBy = sortBy;

(function initGlobalSearch() {
  const input = $("global-search");
  if (!input) return;
  let t;
  input.oninput = () => {
    clearTimeout(t);
    t = setTimeout(() => globalSearch(input.value.trim()), 250);
  };
})();
async function globalSearch(q) {
  if (q.length < 2) return;
  const r = await api(`/api/search?q=${encodeURIComponent(q)}`);
  const n = (r.stores?.length || 0) + (r.products?.length || 0) +
    (r.lists?.length || 0);
  toast(`${n} resultado(s) para "${q}"`);
  if (r.products?.length) navTo("products");
  else if (r.stores?.length) navTo("stores");
  else if (r.lists?.length) navTo("lists");
}
window.globalSearch = globalSearch;

function navTo(tab) {
  document.querySelectorAll(".sidebar-item").forEach((x) =>
    x.classList.remove("active")
  );
  document.querySelectorAll(".tab").forEach((x) =>
    x.classList.remove("active")
  );
  const btn = document.querySelector(`.sidebar-item[data-tab="${tab}"]`);
  const section = $(`tab-${tab}`);
  if (btn) btn.classList.add("active");
  if (section) section.classList.add("active");
  if (tab === "dashboard") loadDashboard();
  if (tab === "stores") loadStores();
  if (tab === "products") loadProducts();
  if (tab === "lists") {
    loadLists();
    loadStoreSelects();
  }
  if (tab === "master") loadMaster();
  if (tab === "budget") loadBudgets();
  if (tab === "config") loadConfig();
  if (tab === "pantry") loadPantry();
  if (tab === "pantry-history") loadPantryHistory();
  if (tab === "ai") {
    loadAI("recs");
    loadAI("forecast");
  }
  $("sidebar")?.classList.remove("mobile-open");
}
window.navTo = navTo;

document.querySelectorAll(".sidebar-item").forEach((b) =>
  b.onclick = () => navTo(b.dataset.tab)
);
navTo("dashboard");

// Load config datalists for product dialog
(async () => {
  for (const [k, dl] of [["units", "config-units"], ["product-types", "config-types"], ["categories", "config-categories"]]) {
    const items = await api(`/api/${k}`);
    const el = $(dl);
    if (el) el.innerHTML = items.map((n) => `<option value="${n}">`).join("");
  }
})();

// ===== Undo/Redo stack =====
const undoStack = [];
const redoStack = [];
const UNDO_MAX = 50;
function pushUndo(op) {
  undoStack.push(op);
  redoStack.length = 0;
  if (undoStack.length > UNDO_MAX) undoStack.shift();
  updateUndoButtons();
}
async function performUndo() {
  if (!undoStack.length) return toast("Nada que deshacer", "warn");
  const op = undoStack.pop();
  if (op.type === "addItem") {
    await api(`/api/items/${op.itemId}`, { method: "DELETE" });
  } else if (op.type === "delItem") {
    await api(`/api/lists/${op.listId}/items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId: op.productId, quantity: op.quantity }),
    });
  } else if (op.type === "updateQty") {
    await api(`/api/items/${op.itemId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ quantity: op.oldQty, unit: op.oldUnit }),
    });
  }
  redoStack.push(op);
  updateUndoButtons();
  toast("Deshecho");
  if (selectedListId) selectList(selectedListId);
}
window.performUndo = performUndo;
async function performRedo() {
  if (!redoStack.length) return toast("Nada que rehacer", "warn");
  const op = redoStack.pop();
  if (op.type === "addItem") {
    const r = await api(`/api/lists/${op.listId}/items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId: op.productId, quantity: op.quantity }),
    });
    if (op.itemId === undefined) op.itemId = r?.id;
  } else if (op.type === "delItem") {
    await api(`/api/items/${op.itemId}`, { method: "DELETE" });
  } else if (op.type === "updateQty") {
    await api(`/api/items/${op.itemId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ quantity: op.newQty, unit: op.newUnit }),
    });
  }
  undoStack.push(op);
  updateUndoButtons();
  toast("Rehecho");
  if (selectedListId) selectList(selectedListId);
}
window.performRedo = performRedo;
function updateUndoButtons() {
  const ub = $("undoBtn");
  if (ub) ub.disabled = !undoStack.length;
  const rb = $("redoBtn");
  if (rb) rb.disabled = !redoStack.length;
}

// ===== Stores =====
async function loadStores() {
  showSkeleton("storesTable", 4);
  const stores = await cachedFetch("/api/stores", "stores");
  updateBadges({ stores: stores.length });
  const products = await cachedFetch("/api/products", "products");
  const tb = $("storesTableBody");
  tb.innerHTML = "";
  if (!stores.length) {
    tb.innerHTML = `<tr><td colspan="4">${
      emptyState(
        "store",
        "Sin tiendas",
        "Crea tu primera tienda para empezar",
        "Nueva Tienda",
        "openStoreDialog()",
      )
    }</td></tr>`;
    return;
  }
  for (const s of stores) {
    const count = products.filter((p) => p.storeId === s.id).length;
    const av = `<div class="avatar" style="background:${
      s.color || avatarColor(s.name)
    }">${getInitials(s.name)}</div>`;
    tb.insertAdjacentHTML(
      "beforeend",
      `<tr>
      <td>${av}</td><td>${
        s.name ?? ""
      }</td><td><span class="badge">${count}</span></td>
      <td><div class="dropdown"><button class="icon-btn" id="storeMenu-${s.id}" onclick="openRowMenu('storeMenu-${s.id}', [{icon:'edit',label:'Editar',fn:()=>openStoreDialog(${s.id})},{sep:true},{icon:'trash',label:'Eliminar',danger:true,fn:()=>delStore(${s.id})}])"><i class="fas fa-ellipsis-vertical"></i></button><div class="dropdown-menu"></div></div></td>
    </tr>`,
    );
  }
}
function openStoreDialog(id) {
  const stores = cacheGet("stores") || [];
  const store = id ? stores.find((s) => s.id === id) : null;
  openDialog(`
    <div class="dialog-header"><h3>${
    id ? "Editar Tienda" : "Nueva Tienda"
  }</h3><button class="icon-btn" onclick="closeDialog()"><i class="fas fa-times"></i></button></div>
    <div class="field"><label>Nombre</label><input id="dlgStoreName" placeholder="Ej: Walmart" value="${
    store ? store.name : ""
  }" autocomplete="off"></div>
    <div class="field"><label>Color</label><div class="row"><input id="dlgStoreColor" type="color" value="${
    store ? store.color || "#7c3aed" : "#7c3aed"
  }"><span class="muted" id="colorVal">${
    store ? store.color || "#7c3aed" : "#7c3aed"
  }</span></div></div>
    <div class="dialog-footer"><button class="btn secondary" onclick="closeDialog()">Cancelar</button><button class="btn" onclick="saveStore(${
    id || ""
  })"><i class="fas fa-check"></i> ${
    id ? "Actualizar" : "Guardar"
  }</button></div>
  `);
  $("dlgStoreColor").oninput = (e) =>
    $("colorVal").textContent = e.target.value;
  $("dlgStoreName").focus();
}
window.openStoreDialog = openStoreDialog;
async function saveStore(id) {
  const name = $("dlgStoreName").value.trim();
  if (!name) return toast("Nombre requerido", "warn");
  const color = $("dlgStoreColor").value;
  if (id) {
    await api(`/api/stores/${id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, color }),
    });
    toast("Tienda actualizada");
  } else {
    await api("/api/stores", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, color }),
    });
    toast("Tienda creada");
  }
  closeDialog();
  loadStores();
  loadStoreSelects();
}
window.saveStore = saveStore;
async function delStore(id) {
  const tb = $("storesTableBody");
  const row = tb?.querySelector(`tr:has(#storeMenu-${id})`);
  if (row) row.remove();
  try {
    await api(`/api/stores/${id}`, { method: "DELETE" });
    toast("Tienda eliminada");
  } catch {
    toast("Error al eliminar", "err");
    loadStores();
  }
}
window.delStore = delStore;

// ===== Products =====
let productsData = [], productsPage = 0, productsPageSize = 10;
async function loadProducts() {
  showSkeleton("productsTable", 7);
  const [stores, products] = await Promise.all([
    cachedFetch("/api/stores", "stores"),
    cachedFetch("/api/products", "products"),
  ]);
  productsData = products;
  updateBadges({ products: products.length });
  const sel = $("prodStoreFilter");
  sel.innerHTML = '<option value="">Todas</option>' +
    stores.map((s) => `<option value="${s.id}">${s.name}</option>`).join("");
  sel.onchange = () => renderProducts();
  $("prodFilter").oninput = () => {
    productsPage = 0;
    renderProducts();
  };
  window.filterInput = $("prodFilter");
  renderProducts();
}
function renderProducts() {
  const q = $("prodFilter").value.toLowerCase();
  const storeId = $("prodStoreFilter").value;
  let filtered = productsData;
  if (storeId) filtered = filtered.filter((p) => p.storeId == storeId);
  if (q) {
    filtered = filtered.filter((p) =>
      (p.name ?? "").toLowerCase().includes(q) ||
      (p.category ?? "").toLowerCase().includes(q)
    );
  }
  const sortKey = tableState.productsSortKey;
  const sortAsc = tableState.productsSortAsc !== false;
  if (sortKey) filtered = sortBy(filtered, sortKey, sortAsc);
  const total = filtered.length;
  const start = productsPage * productsPageSize;
  const pageItems = filtered.slice(start, start + productsPageSize);
  const tb = $("productsTableBody");
  tb.innerHTML = "";
  if (!pageItems.length) {
    tb.innerHTML = `<tr><td colspan="7">${
      emptyState(
        "shopping-bag",
        "Sin productos",
        "Crea un producto para empezar",
        "Nuevo Producto",
        "openProductDialog()",
      )
    }</td></tr>`;
    renderPagination("productsPagination", 0, 10, 0, () => {});
    return;
  }
  for (const p of pageItems) {
    tb.insertAdjacentHTML(
      "beforeend",
      `<tr>
      <td>${p.name ?? ""}</td><td>${p.storeName ?? ""}</td><td>${
        p.unit ?? ""
      }</td><td>${p.productType ?? ""      }</td><td>${p.category ?? ""}</td><td>${
        p.currentPrice != null ? `$${p.currentPrice.toFixed(2)}` : ""
      }</td>
      <td><div class="dropdown"><button class="icon-btn" id="prodMenu-${p.id}" onclick="openRowMenu('prodMenu-${p.id}', [{icon:'edit',label:'Editar',fn:()=>openProductDialog(${p.id})},{icon:'chart-line',label:'Precios',fn:()=>showPriceHistory(${p.id})},{sep:true},{icon:'trash',label:'Eliminar',danger:true,fn:()=>delProduct(${p.id})}])"><i class="fas fa-ellipsis-vertical"></i></button><div class="dropdown-menu"></div></div></td>
    </tr>`,
    );
  }
  const ths = $("productsTable")?.querySelectorAll("thead th");
  ths?.forEach((th, i) => {
    th.onclick = () => {
      const key = [
        "name",
        "storeName",
        "unit",
        "productType",
        "category",
        "currentPrice",
      ][i];
      if (!key) return;
      tableState.productsSortKey = key;
      tableState.productsSortAsc = tableState.productsSortKey === key
        ? !tableState.productsSortAsc
        : true;
      th.dataset.sort = tableState.productsSortAsc ? "asc" : "desc";
      renderProducts();
    };
  });
  renderPagination(
    "productsPagination",
    productsPage,
    productsPageSize,
    total,
    (p) => {
      productsPage = p;
      renderProducts();
    },
  );
}
function openProductDialog(id) {
  const stores = cacheGet("stores") || [];
  const products = cacheGet("products") || [];
  const prod = id ? products.find((p) => p.id === id) : null;
  openDialog(`
    <div class="dialog-header"><h3>${
    id ? "Editar Producto" : "Nuevo Producto"
  }</h3><button class="icon-btn" onclick="closeDialog()"><i class="fas fa-times"></i></button></div>
    <div class="field"><label>Tienda</label><select id="dlgProdStore">${
    stores.map((s) =>
      `<option value="${s.id}" ${
        prod?.storeId === s.id ? "selected" : ""
      }>${s.name}</option>`
    ).join("")
  }</select></div>
    <div class="field"><label>Nombre</label><input id="dlgProdName" placeholder="Ej: Leche" value="${
    prod ? prod.name : ""
  }" autocomplete="off"></div>

    <div class="grid">
      <div class="field"><label>Unidad</label><input id="dlgProdUnit" list="config-units" placeholder="Litro" value="${
    prod ? prod.unit : ""
  }"></div>
      <div class="field"><label>Tipo</label><input id="dlgProdType" list="config-types" placeholder="Recurrente" value="${
    prod ? prod.productType : ""
  }"></div>
    </div>
    <div class="grid">
      <div class="field"><label>Categoría</label><input id="dlgProdCategory" list="config-categories" placeholder="Lácteos" value="${
    prod ? prod.category || "" : ""
  }"></div>
      <div class="field"><label>Precio</label><input id="dlgProdPrice" type="number" min="0" step="0.01" placeholder="0.00" value="${
    prod ? prod.currentPrice || "" : ""
  }"></div>
    </div>
    <div class="dialog-footer"><button class="btn secondary" onclick="closeDialog()">Cancelar</button><button class="btn" onclick="saveProduct(${
    id || ""
  })"><i class="fas fa-check"></i> ${
    id ? "Actualizar" : "Guardar"
  }</button></div>
  `);
  $("dlgProdName").focus();
}
window.openProductDialog = openProductDialog;
async function saveProduct(id) {
  const name = $("dlgProdName").value.trim();
  if (!name) return toast("Nombre requerido", "warn");
  const priceVal = $("dlgProdPrice").value;
  if (priceVal === "") return toast("Precio requerido", "warn");
  const b = {
    storeId: Number($("dlgProdStore").value),
    storeName: "",
    name,
    unit: $("dlgProdUnit").value,
    productType: $("dlgProdType").value,
    category: $("dlgProdCategory").value,
    currentPrice: Number(priceVal),
  };
  console.log("[saveProduct] body a enviar:", JSON.stringify(b));
  if (id) {
    await api(`/api/products/${id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(b),
    });
    toast("Producto actualizado");
  } else {
    await api("/api/products", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(b),
    });
    toast("Producto creado");
  }
  closeDialog();
  loadProducts();
}
window.saveProduct = saveProduct;
async function delProduct(id) {
  const row = $("productsTableBody")?.querySelector(`tr:has(#prodMenu-${id})`);
  if (row) row.remove();
  try {
    await api(`/api/products/${id}`, { method: "DELETE" });
    toast("Producto eliminado");
  } catch {
    toast("Error", "err");
    loadProducts();
  }
}
window.delProduct = delProduct;

// ===== Price History =====
async function showPriceHistory(productId) {
  const products = cacheGet("products") || [];
  const prod = products.find((p) => p.id === productId);
  const prices = await api(`/api/products/${productId}/prices`);
  openDialog(`
    <div class="dialog-header"><h3>Historial de Precios${
    prod ? " — " + prod.name : ""
  }</h3><button class="icon-btn" onclick="closeDialog()"><i class="fas fa-times"></i></button></div>
    <div class="field"><label>Nuevo precio</label><input id="newPrice" type="number" min="0" step="0.01" placeholder="0.00"></div>
    <div class="field"><label>Fecha</label><input id="newPriceDate" type="date" value="${
    new Date().toISOString().slice(0, 10)
  }"></div>
    <button class="btn" onclick="addPrice(${productId})"><i class="fas fa-plus"></i> Agregar Precio</button>
    <div style="margin-top:16px;max-height:300px;overflow-y:auto">
      <table style="width:100%;font-size:13px"><thead><tr><th>Fecha</th><th>Precio</th></tr></thead><tbody id="priceHistoryBody">${
    prices.length
      ? prices.map((p) =>
        `<tr><td>${p.effectiveDate}</td><td>$${p.price.toFixed(2)}</td></tr>`
      ).join("")
      : '<tr><td colspan="2" style="text-align:center;color:hsl(var(--muted-foreground))">Sin historial</td></tr>'
  }</tbody></table>
    </div>
    <div class="dialog-footer"><button class="btn secondary" onclick="closeDialog()">Cerrar</button></div>
  `);
}
window.showPriceHistory = showPriceHistory;
async function addPrice(productId) {
  const price = Number($("newPrice").value);
  const date = $("newPriceDate").value;
  console.log("[addPrice] form values:", { productId, price, date, rawPrice: $("newPrice").value, rawDate: $("newPriceDate").value });
  if (isNaN(price) || !date) return toast("Precio y fecha requeridos", "warn");
  try {
    await api(`/api/products/${productId}/prices`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ price, effectiveDate: date }),
    });
    toast("Precio agregado");
    cacheSet("products", null);
    loadProducts();
    showPriceHistory(productId);
  } catch (e) {
    toast(e.message || "Error al agregar precio", "err");
  }
}
window.addPrice = addPrice;

// ===== Store selects =====
async function loadStoreSelects() {
  await cachedFetch("/api/stores", "stores");
}

// ===== Lists =====
async function loadLists() {
  hideProductArea();
  selectedListId = null;
  const monthEl = $("listMonthInput");
  if (monthEl && !monthEl.value) {
    monthEl.value = new Date().toISOString().slice(0, 10);
  }
  const raw = monthEl?.value || new Date().toISOString().slice(0, 10);
  const month = raw.slice(0, 7);
  showSkeleton("listsTable", 6);
  const [lists, allLists, allListsTotal] = await Promise.all([
    cachedFetch(`/api/lists?month=${month}`, "lists"),
    cachedFetch("/api/products", "products"),
    fetch("/api/lists?_=" + Date.now()).then((r) => r.json()),
  ]);
  window._allProducts = allLists;
  updateBadges({ lists: allListsTotal.length });
  const tb = $("listsTableBody");
  tb.innerHTML = "";
  if (!lists.length) {
    const [y, m] = month.split("-");
    const monthName = new Date(+y, +m - 1).toLocaleDateString("es", {
      month: "long",
      year: "numeric",
    });
    tb.innerHTML = `<tr><td colspan="6"><div class="empty-state">
      <i class="fas fa-calendar-plus"></i>
      <h4>Sin listas en ${monthName}</h4>
      <p>Crea una lista de compras para este mes</p>
      <button class="btn" onclick="openListDialog()">Nueva Lista</button>
    </div></td></tr>`;
  }
  for (const l of lists) {
    tb.insertAdjacentHTML(
      "beforeend",
      `<tr onclick="selectList(${l.id})" style="cursor:pointer">
    <td>${l.name ?? ""}</td><td>${
        l.month ?? ""
      }</td><td>${l.itemCount}</td><td>$${
        l.estimatedTotal?.toFixed(2) ?? "0.00"
      }</td>
    <td><span class="badge ${l.completed ? "ok" : "warn"}">${
        l.completed ? "Consolidada" : "Creada"
      }</span></td>
    <td><div class="dropdown"><button class="icon-btn" id="listMenu-${l.id}" onclick="event.stopPropagation();openRowMenu('listMenu-${l.id}', [${
        !l.completed
          ? "{icon:'check',label:'Completar',fn:()=>completeList(" + l.id +
            ")},"
          : ""
      }{icon:'edit',label:'Editar',fn:()=>openListDialog(${l.id})},{icon:'file-pdf',label:'Exportar PDF',fn:()=>exportListPdf(${l.id})},{sep:true},{icon:'trash',label:'Eliminar',danger:true,fn:()=>delList(${l.id})}])"><i class="fas fa-ellipsis-vertical"></i></button><div class="dropdown-menu"></div></div></td>
  </tr>`,
    );
  }
  selectedListId = null;
}
let selectedListId = null, selectedListStoreId = null;
let _currentProducts = [];
let _currentItems = [];

function hideProductArea() {
  const ps = $("productSearch");
  const pl = $("productList");
  if (ps) ps.style.display = "none";
  if (pl) pl.style.display = "none";
  const se = $("itemsState");
  if (se) se.style.display = "none";
}
window.hideProductArea = hideProductArea;

async function selectList(id) {
  selectedListId = id;
  const lists = cacheGet("lists") || [];
  const list = lists.find((l) => l.id === id);
  selectedListStoreId = list ? list.storeId : null;
  showSkeleton("itemsTable", 5);
  const [items, prods] = await Promise.all([
    api(`/api/lists/${id}/items`),
    selectedListStoreId
      ? api(`/api/products?storeId=${selectedListStoreId}`)
      : Promise.resolve([]),
  ]);
  _currentProducts = prods;
  _currentItems = items;
  const completed = list?.completed ?? false;
  renderItems(items, completed);
  $("itemsTitle").textContent = list
    ? `Items — ${list.name}`
    : `Items (lista #${id})`;
  const stateEl = $("itemsState");
  if (stateEl) {
    stateEl.className = `badge ${completed ? "ok" : "warn"}`;
    stateEl.textContent = completed ? "Consolidada" : "Ajustada";
    stateEl.style.display = "";
  }
  const addBtn = $("itemsQuickAdd");
  if (addBtn) {
    addBtn.style.display = completed ? "none" : "inline-flex";
  }
  const ps = $("productSearch");
  const pl = $("productList");
  if (ps && pl) {
    if (prods.length) {
      ps.style.display = "flex";
      $("productSearchInput").value = "";
      pl.style.display = "block";
      renderProductList();
    } else {
      ps.style.display = "none";
      pl.style.display = "none";
    }
  }
}

function renderProductList() {
  const q = ($("productSearchInput").value || "").toLowerCase().trim();
  const addedIds = new Set((_currentItems || []).map((i) => i.productId));
  const available = _currentProducts.filter((p) => !addedIds.has(p.id));
  const filtered = q
    ? available.filter((p) => p.name.toLowerCase().includes(q))
    : available;
  const pl = $("productList");
  if (!filtered.length) {
    pl.innerHTML =
      `<div class="empty-state" style="padding:16px"><h4>Sin resultados</h4><p>${
        q ? "Ningún producto coincide" : "No hay productos en esta tienda"
      }</p></div>`;
  } else {
    pl.innerHTML = filtered.map((p) => `
      <div class="product-row" onclick="quickAddProduct(${p.id})" title="Agregar a la lista">
        <span class="product-name">${p.name}</span>
        <span class="product-qty-tag">${
      p.currentPrice != null ? `$${p.currentPrice.toFixed(2)}` : ""
    }</span>
        <button class="product-add-btn" onclick="event.stopPropagation();quickAddProduct(${p.id})"><i class="fas fa-plus"></i></button>
      </div>
    `).join("");
  }
  const count = $("productCount");
  if (count) count.textContent = `${filtered.length}/${available.length}`;
}
function renderItems(items, completed) {
  const tb = $("itemsTableBody");
  tb.innerHTML = "";
  if (!items.length) {
    tb.innerHTML = `<tr><td colspan="5">${
      emptyState("inbox", "Lista vacía", "Agrega items a esta lista", "", "")
    }</td></tr>`;
    return;
  }
  const priceCell = completed
    ? (it) => `$${(it.priceAtPurchase ?? 0).toFixed(2)}`
    : (it) =>
      `<input type="number" step="0.01" min="0" class="inline-price" value="${
        (it.priceAtPurchase ?? 0).toFixed(2)
      }" data-item-id="${it.id}" onchange="updateItemPrice(this)">`;
  for (const it of items) {
    tb.insertAdjacentHTML(
      "beforeend",
      `<tr draggable="true" data-item-id="${it.id}" ondragstart="dragStart(event)" ondragover="dragOver(event)" ondrop="dropItem(event)">
    <td><input type="checkbox" ${
        it.checked ? "checked" : ""
      } onchange="toggleItem(${it.id})"></td>
    <td>${it.productName ?? ""}</td>
    <td><div class="qty-stepper"><button class="icon-btn" onclick="updateItemQty(${it.id},-1)">−</button><span class="qty-display" onclick="openQtyDialog(${it.id}, ${it.quantity})">${it.quantity}</span><button class="icon-btn" onclick="updateItemQty(${it.id},1)">+</button></div></td>
    <td>${priceCell(it)}</td>
    <td><button class="icon-btn" onclick="delItem(${it.id})"><i class="fas fa-times"></i></button></td>
  </tr>`,
    );
  }
}
window.selectList = selectList;
function openListDialog(id) {
  const stores = cacheGet("stores") || [];
  const lists = cacheGet("lists") || [];
  const list = id ? lists.find((l) => l.id === id) : null;
  const today = new Date().toISOString().slice(0, 10);
  const monthVal = list ? list.month + "-01" : today;
  openDialog(`
    <div class="dialog-header"><h3>${
    id ? "Editar Lista" : "Nueva Lista"
  }</h3><button class="icon-btn" onclick="closeDialog()"><i class="fas fa-times"></i></button></div>
    <div class="field"><label>Tienda</label><select id="dlgListStore">${
    stores.map((s) =>
      `<option value="${s.id}" ${
        list?.storeId === s.id ? "selected" : ""
      }>${s.name}</option>`
    ).join("")
  }</select></div>
    <div class="field"><label>Nombre</label><input id="dlgListName" placeholder="Ej: Compras abril" value="${
    list ? list.name : ""
  }" autocomplete="off"></div>
    <div class="field"><label>Fecha</label><input id="dlgListDate" type="date" value="${
    list ? monthVal : today
  }"></div>
    <div class="dialog-footer"><button class="btn secondary" onclick="closeDialog()">Cancelar</button><button class="btn" onclick="saveList(${
    id || ""
  })"><i class="fas fa-check"></i> ${id ? "Actualizar" : "Crear"}</button></div>
  `);
  $("dlgListName").focus();
}
window.openListDialog = openListDialog;
async function saveList(id) {
  const name = $("dlgListName").value.trim();
  if (!name) return toast("Nombre requerido", "warn");
  const date = $("dlgListDate").value;
  const month = date
    ? date.slice(0, 7)
    : `${new Date().getFullYear()}-${
      String(new Date().getMonth() + 1).padStart(2, "0")
    }`;
  const body = {
    id: id || null,
    storeId: Number($("dlgListStore").value),
    storeName: "",
    name,
    month,
    completed: false,
    itemCount: 0,
    estimatedTotal: 0,
  };
  if (id) {
    await api(`/api/lists/${id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    toast("Lista actualizada");
    closeDialog();
    loadLists();
  } else {
    const created = await api("/api/lists", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    toast("Lista creada");
    closeDialog();
    selectedListId = created.id;
    loadLists();
    const storeId = Number($("dlgListStore").value);
    showQuickAddDialog(storeId, created.id);
  }
}
window.saveList = saveList;
async function completeList(id) {
  await api(`/api/lists/${id}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ completed: true }),
  });
  toast("Lista completada");
  loadLists();
}
async function delList(id) {
  await api(`/api/lists/${id}`, { method: "DELETE" });
  toast("Lista eliminada");
  loadLists();
}
window.delList = delList;
async function exportOpen(url) {
  await api(url);
  toast("Archivo generado");
}
function exportListPdf(id) {
  exportOpen(`/api/export-open/pdf/list/${id}`);
}
window.exportListPdf = exportListPdf;

async function showQuickAddDialog(storeId, listId) {
  const store = (cacheGet("stores") || []).find((s) => s.id === storeId);
  const storeName = store ? store.name : "";
  const [recurrentProds, aiRecs] = await Promise.all([
    api(`/api/products?storeId=${storeId}&recurrent=true`),
    api("/api/ai/recommend"),
  ]);
  const aiFiltered = aiRecs.filter(
    (r) => !r.storeName || r.storeName === storeName,
  );
  openDialog(`
    <div class="dialog-header">
      <h3>Agregar productos a la lista</h3>
      <button class="icon-btn" onclick="closeDialog()"><i class="fas fa-times"></i></button>
    </div>
    <div class="dialog-body" style="max-height:60vh;overflow-y:auto">
      <h4 style="margin:0 0 8px">Productos Recurrentes</h4>
      <hr style="border:none;border-top:1px solid hsl(var(--border));margin:0 0 8px">
      ${
    recurrentProds.length
      ? recurrentProds.map((p) =>
        `<div class="quick-add-row" data-pid="${p.id}" onclick="quickAddFromDialog(${p.id}, ${listId})">
            <span>${p.name}</span>
            <span style="color:hsl(var(--muted-foreground));font-size:12px">${
              p.currentPrice != null ? `$${p.currentPrice.toFixed(2)}` : ""
            }</span>
            <button class="icon-btn" onclick="event.stopPropagation();quickAddFromDialog(${p.id}, ${listId})"><i class="fas fa-plus"></i></button>
          </div>`
      ).join("")
      : '<p class="muted" style="font-size:13px">No hay productos recurrentes en esta tienda</p>'
  }
      <h4 style="margin:16px 0 8px">Productos Recomendados por IA</h4>
      <hr style="border:none;border-top:1px solid hsl(var(--border));margin:0 0 8px">
      ${
    aiFiltered.length
      ? aiFiltered.map((r) =>
        `<div class="quick-add-row" data-pname="${r.productName.replace(/"/g, "&quot;")}" onclick="quickAddRecFromDialog('${r.productName.replace(/'/g, "\\'")}', ${listId})">
            <span>${r.productName}</span>
            <span style="color:hsl(var(--muted-foreground));font-size:12px">${r.reason}</span>
            <button class="icon-btn" onclick="event.stopPropagation();quickAddRecFromDialog('${r.productName.replace(/'/g, "\\'")}', ${listId})"><i class="fas fa-plus"></i></button>
          </div>`
      ).join("")
      : '<p class="muted" style="font-size:13px">No hay recomendaciones disponibles</p>'
  }
    </div>
    <div class="dialog-footer">
      <button class="btn" onclick="closeDialog()">Cerrar</button>
    </div>
  `);
}
window.showQuickAddDialog = showQuickAddDialog;

async function quickAddFromDialog(productId, listId) {
  const id = listId || selectedListId;
  if (!id) return toast("Selecciona una lista primero", "warn");
  const products = await cachedFetch("/api/products", "products");
  const product = products.find((p) => p.id === productId);
  await api(`/api/lists/${id}/items`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ productId, quantity: 1 }),
  });
  toast(`"${product?.name ?? ""}" agregado`);
  const row = document.querySelector(`.quick-add-row[data-pid="${productId}"]`);
  if (row) row.remove();
  selectList(id);
}
window.quickAddFromDialog = quickAddFromDialog;

async function quickAddRecFromDialog(productName, listId) {
  const id = listId || selectedListId;
  if (!id) return toast("Selecciona una lista primero", "warn");
  const products = await cachedFetch("/api/products", "products");
  const prod = products.find((p) => p.name === productName);
  if (!prod) return toast(`Producto "${productName}" no encontrado`, "err");
  await api(`/api/lists/${id}/items`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ productId: prod.id, quantity: 1 }),
  });
  toast(`${productName} agregado`);
  const row = document.querySelector(`.quick-add-row[data-pname="${productName.replace(/"/g, "&quot;")}"]`);
  if (row) row.remove();
  selectList(id);
}
window.quickAddRecFromDialog = quickAddRecFromDialog;

async function quickAddProduct(productId) {
  if (!selectedListId) return;
  const product = _currentProducts.find((p) => p.id === productId);
  const quantity = 1;
  const res = await api(`/api/lists/${selectedListId}/items`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ productId, quantity }),
  });
  pushUndo({
    type: "addItem",
    itemId: res?.id,
    listId: selectedListId,
    productId,
    quantity,
  });
  toast(`"${product?.name ?? ""}" agregado`);
  selectList(selectedListId);
}
window.quickAddProduct = quickAddProduct;

async function addItem() {
  return toast("Usa la lista de productos de abajo para agregar", "warn");
}
window.addItem = addItem;
async function toggleItem(id) {
  await api(`/api/items/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ toggleChecked: true }),
  });
  selectList(selectedListId);
}
async function updateItemQty(id, delta) {
  const items = await api(`/api/lists/${selectedListId}/items`);
  const item = items.find((i) => i.id === id);
  if (!item) return;
  const qty = Math.max(1, (item.quantity || 1) + delta);
  await api(`/api/items/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ quantity: qty, unit: item.unit || "" }),
  });
  selectList(selectedListId);
}
function openQtyDialog(itemId, currentQty) {
  openDialog(`
    <div class="dialog-header"><h3>Cantidad</h3><button class="icon-btn" onclick="closeDialog()"><i class="fas fa-times"></i></button></div>
    <div class="field"><label>Número de piezas</label><input id="dlgQty" type="number" min="1" value="${currentQty}" autofocus></div>
    <div class="dialog-footer"><button class="btn secondary" onclick="closeDialog()">Cancelar</button><button class="btn" onclick="saveQty(${itemId})"><i class="fas fa-check"></i> Aceptar</button></div>
  `);
  $("dlgQty").focus();
}
async function saveQty(itemId) {
  const qty = Math.max(1, parseInt($("dlgQty").value, 10) || 1);
  const items = await api(`/api/lists/${selectedListId}/items`);
  const item = items.find((i) => i.id === itemId);
  if (!item) return;
  await api(`/api/items/${itemId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ quantity: qty, unit: item.unit || "" }),
  });
  closeDialog();
  selectList(selectedListId);
}
window.openQtyDialog = openQtyDialog;
window.saveQty = saveQty;
window.updateItemQty = updateItemQty;
let dragItemId = null;
function dragStart(e) {
  dragItemId = e.target.closest("tr")?.dataset?.itemId;
  e.dataTransfer.effectAllowed = "move";
}
function dragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
}
function dropItem(e) {
  e.preventDefault();
  const fromId = dragItemId;
  const toRow = e.target.closest("tr");
  if (!toRow || !fromId) return;
  const toId = toRow.dataset?.itemId;
  if (fromId === toId) return;
  const tb = $("itemsTableBody");
  const rows = [...tb.querySelectorAll("tr[data-item-id]")];
  const fromIdx = rows.findIndex((r) => r.dataset.itemId === fromId);
  const toIdx = rows.findIndex((r) => r.dataset.itemId === toId);
  if (fromIdx < 0 || toIdx < 0) return;
  const fromRow = rows[fromIdx];
  if (fromIdx < toIdx) toRow.after(fromRow);
  else toRow.before(fromRow);
}
window.dropItem = dropItem;
window.toggleItem = toggleItem;
async function updateItemPrice(el) {
  const id = Number(el.dataset.itemId);
  const price = Number(el.value);
  console.log(`[updateItemPrice] id=${id} price=${price} raw="${el.value}"`);
  if (isNaN(price) || price < 0) {
    console.warn("[updateItemPrice] invalid price");
    return;
  }
  try {
    const res = await fetch(`/api/items/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ priceAtPurchase: price }),
    });
    const json = await res.json();
    console.log(`[updateItemPrice] response status=${res.status}`, json);
    if (!res.ok) {
      toast("Error al guardar precio: " + (json.error || res.status), "err");
      return;
    }
    el.dataset.saved = "1";
    toast("Precio guardado");
  } catch (e) {
    console.error("[updateItemPrice] fetch error:", e);
    toast("Error de red al guardar precio", "err");
  }
}
window.updateItemPrice = updateItemPrice;
async function delItem(id) {
  const items = await api(`/api/lists/${selectedListId}/items`);
  const item = items.find((i) => i.id === id);
  if (item) {
    pushUndo({
      type: "delItem",
      itemId: id,
      listId: selectedListId,
      productId: item.productId,
      quantity: item.quantity,
      productName: item.productName,
    });
  }
  await api(`/api/items/${id}`, { method: "DELETE" });
  toast("Item eliminado");
  selectList(selectedListId);
}
window.delItem = delItem;

// ===== Master =====
let masterData = [];
async function loadMaster() {
  showSkeleton("masterTable", 4);
  const masters = await api("/api/master-lists");
  masterData = masters;
  const tb = $("masterTableBody");
  tb.innerHTML = "";
  if (!masters.length) {
    tb.innerHTML = `<tr><td colspan="4">${
      emptyState(
        "clipboard-list",
        "Sin listas maestras",
        "Las listas maestras se generan automáticamente",
        "",
        "",
      )
    }</td></tr>`;
  }
  for (const m of masters) {
    const parts = m.month.split(" ");
    const month = encodeURIComponent(parts[0]);
    const year = parts[1] ?? "";
    tb.insertAdjacentHTML(
      "beforeend",
      `<tr><td>${m.month}</td><td>${m.storeNames}</td><td>$${
        m.total?.toFixed(2) ?? "0.00"
      }</td>
      <td><div class="dropdown"><button class="icon-btn" id="masterMenu-${month}-${year}" onclick="event.stopPropagation();openRowMenu('masterMenu-${month}-${year}', [{icon:'eye',label:'Ver Detalle',fn:()=>showMasterDetail('${month}','${year}')},{icon:'file-pdf',label:'Exportar PDF',fn:()=>exportMasterDetailPdf('${month}','${year}')},{sep:true},{icon:'trash',label:'Eliminar',danger:true,fn:()=>delMaster('${month}','${year}')}])"><i class="fas fa-ellipsis-vertical"></i></button><div class="dropdown-menu"></div></div></td></tr>`,
    );
  }
}
async function showMasterDetail(month, year) {
  const detail = await api(`/api/master-lists/${month}/${year}`);
  if (!detail || !detail.stores) return toast("Error al cargar detalle", "err");
  let html = `<div class="dialog-header"><h3>${
    detail.month || month + " " + year
  }</h3><button class="icon-btn" onclick="closeDialog()"><i class="fas fa-times"></i></button></div>`;
  let grandTotal = 0;
  for (const store of detail.stores) {
    const color = store.storeColor || avatarColor(store.storeName);
    html +=
      `<div style="margin-bottom:16px;padding:12px;border:1px solid hsl(var(--border));border-radius:var(--radius);border-left:4px solid ${color}">
      <h4 style="margin:0 0 8px">${store.storeName}${
        store.listName ? " — " + store.listName : ""
      } <span class="badge">${store.items?.length || 0} items</span></h4>
      <table style="width:100%;font-size:13px"><thead><tr><th>Producto</th><th>Cant</th><th>Unidad</th><th>Precio</th><th>Total</th></tr></thead><tbody>`;
    let storeTotal = 0;
    for (const item of (store.items || [])) {
      const total = (item.price || 0) * (item.quantity || 0);
      storeTotal += total;
      html += `<tr><td>${item.productName}</td><td>${item.quantity}</td><td>${
        item.unit || ""
      }</td><td>$${(item.price || 0).toFixed(2)}</td><td>$${
        total.toFixed(2)
      }</td></tr>`;
    }
    grandTotal += storeTotal;
    html +=
      `</tbody></table><div style="text-align:right;font-weight:700;margin-top:8px">Subtotal: $${
        storeTotal.toFixed(2)
      }</div></div>`;
  }
  html +=
    `<div class="dialog-footer" style="display:flex;gap:8px;justify-content:space-between"><div style="display:flex;gap:8px"><button class="btn" onclick="exportOpen('/api/export-open/pdf/master/${month}/${year}')"><i class="fas fa-file-pdf"></i> PDF</button><button class="btn secondary" onclick="exportOpen('/api/export-open/xlsx/master/${month}/${year}')"><i class="fas fa-file-excel"></i> Excel</button></div><button class="btn secondary" onclick="closeDialog()">Cerrar</button></div>`;
  openDialog(html);
}
window.showMasterDetail = showMasterDetail;
async function delMaster(month, year) {
  if (!confirm("¿Eliminar lista maestra?")) return;
  await api(`/api/master-lists/${month}/${year}`, { method: "DELETE" });
  toast("Lista maestra eliminada");
  loadMaster();
}
window.delMaster = delMaster;
function exportMasterPdf() {
  exportOpen("/api/export-open/pdf/master/all");
}
function exportMasterXlsx() {
  exportOpen("/api/export-open/xlsx/master/all");
}
function exportMasterDetailPdf(month, year) {
  exportOpen(`/api/export-open/pdf/master/${month}/${year}`);
}
window.exportMasterPdf = exportMasterPdf;
window.exportMasterXlsx = exportMasterXlsx;
window.exportMasterDetailPdf = exportMasterDetailPdf;

// ===== Budget =====
let budgetViewMode = "monthly";
async function loadBudgets() {
  showSkeleton("budgetTable", 6);
  const yearSel = $("budgetYear");
  if (!yearSel.children.length) {
    const y = new Date().getFullYear();
    yearSel.innerHTML = Array.from({ length: 5 }, (_, i) => y - i).map((yr) =>
      `<option value="${yr}" ${yr === y ? "selected" : ""}>${yr}</option>`
    ).join("");
  }
  const year = Number(yearSel.value) || new Date().getFullYear();
  const budgets = await api("/api/budgets/" + year);
  window._budgetData = { year, budgets };
  const tb = $("budgetTableBody");
  tb.innerHTML = "";
  if (budgetViewMode === "yearly") {
    const allBudgets = budgets;
    let totalEst = 0, totalActual = 0;
    for (const b of allBudgets) {
      totalEst += b.estimatedBudget || 0;
      totalActual += b.actualSpent || 0;
    }
    tb.insertAdjacentHTML(
      "beforeend",
      `<tr style="font-weight:700"><td>TOTAL ${year}</td><td>$${
        totalEst.toFixed(2)
      }</td><td>$${totalActual.toFixed(2)}</td><td><span class="badge ${
        totalActual > totalEst ? "err" : "ok"
      }">${totalActual > totalEst ? "+" : ""}$${
        (totalEst - totalActual).toFixed(2)
      }</span></td><td><div class="progress-bar"><div class="fill ${
        totalActual > totalEst ? "over" : "under"
      }" style="width:${
        totalEst > 0 ? Math.min(100, totalActual / totalEst * 100) : 0
      }%"></div></div></td><td><button class="btn secondary" onclick="showBudgetChart(${year})"><i class="fas fa-chart-line"></i></button></td></tr>`,
    );
  } else {
    for (const b of budgets) {
      const pct = b.estimatedBudget > 0
        ? Math.min(100, (b.actualSpent / b.estimatedBudget) * 100)
        : 0;
      const over = b.actualSpent > b.estimatedBudget;
      const diff = b.difference || 0;
      tb.insertAdjacentHTML(
        "beforeend",
        `<tr>
        <td>${b.period}</td><td>$${
          (b.estimatedBudget || 0).toFixed(2)
        }</td><td>$${(b.actualSpent || 0).toFixed(2)}</td>
        <td><span class="badge ${diff < 0 ? "err" : "ok"}">${
          diff > 0 ? "+" : ""
        }$${(diff || 0).toFixed(2)}</span></td>
        <td><div class="progress-bar"><div class="fill ${
          over ? "over" : "under"
        }" style="width:${pct}%"></div></div></td>
        <td><button class="btn secondary" onclick="openReconcileModal(${b.year},${b.month})" title="Editar"><i class="fas fa-edit"></i></button> <button class="btn secondary" onclick="consolidarBudget(${b.year},${b.month})" title="Consolidar"><i class="fas fa-check-double"></i></button></td>
      </tr>`,
      );
    }
  }
}
function toggleBudgetView() {
  budgetViewMode = budgetViewMode === "monthly" ? "yearly" : "monthly";
  $("budgetViewBtn").innerHTML = budgetViewMode === "yearly"
    ? '<i class="fas fa-calendar-alt"></i> Mensual'
    : '<i class="fas fa-chart-bar"></i> Anual';
  loadBudgets();
}
window.toggleBudgetView = toggleBudgetView;
function showBudgetChart(year) {
  const cached = window._budgetData;
  const promise = cached && cached.year === year
    ? Promise.resolve(cached.budgets)
    : api(`/api/budgets/${year}`);
  promise.then((budgets) => {
    const labels = budgets.map((b) => b.period);
    const est = budgets.map((b) => b.estimatedBudget || 0);
    const actual = budgets.map((b) => b.actualSpent || 0);
    const diff = budgets.map((b) =>
      (b.estimatedBudget || 0) - (b.actualSpent || 0)
    );
    const ctx = document.createElement("canvas");
    ctx.width = 600;
    ctx.height = 300;
    openDialog(
      `<div class="dialog-header"><h3>Presupuesto ${year}</h3><button class="icon-btn" onclick="closeDialog()"><i class="fas fa-times"></i></button></div><div style="max-height:400px"><canvas id="budgetChartCanvas"></canvas></div><div class="dialog-footer"><button class="btn secondary" onclick="closeDialog()">Cerrar</button></div>`,
    );
    setTimeout(() => {
      const c = $("budgetChartCanvas");
      if (!c) return;
      c.width = 560;
      c.height = 280;
      new Chart(c, {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: "Estimado",
              data: est,
              backgroundColor: "hsl(262 83% 58%)",
            },
            {
              label: "Real",
              data: actual,
              backgroundColor: "hsl(142 71% 45%)",
            },
            {
              label: "Diferencia",
              data: diff,
              backgroundColor: "hsl(38 92% 50%)",
            },
          ],
        },
        options: {
          responsive: true,
          plugins: { legend: { labels: { color: "#e5e7eb" } } },
          scales: {
            x: { ticks: { color: "#9ca3af" }, grid: { color: "#27272a" } },
            y: { ticks: { color: "#9ca3af" }, grid: { color: "#27272a" } },
          },
        },
      });
    }, 50);
  });
}
window.showBudgetChart = showBudgetChart;
function openReconcileModal(year, month) {
  const cached = window._budgetData;
  const budgets = cached && cached.year === year ? cached.budgets : [];
  const b = budgets.find((b) => b.year === year && b.month === month);
  const est = b ? (b.estimatedBudget || 0).toFixed(2) : "0.00";
  openDialog(`
    <div class="dialog-header"><h3>Reconciliar Presupuesto</h3><button class="icon-btn" onclick="closeDialog()"><i class="fas fa-times"></i></button></div>
    <p class="muted" style="margin:0 0 16px">Mes ${month}/${year}</p>
    <div class="field"><label>Gasto real</label><input id="reconcileInput" type="number" min="0" step="0.01" placeholder="0.00" value="${est}" autocomplete="off"></div>
    <div class="dialog-footer"><button class="btn secondary" onclick="closeDialog()">Cancelar</button><button class="btn" onclick="doReconcile(${year},${month})"><i class="fas fa-check"></i> Guardar</button></div>
  `);
  setTimeout(() => $("reconcileInput").focus(), 50);
}
window.openReconcileModal = openReconcileModal;
async function doReconcile(year, month) {
  const actual = Number($("reconcileInput").value);
  if (isNaN(actual)) return toast("Valor inválido", "warn");
  await api("/api/budgets/reconcile", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      period: "",
      year,
      month,
      estimatedBudget: 0,
      actualSpent: actual,
      difference: 0,
    }),
  });
  closeDialog();
  toast("Presupuesto reconciliado");
  loadBudgets();
}
window.doReconcile = doReconcile;
async function consolidarBudget(year, month) {
  if (
    !confirm(
      `¿Consolidar presupuesto de ${month}/${year}? Se calculará el gasto real de las listas completadas.`,
    )
  ) return;
  await api("/api/budgets/consolidate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ year, month }),
  });
  toast("Presupuesto consolidado — productos agregados a despensa");
  loadBudgets();
  loadDashboard();
}
window.consolidarBudget = consolidarBudget;

// ===== Config =====
async function loadConfig() {
  for (
    const [k, id, dl] of [["units", "unitsList", "config-units"], [
      "product-types",
      "typesList",
      "config-types",
    ], ["categories", "catsList", "config-categories"]]
  ) {
    const items = await api(`/api/${k}`);
    $(id).innerHTML = items.map((n) =>
      `<li style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border:1px solid hsl(var(--border));border-radius:calc(var(--radius) - 2px);margin-bottom:6px;background:hsl(var(--background))"><span>${n}</span><button class="icon-btn" onclick="delConfig('${k}','${
        encodeURIComponent(n)
      }')"><i class="fas fa-times"></i></button></li>`
    ).join("");
    const dlEl = $(dl);
    if (dlEl) {
      dlEl.innerHTML = items.map((n) => `<option value="${n}">`).join("");
    }
  }
}
async function addConfig(kind, inputId) {
  const name = $(inputId).value.trim();
  if (!name) return toast("Nombre requerido", "warn");
  await api(`/api/${kind}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });
  toast("Agregado");
  loadConfig();
}
window.addConfig = addConfig;
async function delConfig(kind, name) {
  await api(`/api/${kind}/${name}`, { method: "DELETE" });
  toast("Eliminado");
  loadConfig();
}
window.delConfig = delConfig;

// ===== Backup / Restore =====
async function createBackup() {
  try {
    const r = await api("/api/backup?_=" + Date.now());
    toast(r.message || "Backup creado");
  } catch (e) {
    toast("Error al crear backup: " + e.message, "err");
  }
}
window.createBackup = createBackup;
async function restoreBackup() {
  const byDay = await api("/api/backup/list");
  const days = Object.keys(byDay);
  if (!days.length) return toast("No hay backups disponibles", "warn");
  const today = new Date().toISOString().slice(0, 10);
  openDialog(`
    <div class="dialog-header"><h3>Restaurar Backup</h3><button class="icon-btn" onclick="closeDialog()"><i class="fas fa-times"></i></button></div>
    <div class="field"><label>Filtrar por fecha</label><input id="backupFilter" type="date" value="${today}" onchange="renderBackups()"></div>
    <div class="dialog-body" id="backupList" style="max-height:45vh;overflow-y:auto"></div>
    <div class="dialog-footer"><button class="btn secondary" onclick="closeDialog()">Cancelar</button></div>
  `);
  window._backupData = byDay;
  renderBackups();
}
window.restoreBackup = restoreBackup;
function renderBackups() {
  const byDay = window._backupData || {};
  const filter = $("backupFilter")?.value || "";
  const days = Object.keys(byDay).filter((d) => !filter || d === filter);
  const el = $("backupList");
  if (!el) return;
  el.innerHTML = days.length
    ? days.map((day) =>
      `<h4 style="margin:12px 0 4px;font-size:13px">${day}</h4>
      ${byDay[day].map((f) =>
        `<div class="quick-add-row" onclick="doRestore('${f}')" style="cursor:pointer">
          <span>${f}</span>
          <button class="icon-btn" onclick="event.stopPropagation();doRestore('${f}')"><i class="fas fa-undo"></i></button>
        </div>`
      ).join("")}`
    ).join("")
    : '<p class="muted" style="font-size:13px;text-align:center;padding:16px">Sin backups en esta fecha</p>';
}
window.renderBackups = renderBackups;
async function doRestore(filename) {
  closeDialog();
  try {
    const r = await api("/api/backup/restore", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ filename }),
    });
    toast(r.message || "Backup restaurado");
    setTimeout(() => location.reload(), 1500);
  } catch (e) {
    toast("Error: " + e.message, "err");
  }
}
window.doRestore = doRestore;
window.restoreBackup = restoreBackup;

// ===== Pantry =====
const MERMA_REASONS = [
  "Caducidad",
  "Daño físico",
  "Empaque dañado",
  "Rotación PEPS no respetada",
  "Almacenamiento incorrecto",
  "Error de inventario",
  "Robo / pérdida",
  "Obsolescencia",
  "Contaminación",
  "Devolución no recuperable",
  "Daño en transporte",
  "Plagas",
  "Falla de refrigeración",
  "Derrame o fuga",
  "Rechazo de calidad",
  "Sobreinventario",
  "Error de surtido",
  "Consumo interno",
  "Muestra comercial",
  "Otro (especificar)",
];

async function loadPantry() {
  showSkeleton("pantryTable", 6);
  const items = await api("/api/pantry");
  const active = items.filter((p) =>
    p.status !== "Terminado" && p.status !== "Merma" && p.status !== "Eliminado"
  );
  const el = $("badge-pantry");
  if (el) el.textContent = active.length;
  const tb = $("pantryTableBody");
  if (!tb) return;
  tb.innerHTML = "";
  if (!active.length) {
    tb.innerHTML = `<tr><td colspan="6">${
      emptyState(
        "warehouse",
        "Despensa vacía",
        "Consolida listas de compras para llenar la despensa automáticamente",
        "",
        "",
      )
    }</td></tr>`;
    return;
  }
  for (const p of active) {
    const normalPills = [
      "Nuevo",
      "Comezado",
      "Media vida",
      "Por terminar",
      "Terminado",
    ].map((s) => {
      const cur = s === p.status;
      const disabled = cur || !p.nextStates.includes(s);
      return `<span class="status-pill ${
        cur ? "current" : disabled ? "past" : "future"
      }" onclick="${
        disabled ? "" : `advanceStatus(${p.id},'${s}')`
      }">${s}</span>`;
    }).join(" ");
    const mermaPill =
      `<span class="status-pill future-merma" onclick="showMermaDialog(${p.id})">Merma</span>`;
    const statusPills = normalPills + '<span class="status-sep">|</span>' +
      mermaPill;
    tb.insertAdjacentHTML(
      "beforeend",
      `<tr>
      <td>${p.productName}</td>
      <td><span class="badge">${p.quantity}</span></td>
      <td>${p.unit || "-"}</td>
      <td>${p.storeName || "-"}</td>
      <td>$${(p.estimatedValue || 0).toFixed(2)}</td>
      <td class="status-row">${statusPills}</td>
      <td><div class="dropdown"><button class="icon-btn" id="pantryMenu-${p.id}" onclick="openRowMenu('pantryMenu-${p.id}', [{icon:'trash',label:'Eliminar',danger:true,fn:()=>showDeleteDialog(${p.id})}])"><i class="fas fa-ellipsis-vertical"></i></button><div class="dropdown-menu"></div></div></td>
    </tr>`,
    );
  }
}
window.loadPantry = loadPantry;

function showReasonDialog(id, action) {
  const titles = { merma: "Registrar Merma", eliminar: "Eliminar producto" };
  const hints = {
    merma:
      "Selecciona el motivo por el cual este producto se registra como merma.",
    eliminar: "Selecciona el motivo por el cual eliminas este producto.",
  };
  const reasons = MERMA_REASONS.map((r) => `<option value="${r}">${r}</option>`)
    .join("");
  const confirmBtn = action === "merma"
    ? `<button class="btn" style="background:#dc2626;color:#fff" onclick="confirmReason(${id},'merma')">Confirmar Merma</button>`
    : `<button class="btn" style="background:#374151;color:#fff" onclick="confirmReason(${id},'eliminar')">Eliminar</button>`;
  const body = `<div class="dialog-header"><h3>${
    titles[action]
  }</h3><button class="icon-btn" onclick="closeDialog()"><i class="fas fa-times"></i></button></div>
  <div class="dialog-body">
    <label for="reasonSelect">Motivo:</label>
    <select id="reasonSelect" style="width:100%;margin-top:4px">${reasons}</select>
    <p class="muted" style="font-size:12px;margin-top:8px">${hints[action]}</p>
  </div>
  <div class="dialog-footer">
    <button class="btn secondary" onclick="closeDialog()">Cancelar</button>${confirmBtn}
  </div>`;
  openDialog(body);
  window._reasonActionId = id;
  window._reasonAction = action;
}
window.showMermaDialog = (id) => showReasonDialog(id, "merma");
window.showDeleteDialog = (id) => showReasonDialog(id, "eliminar");

async function confirmReason(id, action) {
  const sel = document.getElementById("reasonSelect");
  const reason = sel ? sel.value : "";
  closeDialog();
  if (action === "merma") {
    const body = { status: "Merma", mermaReason: reason };
    await api(`/api/pantry/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    toast("Estado cambiado a Merma");
  } else {
    const body = { mermaReason: reason };
    await api(`/api/pantry/${id}`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    toast("Producto eliminado de la despensa");
  }
  loadPantry();
}
window.confirmReason = confirmReason;

async function advanceStatus(id, status, mermaReason) {
  const body = { status };
  if (mermaReason) body.mermaReason = mermaReason;
  await api(`/api/pantry/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  toast(`Estado cambiado a "${status}"`);
  loadPantry();
}
window.advanceStatus = advanceStatus;

async function delPantryItem(id) {
  await api(`/api/pantry/${id}`, { method: "DELETE" });
  toast("Producto eliminado de la despensa");
  loadPantry();
}
window.delPantryItem = delPantryItem;

// ===== Pantry History =====
const STATUS_COLORS = {
  "Nuevo": "#22c55e",
  "Comezado": "#3b82f6",
  "Media vida": "#eab308",
  "Por terminar": "#f97316",
  "Terminado": "#6b7280",
  "Merma": "#dc2626",
  "Eliminado": "#374151",
};
const PANTRY_ALL_STATES = [
  "Nuevo",
  "Comezado",
  "Media vida",
  "Por terminar",
  "Terminado",
  "Merma",
  "Eliminado",
];

let _historyEntries = [];

async function loadPantryHistory() {
  const periods = await api("/api/pantry/history");
  const sel = $("historyMonthSelect");
  if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = `<option value="">Seleccionar mes...</option>`;
  const months = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  for (const p of periods) {
    const opt = document.createElement("option");
    opt.value = p;
    const [y, m] = p.split("-");
    opt.textContent = `${months[parseInt(m) - 1]} ${y}`;
    sel.appendChild(opt);
  }
  if (cur && periods.includes(cur)) sel.value = cur;
  if (!cur && periods.length > 0) sel.value = periods[periods.length - 1];
  if (!sel.value) {
    const head = $("pantryHistoryHead");
    if (head) head.style.display = "";
    const tb = $("pantryHistoryBody");
    if (tb) {
      tb.innerHTML = `<tr><td colspan="6">${
        emptyState(
          "history",
          "Sin historial",
          "Consolida presupuestos mensuales para generar el historial de despensa automáticamente",
          "",
          "",
        )
      }</td></tr>`;
    }
    _historyEntries = [];
    return;
  }
  const [year, monthNum] = sel.value.split("-");
  const entries = await api(
    `/api/pantry/history/${parseInt(year)}/${parseInt(monthNum)}`,
  );
  _historyEntries = entries;
  // Populate store and status filters
  const stores = [...new Set(entries.map((e) => e.storeName).filter(Boolean))]
    .sort();
  const storeSel = $("historyStoreFilter");
  if (storeSel) {
    const curStore = storeSel.value;
    storeSel.innerHTML = `<option value="">Todas las tiendas</option>` +
      stores.map((s) =>
        `<option value="${s}"${s === curStore ? " selected" : ""}>${s}</option>`
      ).join("");
  }
  const statusSel = $("historyStatusFilter");
  if (statusSel) {
    const curStatus = statusSel.value;
    statusSel.innerHTML = `<option value="">Todos los estados</option>` +
      PANTRY_ALL_STATES.map((s) =>
        `<option value="${s}"${
          s === curStatus ? " selected" : ""
        }>${s}</option>`
      ).join("");
  }
  applyHistoryFilters();
}
window.loadPantryHistory = loadPantryHistory;

function applyHistoryFilters() {
  const head = $("pantryHistoryHead");
  const body = $("pantryHistoryBody");
  if (!body) return;
  body.innerHTML = "";
  let filtered = _historyEntries;
  const productFilter = ($("historyProductFilter")?.value || "").toLowerCase()
    .trim();
  if (productFilter) {
    filtered = filtered.filter((e) =>
      e.productName.toLowerCase().includes(productFilter)
    );
  }
  const storeFilter = $("historyStoreFilter")?.value || "";
  if (storeFilter) {
    filtered = filtered.filter((e) => e.storeName === storeFilter);
  }
  const statusFilter = $("historyStatusFilter")?.value || "";
  if (statusFilter) {
    filtered = filtered.filter((e) => e.status === statusFilter);
  }
  if (!filtered.length) {
    if (head) head.style.display = "";
    body.innerHTML = `<tr><td colspan="6">${
      emptyState(
        "filter",
        "Sin resultados",
        "Ningún registro coincide con los filtros seleccionados.",
        "",
        "",
      )
    }</td></tr>`;
    return;
  }
  if (head) head.style.display = "none";
  const groups = new Map();
  for (const e of filtered) {
    const arr = groups.get(e.productId) ?? [];
    arr.push(e);
    groups.set(e.productId, arr);
  }
  for (const [pid, productEntries] of groups) {
    const first = productEntries[0];
    const isTerminal = productEntries.some((e) =>
      e.status === "Merma" || e.status === "Eliminado"
    );
    if (isTerminal) {
      const terminal = productEntries.filter((e) =>
        e.status === "Merma" || e.status === "Eliminado"
      );
      const e = terminal[terminal.length - 1];
      const color = STATUS_COLORS[e.status] || "#6b7280";
      const reasonHtml = e.mermaReason
        ? `<span class="marble-terminal-reason">${e.mermaReason}</span>`
        : `<span class="marble-terminal-reason">-</span>`;
      const storeInfo = first.storeName ? ` · ${first.storeName}` : "";
      body.insertAdjacentHTML(
        "beforeend",
        `<tr class="marble-row"><td colspan="6">
        <div class="marble-track marble-terminal">
          <div class="marble-product-info"><strong>${first.productName}</strong> <span class="badge">${first.quantity} ${
          first.unit || "pz"
        }</span>${storeInfo}</div>
          <div class="marble-terminal-marker"><div class="marble" style="background:${color};box-shadow:0 0 6px ${color}80" title="${e.status}: ${
          e.mermaReason || ""
        }"></div><span class="marble-terminal-status">${e.status}</span>${reasonHtml}</div>
        </div>
      </td></tr>`,
      );
      continue;
    }
    // Deduplicate consecutive statuses
    const deduped = productEntries.filter((e, i, a) =>
      i === 0 || e.status !== a[i - 1].status ||
      e.mermaReason !== a[i - 1].mermaReason
    );
    const marbles = deduped.map((e, i) => {
      const color = STATUS_COLORS[e.status] || "#6b7280";
      const label = e.status;
      const hasReason = (e.status === "Merma" || e.status === "Eliminado") &&
        e.mermaReason;
      const reason = hasReason
        ? `<div class="marble-reason">${e.mermaReason}</div>`
        : "";
      const title = hasReason ? ` title="${e.status}: ${e.mermaReason}"` : "";
      const isLast = i === deduped.length - 1;
      return `<div class="marble-group"><div class="marble" style="background:${color};box-shadow:0 0 6px ${color}80"${title}></div><div class="marble-label">${label}${reason}</div>${
        isLast ? "" : '<div class="marble-line"></div>'
      }</div>`;
    }).join("");
    const storeInfo = first.storeName ? ` · ${first.storeName}` : "";
    body.insertAdjacentHTML(
      "beforeend",
      `<tr class="marble-row"><td colspan="6">
      <div class="marble-track">
        <div class="marble-product-info"><strong>${first.productName}</strong> <span class="badge">${first.quantity} ${
        first.unit || "pz"
      }</span>${storeInfo}</div>
        <div class="marble-sequence">${marbles}</div>
      </div>
    </td></tr>`,
    );
  }
}
window.applyHistoryFilters = applyHistoryFilters;

// ===== Dashboard =====
async function loadDashboard() {
  showSkeleton("dashSummary", 2);
  const stores = await cachedFetch("/api/stores", "stores");
  const products = await cachedFetch("/api/products", "products");
  const lists = await cachedFetch("/api/lists", "lists");
  const pantry = await api("/api/pantry");
  const activePantry = pantry.filter((p) =>
    p.status !== "Terminado" && p.status !== "Merma" && p.status !== "Eliminado"
  );
  updateBadges({
    stores: stores.length,
    products: products.length,
    lists: lists.length,
    pantry: activePantry.length,
  });

  const tb = $("dashSummaryBody");
  tb.innerHTML = "";
  tb.insertAdjacentHTML(
    "beforeend",
    `<tr><td><i class="fas fa-store"></i> Tiendas</td><td><span class="badge ok">${stores.length}</span></td></tr>`,
  );
  tb.insertAdjacentHTML(
    "beforeend",
    `<tr><td><i class="fas fa-shopping-bag"></i> Productos</td><td><span class="badge ok">${products.length}</span></td></tr>`,
  );
  tb.insertAdjacentHTML(
    "beforeend",
    `<tr><td><i class="fas fa-list-check"></i> Listas</td><td><span class="badge ok">${lists.length}</span></td></tr>`,
  );

  const year = new Date().getFullYear();
  const budgets = await api(`/api/budgets/${year}`);
  const labels = budgets.map((b) => b.period);
  const estData = budgets.map((b) => b.estimatedBudget || 0);
  const ctx = $("dashChart").getContext("2d");
  if (window._dashChart) window._dashChart.destroy();
  const css = (v) =>
    getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const primary = css("--primary") ? `hsl(${css("--primary")})` : "#7c3aed";
  const fg = css("--foreground") ? `hsl(${css("--foreground")})` : "#e5e7eb";
  const muted = css("--muted-foreground")
    ? `hsl(${css("--muted-foreground")})`
    : "#9ca3af";
  window._dashChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Estimado", data: estData, backgroundColor: primary },
        {
          label: "Real",
          data: budgets.map((b) => b.actualSpent || 0),
          backgroundColor: "hsl(142 71% 45%)",
        },
      ],
    },
    options: {
      plugins: { legend: { labels: { color: fg } } },
      scales: {
        x: {
          ticks: { color: muted },
          grid: { color: "hsl(240 4% 16% / 0.5)" },
        },
        y: {
          ticks: { color: muted },
          grid: { color: "hsl(240 4% 16% / 0.5)" },
        },
      },
    },
  });

  const dashRecBody = $("dashRecsBody");
  if (dashRecBody) {
    const recs = await api("/api/ai/recommend");
    dashRecBody.innerHTML = "";
    if (!recs.length) {
      dashRecBody.innerHTML = `<tr><td colspan="6">${
        emptyState(
          "brain",
          "Sin recomendaciones",
          "Completa listas de compras para recibir sugerencias de IA",
          "",
          "",
        )
      }</td></tr>`;
    }
    for (const r of recs) {
      dashRecBody.insertAdjacentHTML(
        "beforeend",
        `<tr>
      <td>${r.productName}</td><td>${
          r.storeName || "-"
        }</td><td>${r.category}</td><td><span class="badge ok">${
          (r.confidence * 100).toFixed(0)
        }%</span></td><td>${r.type}</td><td>${r.reason}</td>
      <td><button class="btn secondary" onclick="addRecToList('${r.productName}')"><i class="fas fa-cart-plus"></i></button></td>
    </tr>`,
      );
    }
  }
}
async function loadDashRecs() {
  loadDashboard();
}
window.loadDashRecs = loadDashRecs;
async function addRecToList(productName) {
  const lists = await cachedFetch("/api/lists", "lists");
  const active = lists.filter((l) => !l.completed);
  if (!active.length) {
    return toast("No hay listas activas. Crea una lista primero.", "warn");
  }
  const products = await cachedFetch("/api/products", "products");
  const prod = products.find((p) => p.name === productName);
  if (!prod) return toast(`Producto "${productName}" no encontrado`, "err");
  const listId = active[0].id;
  await api(`/api/lists/${listId}/items`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ productId: prod.id, quantity: 1 }),
  });
  toast(`${productName} agregado a "${active[0].name}"`);
}
window.addRecToList = addRecToList;

function updateBadges({ stores, products, lists, pantry }) {
  if (stores !== undefined) {
    const el = $("badge-stores");
    if (el) el.textContent = stores;
  }
  if (products !== undefined) {
    const el = $("badge-products");
    if (el) el.textContent = products;
  }
  if (lists !== undefined) {
    const el = $("badge-lists");
    if (el) el.textContent = lists;
  }
  if (pantry !== undefined) {
    const el = $("badge-pantry");
    if (el) el.textContent = pantry;
  }
}

// ===== AI =====
async function loadAI(kind) {
  if (kind === "recs") {
    const recs = await api("/api/ai/recommend");
    const body = $("aiRecsBody");
    if (body) {
      body.innerHTML = recs.length
        ? recs.map((r) =>
          `<tr><td>${r.productName}</td><td>${
            r.storeName || "-"
          }</td><td>${r.category}</td><td><span class="badge ok">${
            (r.confidence * 100).toFixed(0)
          }%</span></td><td>${r.type}</td><td>${r.reason}</td><td><button class="btn secondary" onclick="addRecToList('${r.productName}')"><i class="fas fa-cart-plus"></i></button></td></tr>`
        ).join("")
        : `<tr><td colspan="7">${
          emptyState(
            "brain",
            "Sin recomendaciones",
            "Completa listas de compras para activar las sugerencias",
            "",
            "",
          )
        }</td></tr>`;
    }
  } else if (kind === "forecast") {
    const f = await api("/api/ai/forecast");
    const el = $("aiForecast");
    if (!el) return;
    if (
      f.predictedMonthlySpending <= 0 && f.consumptionVelocity.length === 0 &&
      f.mermaRisk.length === 0 && f.reorderRecommendations.length === 0
    ) {
      el.innerHTML =
        `<div class="empty-state"><i class="fas fa-chart-line"></i><h4>Sin datos</h4><p>Completa listas y usa la despensa para generar predicciones</p></div>`;
      return;
    }
    let html = ``;
    if (f.predictedMonthlySpending > 0) {
      const alertClass = f.spendingAlert === "CRITICAL"
        ? "err"
        : f.spendingAlert === "WARNING"
        ? "warn"
        : "ok";
      html +=
        `<div class="panel" style="margin-bottom:16px"><h4>💰 Gasto Mensual Proyectado</h4>
        <div style="font-size:24px;font-weight:700">$${
          f.predictedMonthlySpending.toFixed(2)
        }</div>
        <div class="muted" style="font-size:12px">Rango: $${
          f.spendingLowerBound.toFixed(2)
        } - $${f.spendingUpperBound.toFixed(2)}</div>
        <span class="badge ${alertClass}" style="margin-top:4px">${f.spendingAlert}</span>
      </div>`;
    }
    if (f.consumptionVelocity.length > 0) {
      html +=
        `<div class="panel" style="margin-bottom:16px"><h4>📦 Velocidad de Consumo</h4><table class="table" style="width:100%"><thead><tr><th>Producto</th><th>Uni/mes</th><th>Días rest</th><th>Confianza</th></tr></thead><tbody>`;
      for (const c of f.consumptionVelocity) {
        html +=
          `<tr><td>${c.productName}</td><td>${c.monthlyConsumptionRate}</td><td>${c.estimatedDaysToEmpty}</td><td><span class="badge ${
            c.confidence > 0.5 ? "ok" : "warn"
          }">${(c.confidence * 100).toFixed(0)}%</span></td></tr>`;
      }
      html += `</tbody></table></div>`;
    }
    if (f.mermaRisk.length > 0) {
      html +=
        `<div class="panel" style="margin-bottom:16px"><h4>⚠️ Riesgo de Merma</h4><table class="table" style="width:100%"><thead><tr><th>Producto</th><th>Riesgo</th><th>Causa</th><th>Muestras</th></tr></thead><tbody>`;
      for (const r of f.mermaRisk) {
        const riskBadge = r.mermaRisk > 0.5 ? "err" : "warn";
        html +=
          `<tr><td>${r.productName}</td><td><span class="badge ${riskBadge}">${
            (r.mermaRisk * 100).toFixed(0)
          }%</span></td><td>${
            r.primaryCause || "-"
          }</td><td>${r.sampleSize}</td></tr>`;
      }
      html += `</tbody></table></div>`;
    }
    if (f.reorderRecommendations.length > 0) {
      html +=
        `<div class="panel" style="margin-bottom:16px"><h4>🛒 Recomendaciones de Reorden</h4><table class="table" style="width:100%"><thead><tr><th>Producto</th><th>Stock</th><th>Consumo/mes</th><th>Días rest</th><th>Urgencia</th><th>Sugerido</th></tr></thead><tbody>`;
      for (const r of f.reorderRecommendations) {
        const urgencyBadge = r.reorderUrgency === "HIGH"
          ? "err"
          : r.reorderUrgency === "MEDIUM"
          ? "warn"
          : "ok";
        html +=
          `<tr><td>${r.productName}</td><td>${r.currentStock} ${r.unit}</td><td>${r.monthlyConsumptionRate}</td><td>${r.daysUntilEmpty}</td><td><span class="badge ${urgencyBadge}">${r.reorderUrgency}</span></td><td>${r.suggestedQuantity}</td></tr>`;
      }
      html += `</tbody></table></div>`;
    }
    el.innerHTML = html;
  } else if (kind === "search") {
    const q = $("searchInput").value;
    if (q.length < 2) return;
    const r = await api(`/api/ai/search?q=${encodeURIComponent(q)}`);
    const body = $("aiSearchBody");
    if (body) {
      body.innerHTML = r.length
        ? r.map((s) =>
          `<tr><td>${s.productName}</td><td>${s.category}</td><td><span class="badge">${
            (s.relevanceScore * 100).toFixed(0)
          }%</span></td><td>${s.matchedOn}</td><td>$${s.price}</td></tr>`
        ).join("")
        : `<tr><td colspan="5">${
          emptyState("search", "Sin resultados", "", "", "")
        }</td></tr>`;
    }
  } else if (kind === "anomalies") {
    const a = await api("/api/ai/anomalies");
    const body = $("aiAnomBody");
    if (body) {
      body.innerHTML = a.length
        ? a.map((x) =>
          `<tr><td>${x.title}</td><td><span class="badge ${
            x.severity > 0.7 ? "err" : "warn"
          }">${
            (x.severity * 100).toFixed(0)
          }%</span></td><td>${x.description}</td></tr>`
        ).join("")
        : `<tr><td colspan="3">${
          emptyState(
            "check-circle",
            "Sin anomalías",
            "Completa listas para detectar anomalías en compras",
            "",
            "",
          )
        }</td></tr>`;
    }
  }
}
window.loadAI = loadAI;

// Window exports
Object.assign(window, {
  loadDashRecs,
  loadDashboard,
  loadStores,
  loadProducts,
  loadLists,
  loadMaster,
  loadBudgets,
  loadConfig,
  selectList,
  navTo,
  openStoreDialog,
  openProductDialog,
  openListDialog,
  openReconcileModal,
  showPriceHistory,
  delStore,
  delProduct,
  completeList,
  delList,
  delMaster,
  exportMasterPdf,
  exportMasterXlsx,
  exportListPdf,
  exportMasterDetailPdf,
  addItem,
  toggleItem,
  delItem,
  addConfig,
  delConfig,
  saveStore,
  saveProduct,
  saveList,
  doReconcile,
  openRowMenu,
  closeDialog,
  openCmdK,
  closeCmdK,
  globalSearch,
  emptyState,
  getInitials,
  avatarColor,
  sortBy,
  renderPagination,
  toast,
  cacheGet,
  cacheSet,
  cachedFetch,
  loadAI,
  addRecToList,
  performUndo,
  performRedo,
  createBackup,
  restoreBackup,
  toggleBudgetView,
  showBudgetChart,
  loadPantry,
  usePantryItem,
  delPantryItem,
});
