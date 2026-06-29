import initSqlJs, { type Database as SqlJsDatabase } from "npm:sql.js@1.14.1";
import { wasmBase64 } from "../../vendor/sql-wasm.wasm.ts";

const wasmBinary = Uint8Array.from(atob(wasmBase64), (c) => c.charCodeAt(0));
const SQL = await initSqlJs({ wasmBinary });

const SCHEMA: string[] = [
  `CREATE TABLE IF NOT EXISTS stores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    unit TEXT NOT NULL,
    product_type TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS product_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    price REAL NOT NULL,
    effective_date TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS grocery_lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    month TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS grocery_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    grocery_list_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    product_name TEXT NOT NULL DEFAULT '',
    unit TEXT NOT NULL DEFAULT '',
    quantity INTEGER DEFAULT 1,
    price_at_purchase REAL NOT NULL DEFAULT 0,
    checked INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (grocery_list_id) REFERENCES grocery_lists(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS product_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    period TEXT NOT NULL UNIQUE,
    estimated_budget TEXT DEFAULT '0',
    actual_spent TEXT DEFAULT '0',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS pantry_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    quantity REAL NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'Nuevo',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS pantry_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    period TEXT NOT NULL,
    product_id INTEGER NOT NULL,
    product_name TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'Nuevo',
    unit TEXT DEFAULT '',
    store_name TEXT DEFAULT '',
    estimated_value REAL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
];

const SEED_UNITS = [
  "Pieza",
  "Par",
  "Docena",
  "Paquete",
  "Caja",
  "Blister",
  "Bolsa",
  "Costal",
  "Saco",
  "Bulto",
  "Tarima",
  "Botella",
  "Lata",
  "Frasco",
  "Tubo",
  "Sobre",
  "Carton",
  "Kilogramo",
  "Gramo",
  "Libra",
  "Litro",
  "Galon",
  "Metro",
  "Centimetro",
  "Rollo",
];
const SEED_PRODUCT_TYPES = [
  "Recurrente",
  "Eventual",
  "Estacional",
  "Imprevisto",
  "Inusual",
];
const SEED_CATEGORIES = [
  "Abarrotes",
  "Lacteos",
  "Panaderia",
  "Carnes",
  "Pescados y Mariscos",
  "Frutas",
  "Verduras",
  "Congelados",
  "Refrigerados",
  "Botanas",
  "Dulces",
  "Cereales",
  "Pastas y Arroces",
  "Enlatados",
  "Condimentos y Salsas",
  "Aceites y Grasas",
  "Bebidas",
  "Cafe y Te",
  "Alcohol",
  "Limpieza",
  "Cuidado Personal",
  "Higiene",
  "Bebe",
  "Mascotas",
  "Farmacia",
  "Hogar",
  "Desechables",
  "Papeleria",
  "Ropa",
  "Electronica",
  "Temporada",
  "Organic os",
  "Importados",
  "Mascotas",
];

export class Database {
  private db: SqlJsDatabase;
  private filePath: string | null;

  constructor(path: string) {
    this.filePath = path === ":memory:" ? null : path;
    if (path === ":memory:") {
      this.db = new SQL.Database();
    } else {
      let data: Uint8Array | null = null;
      try {
        data = Deno.readFileSync(path);
      } catch { /* new file */ }
      this.db = data ? new SQL.Database(data) : new SQL.Database();
      this.persist();
    }
  }

  initializeSchema(): void {
    for (const sql of SCHEMA) this.db.run(sql);
    // Migration: drop old pantry_items schema (had product_name column)
    try {
      this.db.run("ALTER TABLE pantry_items DROP COLUMN product_name");
    } catch { /* already migrated or never existed */ }
    try {
      this.db.run("ALTER TABLE pantry_items DROP COLUMN notes");
    } catch {}
    try {
      this.db.run("ALTER TABLE pantry_items DROP COLUMN added_date");
    } catch {}
    try {
      this.db.run("ALTER TABLE pantry_items DROP COLUMN unit");
    } catch {}
    try {
      this.db.run(
        "ALTER TABLE pantry_items ADD COLUMN status TEXT NOT NULL DEFAULT 'Nuevo'",
      );
    } catch {}
    try {
      this.db.run(
        "ALTER TABLE pantry_items ADD COLUMN merma_reason TEXT NOT NULL DEFAULT ''",
      );
    } catch {}
    try {
      this.db.run(
        "ALTER TABLE pantry_history ADD COLUMN merma_reason TEXT NOT NULL DEFAULT ''",
      );
    } catch {}
    for (const u of SEED_UNITS) {
      this.db.run("INSERT OR IGNORE INTO units (name) VALUES (?)", [u]);
    }
    for (const t of SEED_PRODUCT_TYPES) {
      this.db.run("INSERT OR IGNORE INTO product_types (name) VALUES (?)", [t]);
    }
    for (const c of SEED_CATEGORIES) {
      this.db.run("INSERT OR IGNORE INTO categories (name) VALUES (?)", [c]);
    }
    this.persist();
  }

  private persist(): void {
    if (!this.filePath) return;
    Deno.writeFileSync(this.filePath, this.db.export());
  }

  exec(sql: string): void {
    this.db.run(sql);
    this.persist();
  }

  run(sql: string, params: (string | number | null)[] = []): void {
    this.db.run(sql, params);
    this.persist();
  }

  runReturningId(sql: string, params: (string | number | null)[] = []): number {
    const stmt = this.db.prepare(sql);
    stmt.bind(params as any);
    stmt.step();
    const row = stmt.getAsObject() as Record<string, unknown>;
    stmt.free();
    this.persist();
    const id = row[Object.keys(row)[0]] as number;
    return id ?? 0;
  }

  query<T>(sql: string, params: (string | number | null)[] = []): T[] {
    const stmt = this.db.prepare(sql);
    try {
      stmt.bind(params as any);
      const rows: T[] = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject() as unknown as T);
      }
      return rows;
    } finally {
      stmt.free();
    }
  }

  queryFirst<T = Record<string, unknown>>(
    sql: string,
    params: (string | number | null)[] = [],
  ): T | null {
    const rows = this.query<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  queryFirstScalar<T>(
    sql: string,
    params: (string | number | null)[] = [],
  ): T | null {
    const rows = this.query<T[]>(sql, params);
    if (rows.length === 0) return null;
    const row = rows[0] as unknown as Record<string, T>;
    const firstKey = Object.keys(row)[0];
    return firstKey ? row[firstKey] : null;
  }

  get lastInsertRowId(): number {
    const stmt = this.db.prepare("SELECT last_insert_rowid() AS id");
    stmt.step();
    const row = stmt.getAsObject() as { id: number };
    stmt.free();
    return row.id ?? 0;
  }

  close(): void {
    this.persist();
    this.db.close();
  }

  reload(bytes: Uint8Array): void {
    this.db.close();
    this.db = new SQL.Database(bytes);
    this.persist();
  }

  export(): Uint8Array {
    return this.db.export();
  }
}
