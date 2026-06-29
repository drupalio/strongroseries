import { Database } from "../infrastructure/database.ts";
import { PurchaseHistoryRepository } from "./purchase.ts";
import { SpendingRepository } from "./spending.ts";
import type { Insight, PurchaseRecord, UserContext } from "./models.ts";
import type { YearMonth } from "../domain/dates.ts";

export class InsightEngine {
  private purchaseRepo: PurchaseHistoryRepository;
  private spendingRepo: SpendingRepository;
  private cache = new Map<string, Insight[]>();
  private available = true;

  constructor(db: Database) {
    this.purchaseRepo = new PurchaseHistoryRepository(db);
    this.spendingRepo = new SpendingRepository(db);
  }

  detectAnomalies(ctx: UserContext): Insight[] {
    const key = `${ctx.userId}_${ctx.analysisEndDate}`;
    const cached = this.cache.get(key);
    if (cached) return cached;
    const all: Insight[] = [];
    all.push(...this.detectPriceAnomalies(ctx));
    all.push(...this.detectSpendingAnomalies(ctx));
    all.push(...this.detectDuplicatePurchases(ctx));
    all.push(...this.detectHabitChanges(ctx));
    all.sort((a, b) => b.severity - a.severity);
    this.cache.set(key, all);
    return all;
  }

  detectPriceAnomalies(ctx: UserContext): Insight[] {
    const purchases = this.purchaseRepo.findByDateRange(ctx);
    const byProduct = new Map<number, number[]>();
    for (const r of purchases) {
      if (r.price > 0) {
        const arr = byProduct.get(r.productId) ?? [];
        arr.push(r.price);
        byProduct.set(r.productId, arr);
      }
    }
    const out: Insight[] = [];
    for (const [pid, prices] of byProduct) {
      if (prices.length < 3) continue;
      const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
      const variance = prices.reduce((a, p) => a + Math.pow(p - mean, 2), 0) /
        prices.length;
      const stdDev = Math.sqrt(variance);
      for (const price of prices) {
        const z = (price - mean) / (stdDev + 1e-10);
        if (Math.abs(z) > 2.0) {
          const label = Math.abs(z) > 3.0 ? "Critico" : "Moderado";
          const rec = findRecordByPrice(purchases, pid, price);
          out.push({
            id: crypto.randomUUID(),
            type: "ANOMALY_PRICE",
            title: `Precio atipico detectado: ${label}`,
            description: `Precio $${price.toFixed(2)} varia ${
              (z * 100 / Math.max(mean, 1)).toFixed(1)
            }% del promedio $${mean.toFixed(2)} para este producto`,
            severity: Math.min(Math.abs(z) / 3.0, 1.0),
            entityId: String(pid),
            entityName: rec ? rec.productName : `Producto #${pid}`,
            details: {},
            detectedAt: new Date().toISOString(),
          });
          break;
        }
      }
    }
    return out;
  }

  detectSpendingAnomalies(ctx: UserContext): Insight[] {
    const start = ctx.analysisStartDate.substring(0, 7) as YearMonth;
    const end = ctx.analysisEndDate.substring(0, 7) as YearMonth;
    const stats = this.spendingRepo.getStatistics(start, end);
    if (stats.stdDev === 0) return [];
    const monthly = this.spendingRepo.getMonthlySpending(start, end);
    const out: Insight[] = [];
    for (const [m, spending] of monthly) {
      const z = (spending - stats.mean) / (stats.stdDev + 1e-10);
      if (z > 1.5 || z < -1.0) {
        const dir = z > 0 ? "supera" : "esta muy por debajo";
        out.push({
          id: crypto.randomUUID(),
          type: "ANOMALY_SPENDING",
          title: `Gasto inusual en ${m}`,
          description: `Gasto de $${
            spending.toFixed(2)
          } ${dir} el promedio de $${stats.mean.toFixed(2)}`,
          severity: Math.min(Math.abs(z) / 3.0, 1.0),
          entityId: m,
          entityName: `Mes ${m}`,
          details: {},
          detectedAt: new Date().toISOString(),
        });
      }
    }
    return out;
  }

  detectDuplicatePurchases(ctx: UserContext): Insight[] {
    const purchases = this.purchaseRepo.findByDateRange(ctx);
    const grouped = new Map<string, PurchaseRecord[]>();
    for (const r of purchases) {
      const key = `${r.productId}_${r.purchaseMonth}`;
      const arr = grouped.get(key) ?? [];
      arr.push(r);
      grouped.set(key, arr);
    }
    const out: Insight[] = [];
    for (const [, recs] of grouped) {
      if (recs.length > 1) {
        const totalQty = recs.reduce((a, r) => a + r.quantity, 0);
        out.push({
          id: crypto.randomUUID(),
          type: "DUPLICATE_PURCHASE",
          title: "Posible compra duplicada",
          description: `${recs.length} compras del mismo producto en ${
            recs[0].purchaseMonth
          } (total: ${totalQty} unidades)`,
          severity: 0.6,
          entityId: String(recs[0].productId),
          entityName: recs[0].productName,
          details: {},
          detectedAt: new Date().toISOString(),
        });
      }
    }
    return out;
  }

  detectHabitChanges(ctx: UserContext): Insight[] {
    const purchases = this.purchaseRepo.findByDateRange(ctx);
    const freq = new Map<number, Map<YearMonth, number>>();
    for (const r of purchases) {
      const m = freq.get(r.productId) ?? new Map();
      m.set(r.purchaseMonth, (m.get(r.purchaseMonth) ?? 0) + 1);
      freq.set(r.productId, m);
    }
    const out: Insight[] = [];
    for (const [pid, months] of freq) {
      if (months.size < 3) continue;
      const sorted = [...months.keys()].sort();
      const mid = Math.floor(sorted.length / 2);
      let first = 0;
      for (let i = 0; i < mid; i++) first += months.get(sorted[i])!;
      first /= mid;
      let second = 0;
      for (let i = mid; i < sorted.length; i++) {
        second += months.get(sorted[i])!;
      }
      second /= sorted.length - mid;
      if (first > 0 && second > 0) {
        const changePct = Math.abs((second - first) / first) * 100;
        if (changePct > 50) {
          const dir = second > first ? "aumento" : "disminucion";
          out.push({
            id: crypto.randomUUID(),
            type: "HABIT_CHANGE",
            title: "Cambio en habito de compra",
            description: `Producto #${pid} ha ${dir} de ${
              changePct.toFixed(0)
            }% en frecuencia de compra`,
            severity: Math.min(changePct / 100, 0.9),
            entityId: String(pid),
            entityName: `Producto #${pid}`,
            details: {},
            detectedAt: new Date().toISOString(),
          });
        }
      }
    }
    return out;
  }

  isAvailable(): boolean {
    return this.available;
  }
  clearCache(): void {
    this.cache.clear();
  }
}

function findRecordByPrice(
  purchases: PurchaseRecord[],
  pid: number,
  price: number,
): PurchaseRecord | null {
  for (const r of purchases) {
    if (r.productId === pid && Math.abs(r.price - price) < 0.01) return r;
  }
  return null;
}
