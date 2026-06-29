import { Database } from "../infrastructure/database.ts";
import type { PurchaseRecord, UserContext } from "./models.ts";
import type { YearMonth } from "../domain/dates.ts";

export class PurchaseHistoryRepository {
  constructor(private db: Database) {}

  private rangeParams(ctx: UserContext): [YearMonth, YearMonth] {
    return [
      ctx.analysisStartDate.substring(0, 7) as YearMonth,
      ctx.analysisEndDate.substring(0, 7) as YearMonth,
    ];
  }

  findByDateRange(ctx: UserContext): PurchaseRecord[] {
    const [s, e] = this.rangeParams(ctx);
    return this.db.query<Record<string, any>>(
      "SELECT p.id AS product_id, p.name AS product_name, p.category AS category, " +
        "gl.store_id AS store_id, s.name AS store_name, gi.price_at_purchase AS price_at_purchase, gi.quantity AS quantity, gl.month AS month " +
        "FROM grocery_items gi JOIN grocery_lists gl ON gi.grocery_list_id = gl.id " +
        "JOIN products p ON gi.product_id = p.id " +
        "LEFT JOIN stores s ON gl.store_id = s.id " +
        "WHERE gl.month >= ? AND gl.month <= ? ORDER BY gl.month DESC",
      [s, e],
    ).map(mapRecord);
  }

  findFrequentPurchases(
    ctx: UserContext,
    minFrequency: number,
  ): PurchaseRecord[] {
    const [s, e] = this.rangeParams(ctx);
    // SQLite HAVING on grouped query; we approximate by grouping in SQL
    const rows = this.db.query<Record<string, any>>(
      "SELECT p.id AS product_id, p.name AS product_name, p.category AS category, " +
        "gl.store_id AS store_id, s.name AS store_name, gi.price_at_purchase AS price_at_purchase, gi.quantity AS quantity, gl.month AS month, " +
        "COUNT(*) AS purchase_count " +
        "FROM grocery_items gi JOIN grocery_lists gl ON gi.grocery_list_id = gl.id " +
        "JOIN products p ON gi.product_id = p.id " +
        "LEFT JOIN stores s ON gl.store_id = s.id " +
        "WHERE gl.month >= ? AND gl.month <= ? " +
        "GROUP BY p.id HAVING COUNT(*) >= ? ORDER BY purchase_count DESC",
      [s, e, minFrequency],
    );
    return rows.map(mapRecord);
  }

  countPurchasesByProduct(ctx: UserContext): Map<number, number> {
    const [s, e] = this.rangeParams(ctx);
    const m = new Map<number, number>();
    for (
      const r of this.db.query<Record<string, any>>(
        "SELECT gi.product_id AS product_id, COUNT(*) AS count " +
          "FROM grocery_items gi JOIN grocery_lists gl ON gi.grocery_list_id = gl.id " +
          "WHERE gl.month >= ? AND gl.month <= ? GROUP BY gi.product_id",
        [s, e],
      )
    ) {
      m.set(Number(r.product_id), Number(r.count));
    }
    return m;
  }

  findByProductId(productId: number, ctx: UserContext): PurchaseRecord[] {
    const [s, e] = this.rangeParams(ctx);
    return this.db.query<Record<string, any>>(
      "SELECT p.id AS product_id, p.name AS product_name, p.category AS category, " +
        "gl.store_id AS store_id, s.name AS store_name, gi.price_at_purchase AS price_at_purchase, gi.quantity AS quantity, gl.month AS month " +
        "FROM grocery_items gi JOIN grocery_lists gl ON gi.grocery_list_id = gl.id " +
        "JOIN products p ON gi.product_id = p.id " +
        "LEFT JOIN stores s ON gl.store_id = s.id " +
        "WHERE gi.product_id = ? AND gl.month >= ? AND gl.month <= ? ORDER BY gl.month DESC",
      [productId, s, e],
    ).map(mapRecord);
  }
}

function mapRecord(r: Record<string, any>): PurchaseRecord {
  let month: string = r.month;
  if (month.length > 7) month = month.substring(0, 7);
  return {
    productId: Number(r.product_id),
    productName: r.product_name,
    category: r.category,
    storeId: Number(r.store_id),
    storeName: r.store_name,
    price: Number(r.price_at_purchase ?? 0),
    quantity: Number(r.quantity ?? 0),
    purchaseMonth: month,
  };
}
