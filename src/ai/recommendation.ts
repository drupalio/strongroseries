import { computeSimilarity, findMostSimilar } from "./embedding.ts";
import { PurchaseHistoryRepository } from "./purchase.ts";
import { Database } from "../infrastructure/database.ts";
import type {
  ProductSuggestion,
  PurchaseRecord,
  UserContext,
} from "./models.ts";
import { todayISO, type YearMonth } from "../domain/dates.ts";

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Desayuno": [
    "leche",
    "cereal",
    "huevo",
    "pan",
    "cafe",
    "jalea",
    "mantequilla",
    "yogur",
  ],
  "Frutas": [
    "manzana",
    "platano",
    "naranja",
    "uva",
    "fresa",
    "mango",
    "papaya",
    "pina",
  ],
  "Verduras": [
    "tomate",
    "cebolla",
    "ajo",
    "pimiento",
    "lechuga",
    "zanahoria",
    "brocoli",
    "espin",
  ],
  "Carnes": [
    "pollo",
    "res",
    "cerdo",
    "costilla",
    "bistec",
    "hamburguesa",
    "salchicha",
  ],
  "Lacteos": [
    "leche",
    "queso",
    "yogur",
    "crema",
    "mantequilla",
    "leche condensada",
  ],
  "Bebidas": ["agua", "refresco", "jugo", "cerveza", "vino", "cafe", "te"],
  "Botanas": [
    "papa",
    "cheetos",
    "doritos",
    "cacahuate",
    "almendra",
    "nuez",
    "palomitas",
  ],
  "Limpieza": [
    "cloro",
    "detergente",
    "jabon",
    "trapeador",
    "escoba",
    "esponja",
    "liquido",
  ],
  "Cuidado Personal": [
    "shampoo",
    "jabon",
    "pasta dental",
    "cepillo",
    "crema",
    "desodorante",
  ],
};

const CANDIDATE_BASKET = [
  "leche",
  "pan",
  "huevo",
  "arroz",
  "pollo",
  "verduras",
];

export class RecommendationEngine {
  private purchaseRepo: PurchaseHistoryRepository;
  private cache = new Map<string, ProductSuggestion[]>();
  private available = true;

  constructor(db: Database) {
    this.purchaseRepo = new PurchaseHistoryRepository(db);
  }

  recommend(ctx: UserContext): ProductSuggestion[] {
    const key = `${ctx.userId}_${ctx.analysisStartDate}`;
    const cached = this.cache.get(key);
    if (cached) return cached;
    const out: ProductSuggestion[] = [];
    out.push(...this.recommendReplenishment(ctx));
    out.push(...this.recommendByCategory(ctx));
    out.sort((a, b) => b.confidence - a.confidence);
    const seen = new Set<string>();
    const deduped = out.filter((r) => {
      const k = r.productName.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    this.cache.set(key, deduped);
    return deduped;
  }

  recommendRelated(productId: number, ctx: UserContext): ProductSuggestion[] {
    const records = this.purchaseRepo.findByProductId(productId, ctx);
    if (records.length === 0) return [];
    const main = records[0];
    const all = this.purchaseRepo.findByDateRange(ctx);
    const counts = new Map<number, number>();
    const names = new Map<number, Set<string>>();
    for (const r of all) {
      if (r.productId !== productId) {
        counts.set(r.productId, (counts.get(r.productId) ?? 0) + 1);
        const s = names.get(r.productId) ?? new Set();
        s.add(r.productName);
        names.set(r.productId, s);
      }
    }
    const out: ProductSuggestion[] = [];
    for (const [pid, c] of counts) {
      if (c >= 1) {
        const name = [...(names.get(pid) ?? [])][0] ?? "";
        out.push({
          productId: String(pid),
          productName: name,
          category: main.category,
          storeName: "",
          confidence: Math.min(c * 0.2, 0.95),
          reason: `Frecuentemente comprado junto con ${main.productName}`,
          type: "RELATED_PRODUCT",
          metadata: {},
        });
      }
    }
    out.sort((a, b) => b.confidence - a.confidence);
    return out;
  }

  recommendReplenishment(ctx: UserContext): ProductSuggestion[] {
    const frequent = this.purchaseRepo.findFrequentPurchases(ctx, 1);
    const today = new Date(todayISO());
    const out: ProductSuggestion[] = [];
    for (const r of frequent) {
      const last = new Date(r.purchaseMonth + "-01");
      const days = Math.floor(
        (today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (days > 30) {
        const urgency = Math.min(days / 30, 1.5);
        out.push({
          productId: String(r.productId),
          productName: r.productName,
          category: r.category,
          storeName: r.storeName,
          confidence: urgency,
          reason: `Comprado frecuentemente - ultima compra hace ${days} dias`,
          type: "REPLENISHMENT",
          metadata: {},
        });
      }
    }
    return out;
  }

  private recommendByCategory(ctx: UserContext): ProductSuggestion[] {
    const purchases = this.purchaseRepo.findByDateRange(ctx);
    const freq = new Map<string, number>();
    for (const r of purchases) {
      if (r.category) freq.set(r.category, (freq.get(r.category) ?? 0) + 1);
    }
    let top = "";
    let max = 0;
    for (const [c, n] of freq) {
      if (n > max) {
        max = n;
        top = c;
      }
    }
    const keywords = CATEGORY_KEYWORDS[top] ?? [];
    const out: ProductSuggestion[] = [];
    for (const kw of keywords) {
      const similar = findMostSimilar(kw, CANDIDATE_BASKET, 3);
      for (const s of similar) {
        if (s.score > 0.5) {
          out.push({
            productId: "",
            productName: s.item,
            category: top,
            storeName: "",
            confidence: s.score * 0.6,
            reason: `Popular en categoria ${top}`,
            type: "FREQUENT_PURCHASE",
            metadata: {},
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
