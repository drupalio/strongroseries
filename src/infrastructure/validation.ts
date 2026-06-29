import { z } from "zod";

export const StoreSchema = z.object({
  id: z.number().nullable().default(null),
  name: z.string().min(1, "nombre no puede estar vacío").max(100),
  color: z.string(),
});

export const ProductSchema = z.object({
  id: z.number().nullable().default(null),
  storeId: z.number({ message: "tienda no puede ser nulo" }),
  storeName: z.string().default(""),
  name: z.string().min(1, "nombre no puede estar vacío").max(255),
  unit: z.string().min(1, "unidad no puede estar vacío"),
  productType: z.string().min(1, "tipo de producto no puede estar vacío"),
  category: z.string().min(1, "categoría no puede estar vacío"),
  currentPrice: z.number({ message: "precio no puede estar vacío" }),
});

export const GroceryListSchema = z.object({
  id: z.number().nullable().default(null),
  storeId: z.number({ message: "tienda no puede ser nulo" }),
  storeName: z.string().default(""),
  name: z.string().min(1, "nombre no puede estar vacío"),
  month: z.string().min(1, "mes no puede ser nulo"),
  completed: z.boolean().default(false),
  itemCount: z.number().default(0),
  estimatedTotal: z.number().default(0),
});

export const BudgetSchema = z.object({
  period: z.string().default(""),
  year: z.number(),
  month: z.number().min(1).max(12),
  estimatedBudget: z.number().default(0),
  actualSpent: z.number().default(0),
  difference: z.number().default(0),
});

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map((i) =>
      `${i.path.join(".")}: ${i.message}`
    );
    throw new ValidationError(errors);
  }
  return result.data;
}

export class ValidationError extends Error {
  errors: string[];
  constructor(errors: string[]) {
    super(errors.join(", "));
    this.name = "ValidationError";
    this.errors = errors;
  }
}
