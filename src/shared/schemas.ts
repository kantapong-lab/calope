import { z } from "zod";
import type { AnalysisResult, Dish, MealItemIn } from "./api-types";

export const DishSchema: z.ZodType<Dish> = z
  .object({
    name_th: z.string().min(1).max(120),
    name_en: z.string().min(1).max(120),
    grams: z.number().int().min(1).max(5000),
    kcal_low: z.number().int().min(0).max(5000),
    kcal_high: z.number().int().min(0).max(5000),
    confidence: z.number().min(0).max(1),
    assumptions: z.array(z.string().min(1).max(160)).max(6),
  })
  .refine((d) => d.kcal_high >= d.kcal_low, {
    path: ["kcal_high"],
    message: "kcal_high must be >= kcal_low",
  });

export const AnalysisResultSchema: z.ZodType<AnalysisResult> = z.union([
  z.object({
    is_food: z.literal(true),
    dishes: z.array(DishSchema).min(1).max(10),
  }),
  z.object({ is_food: z.literal(false), dishes: z.tuple([]) }),
]);

const mealItemFields = {
  dish_name_th: z.string().min(1).max(120),
  dish_name_en: z.string().max(120).nullish(),
  portion_grams: z.number().int().min(1).max(5000),
  kcal_low: z.number().int().min(0).max(5000),
  kcal_high: z.number().int().min(0).max(5000),
  edited: z.boolean(),
  source: z.enum(["ai", "manual"]),
};

export const MealItemInSchema: z.ZodType<MealItemIn> = z
  .object(mealItemFields)
  .refine((m) => m.kcal_high >= m.kcal_low, {
    path: ["kcal_high"],
    message: "kcal_high must be >= kcal_low",
  })
  .refine((m) => m.source !== "manual" || !m.edited, {
    path: ["edited"],
    message: "manual items cannot be edited",
  });

export const MealsCreateSchema = z.object({
  items: z.array(MealItemInSchema).min(1).max(10),
});

export const ConsentPostSchema = z.object({
  version: z.string().min(1).max(64),
  accepted: z.literal(true),
});

export const MealsListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  before: z.iso.datetime({ offset: true }).optional(),
});

export const AnalyzeFieldsSchema = z
  .object({
    dish_hint: z.string().min(1).max(80).optional(),
    dish_index: z.coerce.number().int().min(0).max(9).optional(),
  })
  .refine((f) => f.dish_index === undefined || f.dish_hint !== undefined, {
    path: ["dish_index"],
    message: "dish_index requires dish_hint",
  });

// Provider-side schema: structure only. Bounds are enforced by AnalysisResultSchema.
export const providerOutputJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["is_food", "dishes"],
  properties: {
    is_food: { type: "boolean" },
    dishes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "name_th",
          "name_en",
          "grams",
          "kcal_low",
          "kcal_high",
          "confidence",
          "assumptions",
        ],
        properties: {
          name_th: { type: "string" },
          name_en: { type: "string" },
          grams: { type: "integer" },
          kcal_low: { type: "integer" },
          kcal_high: { type: "integer" },
          confidence: { type: "number" },
          assumptions: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
} as const;
