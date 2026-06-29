import type {
  ConsumptionVelocityEntry,
  MermaRiskEntry,
  ReorderEntry,
  ReorderUrgency,
  UserContext,
} from "./models.ts";

export class ReorderEngine {
  private cache = new Map<string, ReorderEntry[]>();

  constructor(
    private historyVersionProvider: () => number,
    private pantryVersionProvider: () => number,
  ) {}

  predict(
    ctx: UserContext,
    consumptionVelocity: ConsumptionVelocityEntry[],
    mermaRisk: MermaRiskEntry[],
  ): ReorderEntry[] {
    if (!ctx.pantryCurrentStock || ctx.pantryCurrentStock.length === 0) {
      return [];
    }
    const key =
      `v${this.historyVersionProvider()}:v${this.pantryVersionProvider()}`;
    const cached = this.cache.get(key);
    if (cached) return cached;

    const consumptionMap = new Map(
      consumptionVelocity.map((c) => [c.productId, c]),
    );
    const riskMap = new Map(mermaRisk.map((r) => [r.productId, r]));

    const result: ReorderEntry[] = [];
    for (const stock of ctx.pantryCurrentStock) {
      const cons = consumptionMap.get(stock.productId);
      const risk = riskMap.get(stock.productId);
      const baseRate = cons?.monthlyConsumptionRate ?? 0.5;
      const riskFactor = risk ? risk.mermaRisk : 0;
      const adjustedRate = baseRate * (1 + riskFactor);
      const daysUntilEmpty = adjustedRate > 0
        ? Math.round((stock.quantity / adjustedRate) * 30)
        : 999;

      let urgency: ReorderUrgency = "LOW";
      if (daysUntilEmpty < 15) urgency = "HIGH";
      else if (daysUntilEmpty < 30) urgency = "MEDIUM";

      if (urgency === "LOW") continue;

      result.push({
        productId: stock.productId,
        productName: stock.productName,
        currentStock: stock.quantity,
        unit: stock.unit,
        monthlyConsumptionRate: Math.round(baseRate * 10) / 10,
        daysUntilEmpty,
        mermaRisk: risk?.mermaRisk ?? 0,
        reorderUrgency: urgency,
        suggestedQuantity: Math.ceil(adjustedRate),
      });
    }

    this.cache.set(key, result);
    return result.sort((a, b) => a.daysUntilEmpty - b.daysUntilEmpty);
  }

  clearCache(): void {
    this.cache.clear();
  }
}
