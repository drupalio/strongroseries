import { assertEquals } from "@std/assert";
import { SpendingForecastEngine } from "../src/ai/spending_forecast.ts";
import { PantryConsumptionEngine } from "../src/ai/pantry_consumption.ts";
import { MermaRiskEngine } from "../src/ai/merma_risk.ts";
import { ReorderEngine } from "../src/ai/reorder.ts";
import type { UserContext } from "../src/ai/models.ts";

Deno.test("SpendingForecastEngine: predicted > 0 with data", () => {
  let ver = 0;
  const eng = new SpendingForecastEngine(() => ver);
  const ctx: UserContext = {
    userId: "t",
    analysisStartDate: "2026-01-01",
    analysisEndDate: "2026-06-01",
    monthlyBudget: 0,
    preferredStoreIds: [],
    excludedCategories: [],
    spendingInput: {
      monthlyTotals: { "2026-01": 100, "2026-02": 110, "2026-03": 120 },
      currentMonthBreakdown: { "Lacteos": 50 },
    },
  };
  const r = eng.forecast(ctx);
  assertEquals(r.predicted > 0, true);
  assertEquals(r.upperBound >= r.lowerBound, true);
});

Deno.test("SpendingForecastEngine: return zero with no input", () => {
  const eng = new SpendingForecastEngine(() => 0);
  const ctx: UserContext = {
    userId: "t",
    analysisStartDate: "2026-01-01",
    analysisEndDate: "2026-06-01",
    monthlyBudget: 0,
    preferredStoreIds: [],
    excludedCategories: [],
  };
  const r = eng.forecast(ctx);
  assertEquals(r.predicted, 0);
});

Deno.test("SpendingForecastEngine: CRITICAL alert when predicted >= budget", () => {
  let ver = 0;
  const eng = new SpendingForecastEngine(() => ver);
  const ctx: UserContext = {
    userId: "t",
    analysisStartDate: "2026-01-01",
    analysisEndDate: "2026-06-01",
    monthlyBudget: 1,
    preferredStoreIds: [],
    excludedCategories: [],
    spendingInput: {
      monthlyTotals: { "2026-01": 50, "2026-02": 60 },
      currentMonthBreakdown: {},
    },
  };
  const r = eng.forecast(ctx);
  assertEquals(r.alert, "CRITICAL");
});

Deno.test("SpendingForecastEngine: cache returns same result for same version", () => {
  let ver = 0;
  const eng = new SpendingForecastEngine(() => ver);
  const ctx: UserContext = {
    userId: "t",
    analysisStartDate: "2026-01-01",
    analysisEndDate: "2026-06-01",
    monthlyBudget: 0,
    preferredStoreIds: [],
    excludedCategories: [],
    spendingInput: {
      monthlyTotals: { "2026-01": 100, "2026-02": 110 },
      currentMonthBreakdown: {},
    },
  };
  const r1 = eng.forecast(ctx);
  const r2 = eng.forecast(ctx);
  assertEquals(r1.predicted, r2.predicted);
});

Deno.test("PantryConsumptionEngine: empty history returns []", () => {
  const eng = new PantryConsumptionEngine(() => 0);
  const ctx: UserContext = {
    userId: "t",
    analysisStartDate: "",
    analysisEndDate: "",
    monthlyBudget: 0,
    preferredStoreIds: [],
    excludedCategories: [],
  };
  assertEquals(eng.predict(ctx), []);
});

Deno.test("PantryConsumptionEngine: calculates rate from Terminado/Merma entries", () => {
  let ver = 0;
  const eng = new PantryConsumptionEngine(() => ver);
  const ctx: UserContext = {
    userId: "t",
    analysisStartDate: "",
    analysisEndDate: "",
    monthlyBudget: 0,
    preferredStoreIds: [],
    excludedCategories: [],
    pantryHistory: [
      {
        productId: 1,
        productName: "Leche",
        quantity: 2,
        status: "Terminado",
        period: "2026-04",
      },
      {
        productId: 1,
        productName: "Leche",
        quantity: 3,
        status: "Terminado",
        period: "2026-05",
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
  const result = eng.predict(ctx);
  assertEquals(result.length, 2);
  const leche = result.find((r) => r.productName === "Leche");
  assertEquals(leche != null, true);
  assertEquals(leche!.monthlyConsumptionRate, 2.5);
});

Deno.test("PantryConsumptionEngine: includes status transition data", () => {
  let ver = 0;
  const eng = new PantryConsumptionEngine(() => ver);
  const ctx: UserContext = {
    userId: "t",
    analysisStartDate: "",
    analysisEndDate: "",
    monthlyBudget: 0,
    preferredStoreIds: [],
    excludedCategories: [],
    pantryHistory: [
      {
        productId: 1,
        productName: "Leche",
        quantity: 2,
        status: "Nuevo",
        period: "2026-04",
      },
      {
        productId: 1,
        productName: "Leche",
        quantity: 2,
        status: "Comezado",
        period: "2026-04",
      },
      {
        productId: 1,
        productName: "Leche",
        quantity: 2,
        status: "Terminado",
        period: "2026-05",
      },
    ],
  };
  const result = eng.predict(ctx);
  assertEquals(result.length, 1);
  const leche = result[0];
  assertEquals(leche.productName, "Leche");
  assertEquals(leche.monthlyConsumptionRate > 0, true);
});

Deno.test("MermaRiskEngine: all Merma returns risk 1.0", () => {
  let ver = 0;
  const eng = new MermaRiskEngine(() => ver);
  const ctx: UserContext = {
    userId: "t",
    analysisStartDate: "",
    analysisEndDate: "",
    monthlyBudget: 0,
    preferredStoreIds: [],
    excludedCategories: [],
    pantryHistory: [
      {
        productId: 1,
        productName: "Yogurt",
        quantity: 1,
        status: "Merma",
        period: "2026-04",
      },
      {
        productId: 1,
        productName: "Yogurt",
        quantity: 1,
        status: "Merma",
        period: "2026-05",
      },
    ],
  };
  const result = eng.predict(ctx);
  assertEquals(result.length, 1);
  assertEquals(result[0].mermaRisk, 1);
});

Deno.test("MermaRiskEngine: all Terminado returns risk 0", () => {
  let ver = 0;
  const eng = new MermaRiskEngine(() => ver);
  const ctx: UserContext = {
    userId: "t",
    analysisStartDate: "",
    analysisEndDate: "",
    monthlyBudget: 0,
    preferredStoreIds: [],
    excludedCategories: [],
    pantryHistory: [
      {
        productId: 2,
        productName: "Pan",
        quantity: 1,
        status: "Terminado",
        period: "2026-04",
      },
    ],
  };
  const result = eng.predict(ctx);
  assertEquals(result.length, 1);
  assertEquals(result[0].mermaRisk, 0);
});

Deno.test("MermaRiskEngine: mixed returns correct ratio", () => {
  let ver = 0;
  const eng = new MermaRiskEngine(() => ver);
  const ctx: UserContext = {
    userId: "t",
    analysisStartDate: "",
    analysisEndDate: "",
    monthlyBudget: 0,
    preferredStoreIds: [],
    excludedCategories: [],
    pantryHistory: [
      {
        productId: 3,
        productName: "Queso",
        quantity: 1,
        status: "Merma",
        period: "2026-01",
      },
      {
        productId: 3,
        productName: "Queso",
        quantity: 1,
        status: "Terminado",
        period: "2026-02",
      },
      {
        productId: 3,
        productName: "Queso",
        quantity: 1,
        status: "Merma",
        period: "2026-03",
      },
    ],
  };
  const result = eng.predict(ctx);
  assertEquals(result.length, 1);
  assertEquals(result[0].mermaRisk, 0.67);
  assertEquals(result[0].sampleSize, 3);
});

Deno.test("ReorderEngine: no stock returns []", () => {
  const eng = new ReorderEngine(() => 0, () => 0);
  const ctx: UserContext = {
    userId: "t",
    analysisStartDate: "",
    analysisEndDate: "",
    monthlyBudget: 0,
    preferredStoreIds: [],
    excludedCategories: [],
  };
  assertEquals(eng.predict(ctx, [], []), []);
});

Deno.test("ReorderEngine: high urgency for low stock high consumption", () => {
  const eng = new ReorderEngine(() => 0, () => 0);
  const ctx: UserContext = {
    userId: "t",
    analysisStartDate: "",
    analysisEndDate: "",
    monthlyBudget: 0,
    preferredStoreIds: [],
    excludedCategories: [],
    pantryCurrentStock: [
      { productId: 1, productName: "Leche", quantity: 1, unit: "Litro" },
    ],
  };
  const result = eng.predict(ctx, [
    {
      productId: 1,
      productName: "Leche",
      monthlyConsumptionRate: 4,
      estimatedDaysToEmpty: 7,
      avgDaysInStatus: {},
      confidence: 1,
    },
  ], []);
  assertEquals(result.length, 1);
  assertEquals(result[0].reorderUrgency, "HIGH");
  assertEquals(result[0].suggestedQuantity > 0, true);
});

Deno.test("ReorderEngine: skips LOW urgency", () => {
  const eng = new ReorderEngine(() => 0, () => 0);
  const ctx: UserContext = {
    userId: "t",
    analysisStartDate: "",
    analysisEndDate: "",
    monthlyBudget: 0,
    preferredStoreIds: [],
    excludedCategories: [],
    pantryCurrentStock: [
      { productId: 2, productName: "Arroz", quantity: 20, unit: "Kg" },
    ],
  };
  const result = eng.predict(ctx, [
    {
      productId: 2,
      productName: "Arroz",
      monthlyConsumptionRate: 0.5,
      estimatedDaysToEmpty: 1200,
      avgDaysInStatus: {},
      confidence: 1,
    },
  ], []);
  assertEquals(result.length, 0);
});
