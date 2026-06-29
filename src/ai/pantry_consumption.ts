import type {
  ConsumptionVelocityEntry,
  PantryConsumptionRecord,
  UserContext,
} from "./models.ts";

export class PantryConsumptionEngine {
  private cache = new Map<string, ConsumptionVelocityEntry[]>();

  constructor(private versionProvider: () => number) {}

  predict(ctx: UserContext): ConsumptionVelocityEntry[] {
    if (!ctx.pantryHistory || ctx.pantryHistory.length === 0) return [];
    const key = `v${this.versionProvider()}`;
    const cached = this.cache.get(key);
    if (cached) return cached;

    const byProduct = new Map<number, PantryConsumptionRecord[]>();
    for (const h of ctx.pantryHistory) {
      const arr = byProduct.get(h.productId) ?? [];
      arr.push(h);
      byProduct.set(h.productId, arr);
    }

    const statusOrder = [
      "Nuevo",
      "Comezado",
      "Media vida",
      "Por terminar",
      "Terminado",
      "Merma",
      "Eliminado",
    ];
    const result: ConsumptionVelocityEntry[] = [];

    for (const [pid, entries] of byProduct) {
      const sorted = entries.sort((a, b) => a.period.localeCompare(b.period));
      const transitionMonths: number[] = [];
      let lastIdx = -1;
      let totalConsumed = 0;
      let terminalCount = 0;
      const statusDays: Record<string, number[]> = {};

      for (let i = 0; i < sorted.length; i++) {
        const e = sorted[i];
        const idx = statusOrder.indexOf(e.status);
        if (idx < 0) continue;

        if (lastIdx >= 0 && idx > lastIdx) {
          if (i > 0) {
            const prev = sorted[i - 1];
            const monthsDiff = this.monthDiff(prev.period, e.period);
            if (monthsDiff > 0) transitionMonths.push(monthsDiff);
            const prevStatus = prev.status;
            (statusDays[prevStatus] ??= []).push(monthsDiff * 30);
          }
        }
        lastIdx = idx;

        if (e.status === "Terminado" || e.status === "Merma") {
          totalConsumed += e.quantity;
          terminalCount++;
        }
      }

      const numPeriods = sorted.length || 1;
      const avgTransition = transitionMonths.length > 0
        ? transitionMonths.reduce((a, b) => a + b, 0) / transitionMonths.length
        : 1;
      const monthlyConsumptionRate = totalConsumed > 0
        ? totalConsumed / numPeriods
        : 0;
      const estimatedDaysToEmpty = monthlyConsumptionRate > 0
        ? Math.round(30 / monthlyConsumptionRate)
        : 0;

      const avgDaysInStatus: Record<string, number> = {};
      for (const [s, days] of Object.entries(statusDays)) {
        avgDaysInStatus[s] = Math.round(
          days.reduce((a, b) => a + b, 0) / days.length,
        );
      }

      result.push({
        productId: pid,
        productName: sorted[0].productName,
        avgDaysInStatus,
        monthlyConsumptionRate: Math.round(monthlyConsumptionRate * 10) / 10,
        estimatedDaysToEmpty,
        confidence: Math.min(terminalCount / 3, 1),
      });
    }

    this.cache.set(key, result);
    return result.sort((a, b) =>
      b.monthlyConsumptionRate - a.monthlyConsumptionRate
    ).slice(0, 20);
  }

  clearCache(): void {
    this.cache.clear();
  }

  private monthDiff(a: string, b: string): number {
    const [y1, m1] = a.split("-").map(Number);
    const [y2, m2] = b.split("-").map(Number);
    return (y2 - y1) * 12 + (m2 - m1);
  }
}
