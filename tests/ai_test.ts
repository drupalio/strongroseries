import { assertEquals } from "@std/assert";
import { Database } from "../src/infrastructure/database.ts";
import {
  GroceryItemRepository,
  GroceryListRepository,
  ProductPriceRepository,
  ProductRepository,
  StoreRepository,
} from "../src/infrastructure/repositories.ts";
import {
  GroceryItem,
  GroceryList,
  Product,
  ProductPrice,
  Store,
} from "../src/domain/entity.ts";
import {
  localDate,
  monthsAgoISO,
  todayISO,
  yearMonth,
} from "../src/domain/dates.ts";
import {
  computeSimilarity,
  cosineSimilarity,
  embed,
  findMostSimilar,
} from "../src/ai/embedding.ts";
import { RecommendationEngine } from "../src/ai/recommendation.ts";
import { InsightEngine } from "../src/ai/insight.ts";

import { SemanticSearchEngine } from "../src/ai/semantic.ts";
import { AIService } from "../src/ai/ai_service.ts";
import { defaultUserContext } from "../src/ai/models.ts";

function seed(): Database {
  const db = new Database(":memory:");
  db.initializeSchema();
  const stores = new StoreRepository(db);
  const products = new ProductRepository(db);
  const prices = new ProductPriceRepository(db);
  const lists = new GroceryListRepository(db);
  const items = new GroceryItemRepository(db);

  const s = stores.save(new Store(null, "Walmart", "#FF0000"));
  const milk = products.save(
    new Product(
      null,
      s.id!,
      "Leche Entera",
      "Litro",
      "Recurrente",
      "Lacteos",
    ),
  );
  const bread = products.save(
    new Product(
      null,
      s.id!,
      "Pan Bimbo",
      "Pieza",
      "Recurrente",
      "Panaderia",
    ),
  );
  const eggs = products.save(
    new Product(
      null,
      s.id!,
      "Huevo Blanco",
      "Docena",
      "Recurrente",
      "Carnes",
    ),
  );
  prices.save(new ProductPrice(null, milk.id!, 25, localDate(2026, 1, 1)));
  prices.save(new ProductPrice(null, milk.id!, 26, localDate(2026, 2, 1)));
  prices.save(new ProductPrice(null, milk.id!, 27, localDate(2026, 3, 1)));
  prices.save(new ProductPrice(null, bread.id!, 30, localDate(2026, 1, 1)));
  prices.save(new ProductPrice(null, eggs.id!, 50, localDate(2026, 1, 1)));

  // Completed lists across 4 months
  for (let m = 1; m <= 4; m++) {
    const l = lists.save(
      new GroceryList(null, s.id!, `Lista ${m}`, yearMonth(2026, m), true),
    );
    items.save(
      new GroceryItem(
        null,
        l.id!,
        milk.id!,
        "Leche Entera",
        2,
        "Litro",
        25 + m,
        false,
      ),
    );
    items.save(
      new GroceryItem(
        null,
        l.id!,
        bread.id!,
        "Pan Bimbo",
        1,
        "Pieza",
        30,
        false,
      ),
    );
  }
  return db;
}

Deno.test("Embedding: embed non-empty returns vector", () => {
  const v = embed("leche entera fresca");
  assertEquals(v.length > 0, true);
});

Deno.test("Embedding: cosine similarity in [0,1]-ish for similar text", () => {
  const a = embed("leche entera");
  const b = embed("leche descremada");
  const sim = cosineSimilarity(a, b);
  assertEquals(sim >= 0 && sim <= 1, true);
});

Deno.test("Embedding: unrelated single words have low similarity", () => {
  const sim = computeSimilarity("shampoo", "leche");
  assertEquals(sim < 0.5, true);
});

Deno.test("Embedding: computeSimilarity identical >= different (naive TF-IDF faithful to Java)", () => {
  const same = computeSimilarity("leche entera", "leche entera");
  const diff = computeSimilarity("leche entera", "detergente cloro");
  assertEquals(same >= diff, true);
});

Deno.test("Embedding: findMostSimilar sorted desc", () => {
  const r = findMostSimilar("leche", ["leche", "pan", "leche descremada"], 3);
  assertEquals(r.length, 3);
  assertEquals(r[0].score >= r[1].score, true);
  assertEquals(r[1].score >= r[2].score, true);
});

Deno.test("InsightEngine: price anomaly when outlier price present", () => {
  const db = seed();
  // Add several normal-priced completed lists + one outlier-priced list for milk
  const lists = new GroceryListRepository(db);
  const items = new GroceryItemRepository(db);
  const stores = new StoreRepository(db);
  const products = new ProductRepository(db);
  const s = stores.findAll()[0];
  const milk = products.findAll()[0];
  for (let m = 1; m <= 6; m++) {
    const l = lists.save(
      new GroceryList(null, s.id!, `N${m}`, yearMonth(2026, m), true),
    );
    items.save(
      new GroceryItem(
        null,
        l.id!,
        milk.id!,
        "Leche Entera",
        1,
        "Litro",
        25,
        false,
      ),
    );
  }
  const lOut = lists.save(
    new GroceryList(null, s.id!, "Out", yearMonth(2026, 5), true),
  );
  items.save(
    new GroceryItem(
      null,
      lOut.id!,
      milk.id!,
      "Leche Entera",
      1,
      "Litro",
      500,
      false,
    ),
  );
  const eng = new InsightEngine(db);
  const ctx = {
    ...defaultUserContext(),
    analysisStartDate: monthsAgoISO(24),
    analysisEndDate: todayISO(),
  };
  const insights = eng.detectPriceAnomalies(ctx);
  assertEquals(insights.length > 0, true);
  assertEquals(insights[0].type, "ANOMALY_PRICE");
});

Deno.test("InsightEngine: duplicate purchase detected", () => {
  const db = seed();
  const eng = new InsightEngine(db);
  const dups = eng.detectDuplicatePurchases(defaultUserContext());
  // milk appears in multiple lists same... actually different months. Build explicit duplicate:
  const lists = new GroceryListRepository(db);
  const items = new GroceryItemRepository(db);
  const stores = new StoreRepository(db);
  const products = new ProductRepository(db);
  const s = stores.findAll()[0];
  const milk = products.findAll()[0];
  const l = lists.save(
    new GroceryList(null, s.id!, "Dup", yearMonth(2026, 6), true),
  );
  items.save(
    new GroceryItem(
      null,
      l.id!,
      milk.id!,
      "Leche Entera",
      1,
      "Litro",
      25,
      false,
    ),
  );
  items.save(
    new GroceryItem(
      null,
      l.id!,
      milk.id!,
      "Leche Entera",
      2,
      "Litro",
      26,
      false,
    ),
  );
  const dups2 = eng.detectDuplicatePurchases(defaultUserContext());
  assertEquals(dups2.length > 0, true);
});

Deno.test("RecommendationEngine: replenishment when last purchase > 30 days ago", () => {
  const db = seed();
  // Make a purchase 60 days ago
  const lists = new GroceryListRepository(db);
  const items = new GroceryItemRepository(db);
  const stores = new StoreRepository(db);
  const products = new ProductRepository(db);
  const s = stores.findAll()[0];
  const coffee = products.save(
    new Product(null, s.id!, "Cafe", "Pieza", "Recurrente", "Bebidas"),
  );
  // 2 completed lists 3+ months ago
  const old1 = lists.save(
    new GroceryList(null, s.id!, "Old1", yearMonth(2026, 1), true),
  );
  const old2 = lists.save(
    new GroceryList(null, s.id!, "Old2", yearMonth(2026, 2), true),
  );
  items.save(
    new GroceryItem(null, old1.id!, coffee.id!, "Cafe", 1, "Pieza", 40, false),
  );
  items.save(
    new GroceryItem(null, old2.id!, coffee.id!, "Cafe", 1, "Pieza", 40, false),
  );
  const eng = new RecommendationEngine(db);
  const ctx = {
    ...defaultUserContext(),
    analysisStartDate: monthsAgoISO(12),
    analysisEndDate: todayISO(),
  };
  const recs = eng.recommendReplenishment(ctx);
  const cafe = recs.find((r) => r.productName === "Cafe");
  assertEquals(cafe != null, true);
  assertEquals(cafe!.type, "REPLENISHMENT");
});

Deno.test("SemanticSearchEngine: index + search returns matching product", () => {
  const db = seed();
  const eng = new SemanticSearchEngine(db);
  eng.indexProducts();
  const results = eng.search("leche", 10);
  assertEquals(results.length > 0, true);
  assertEquals(results[0].productName.toLowerCase().includes("leche"), true);
  assertEquals(results[0].matchedOn, "nombre");
});

Deno.test("AIService: initialize sets available; recommend returns array", () => {
  const db = seed();
  const ai = new AIService(db);
  assertEquals(ai.isAvailable(), false);
  ai.initialize();
  assertEquals(ai.isAvailable(), true);
  const recs = ai.recommend(defaultUserContext());
  assertEquals(Array.isArray(recs), true);
  const f = ai.forecast(defaultUserContext());
  assertEquals(typeof f.predictedMonthlySpending, "number");
  const sr = ai.semanticSearch("pan");
  assertEquals(Array.isArray(sr), true);
  const ins = ai.detectAnomalies();
  assertEquals(Array.isArray(ins), true);
});

Deno.test("AIService: not available returns empty results", () => {
  const db = seed();
  const ai = new AIService(db);
  assertEquals(ai.recommend(defaultUserContext()), []);
  assertEquals(ai.semanticSearch("x"), []);
});

Deno.test("AIService: forecast returns UnifiedForecast with spending+pantry sections", () => {
  const db = seed();
  const ai = new AIService(db);
  ai.initialize();
  const ctx = {
    ...defaultUserContext(),
    pantryHistory: [
      {
        productId: 1,
        productName: "Leche",
        quantity: 2,
        status: "Terminado",
        period: "2026-04",
      },
      {
        productId: 2,
        productName: "Pan",
        quantity: 1,
        status: "Merma",
        period: "2026-04",
      },
    ],
  };
  const f = ai.forecast(ctx);
  assertEquals(typeof f.predictedMonthlySpending, "number");
  assertEquals(Array.isArray(f.consumptionVelocity), true);
  assertEquals(Array.isArray(f.mermaRisk), true);
  assertEquals(Array.isArray(f.reorderRecommendations), true);
});
