import type {
  MermaRiskEntry,
  PantryConsumptionRecord,
  UserContext,
} from "./models.ts";

export class MermaRiskEngine {
  private cache = new Map<string, MermaRiskEntry[]>();

  constructor(private versionProvider: () => number) {}

  predict(ctx: UserContext): MermaRiskEntry[] {
    if (!ctx.pantryHistory || ctx.pantryHistory.length === 0) return [];
    const key = `v${this.versionProvider()}`;
    const cached = this.cache.get(key);
    if (cached) return cached;

    const byProduct = new Map<
      number,
      { entries: PantryConsumptionRecord[]; name: string; category: string }
    >();
    for (const h of ctx.pantryHistory) {
      const existing = byProduct.get(h.productId) ??
        {
          entries: [] as PantryConsumptionRecord[],
          name: h.productName,
          category: "",
        };
      existing.entries.push(h);
      byProduct.set(h.productId, existing);
    }

    const result: MermaRiskEntry[] = [];
    for (const [pid, data] of byProduct) {
      let mermaCount = 0;
      let terminadoCount = 0;
      const causes = new Map<string, number>();
      for (const e of data.entries) {
        if (e.status === "Merma") {
          mermaCount++;
        } else if (e.status === "Terminado") {
          terminadoCount++;
        }
      }

      const total = mermaCount + terminadoCount;
      if (total === 0) continue;

      const risk = mermaCount / total;
      let primaryCause = "";
      let maxCause = 0;
      for (const [cause, count] of causes) {
        if (count > maxCause) {
          maxCause = count;
          primaryCause = cause;
        }
      }

      result.push({
        productId: pid,
        productName: data.name,
        category: data.category || "General",
        mermaRisk: Math.round(risk * 100) / 100,
        confidence: Math.min(total / 5, 1),
        primaryCause: primaryCause || "",
        sampleSize: total,
      });
    }

    this.cache.set(key, result);
    return result.sort((a, b) => b.mermaRisk - a.mermaRisk).slice(0, 20);
  }

  clearCache(): void {
    this.cache.clear();
  }
}
