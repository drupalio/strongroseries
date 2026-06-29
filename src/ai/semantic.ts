import { Database } from "../infrastructure/database.ts";
import { computeSimilarity } from "./embedding.ts";
import type { SearchResult } from "./models.ts";

interface ProductDoc {
  id: number;
  name: string;
  category: string;
  price: number;
  storeId: number;
  storeName: string;
}

const INTENT_PATTERNS: Record<string, string[]> = {
  "desayuno": [
    "huevo",
    "pan",
    "leche",
    "cereal",
    "cafe",
    "yogur",
    "fruta",
    "jugo",
    "mantequilla",
    "jalea",
  ],
  "almuerzo": [
    "pollo",
    "arroz",
    "verduras",
    "carne",
    "sopa",
    "ensalada",
    "frijoles",
    "tortilla",
  ],
  "cena": [
    "pollo",
    "pescado",
    "arroz",
    "verduras",
    "pasta",
    "sopa",
    "ensalada",
  ],
  "snacks": [
    "papa",
    "cacahuate",
    "almendra",
    "botana",
    "galletas",
    "dulces",
    "chocolate",
  ],
  "saludable": [
    "fruta",
    "verdura",
    "yogur",
    "ensalada",
    "agua",
    "brocoli",
    "espin",
    "zanahoria",
  ],
  "limpieza": [
    "cloro",
    "detergente",
    "jabon",
    "trapeador",
    "esponja",
    "liquido",
    "limpiador",
  ],
  "bebida": [
    "agua",
    "refresco",
    "jugo",
    "cerveza",
    "vino",
    "cafe",
    "te",
    "leche",
  ],
  "postre": [
    "helado",
    "galletas",
    "chocolate",
    "dulces",
    "pastel",
    "flan",
    "fruta",
  ],
  "casa": [
    "detergente",
    "cloro",
    "jabon",
    "esponja",
    "trapeador",
    "bolsa",
    "papel",
  ],
  "mascota": [
    "comida para perro",
    "comida para gato",
    "arena",
    "premio",
    "hueso",
  ],
};

export class SemanticSearchEngine {
  private index = new Map<number, ProductDoc>();
  private indexed = false;
  private available = true;

  constructor(private db: Database) {}

  search(query: string, maxResults: number): SearchResult[] {
    if (!this.indexed) this.indexProducts();
    if (this.index.size === 0) return [];
    const nq = query.toLowerCase().trim();
    if (nq.length < 2) return [];
    const expanded = this.expandQuery(nq);
    const candidates = [...this.index.values()];
    return candidates
      .map((p) => ({ p, score: this.score(nq, expanded, p) }))
      .filter((e) => e.score > 0.2)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map((e) => this.toResult(e.p, e.score, nq));
  }

  indexProducts(): void {
    const rows = this.db.query<Record<string, any>>(
      "SELECT p.id AS id, p.name AS name, p.category AS category, " +
        "(SELECT pp2.price FROM product_prices pp2 WHERE pp2.product_id = p.id ORDER BY pp2.effective_date DESC LIMIT 1) AS price, " +
        "p.store_id AS store_id, s.name AS store_name FROM products p LEFT JOIN stores s ON p.store_id = s.id",
      [],
    );
    this.index.clear();
    for (const r of rows) {
      this.index.set(Number(r.id), {
        id: Number(r.id),
        name: r.name,
        category: r.category,
        price: Number(r.price ?? 0),
        storeId: Number(r.store_id),
        storeName: r.store_name,
      });
    }
    this.indexed = true;
  }

  isAvailable(): boolean {
    return this.available;
  }
  reindex(): void {
    this.indexed = false;
    this.index.clear();
    this.indexProducts();
  }

  private expandQuery(q: string): string[] {
    const terms = [q];
    for (const [intent, kws] of Object.entries(INTENT_PATTERNS)) {
      if (q.includes(intent)) terms.push(...kws);
    }
    return [...new Set(terms)];
  }

  private score(query: string, expanded: string[], p: ProductDoc): number {
    const name = p.name.toLowerCase();
    const cat = (p.category).toLowerCase();
    const nameHit = name.includes(query);
    const catHit = cat.includes(query);
    const anyExp = expanded.some((t) => name.includes(t) || cat.includes(t));
    if (!nameHit && !catHit && !anyExp) return 0;
    const nameScore = computeSimilarity(query, p.name);
    const catScore = p.category
      ? computeSimilarity(query, p.category) * 0.6
      : 0;
    return Math.min(nameScore * 0.6 + catScore * 0.4, 1.0);
  }

  private toResult(p: ProductDoc, score: number, query: string): SearchResult {
    const matchedOn = p.name.toLowerCase().includes(query)
      ? "nombre"
      : "categoria";
    return {
      productId: String(p.id),
      productName: p.name,
      category: p.category,
      relevanceScore: score,
      matchedOn,
      price: p.price,
      storeId: p.storeName, // Java fidelity: storeId holds store NAME
    };
  }
}
