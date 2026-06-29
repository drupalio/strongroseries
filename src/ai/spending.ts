import { Database } from "../infrastructure/database.ts";
import type { SpendingRecord, SpendingStats } from "./models.ts";
import type { YearMonth } from "../domain/dates.ts";

export class SpendingRepository {
  constructor(private db: Database) {}

  findByDateRange(start: YearMonth, end: YearMonth): SpendingRecord[] {
    return this.db.query<Record<string, any>>(
      "SELECT gl.month AS month, SUM(gi.price_at_purchase * gi.quantity) AS total, COUNT(*) AS transaction_count " +
        "FROM grocery_items gi JOIN grocery_lists gl ON gi.grocery_list_id = gl.id " +
        "WHERE gl.month >= ? AND gl.month <= ? GROUP BY gl.month ORDER BY gl.month",
      [start, end],
    ).map((r) => ({
      month: r.month,
      totalSpent: Number(r.total ?? 0),
      transactionCount: Number(r.transaction_count ?? 0),
    }));
  }

  getMonthlySpending(start: YearMonth, end: YearMonth): Map<YearMonth, number> {
    const m = new Map<YearMonth, number>();
    for (
      const r of this.db.query<Record<string, any>>(
        "SELECT gl.month AS month, SUM(gi.price_at_purchase * gi.quantity) AS total " +
          "FROM grocery_items gi JOIN grocery_lists gl ON gi.grocery_list_id = gl.id " +
          "WHERE gl.month >= ? AND gl.month <= ? GROUP BY gl.month ORDER BY gl.month",
        [start, end],
      )
    ) {
      m.set(r.month, Number(r.total ?? 0));
    }
    return m;
  }

  getSpendingByCategory(month: YearMonth): Map<string, number> {
    const m = new Map<string, number>();
    for (
      const r of this.db.query<Record<string, any>>(
        "SELECT p.category AS category, SUM(gi.price_at_purchase * gi.quantity) AS total " +
          "FROM grocery_items gi JOIN grocery_lists gl ON gi.grocery_list_id = gl.id " +
          "JOIN products p ON gi.product_id = p.id " +
          "WHERE gl.month = ? GROUP BY p.category ORDER BY total DESC",
        [month],
      )
    ) {
      const cat = r.category;
      if (cat != null && cat !== "") m.set(cat, Number(r.total ?? 0));
    }
    return m;
  }

  getStatistics(start: YearMonth, end: YearMonth): SpendingStats {
    const values = [...this.getMonthlySpending(start, end).values()];
    if (values.length === 0) {
      return { mean: 0, stdDev: 0, min: 0, max: 0, median: 0, total: 0 };
    }
    const total = values.reduce((a, b) => a + b, 0);
    const mean = total / values.length;
    const variance = values.reduce((a, v) => a + Math.pow(v - mean, 2), 0) /
      values.length;
    const stdDev = Math.sqrt(variance);
    const sorted = [...values].sort((a, b) => a - b);
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];
    return {
      mean,
      stdDev,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median,
      total,
    };
  }
}
