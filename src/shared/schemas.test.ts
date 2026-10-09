import { describe, expect, it } from "vitest";
import {
  AnalysisResultSchema,
  AnalyzeFieldsSchema,
  ConsentPostSchema,
  MealItemInSchema,
  MealsCreateSchema,
  MealsListQuerySchema,
} from "./schemas";

const dish = {
  name_th: "ข้าวมันไก่",
  name_en: "Hainanese chicken rice",
  grams: 350,
  kcal_low: 550,
  kcal_high: 700,
  confidence: 0.8,
  assumptions: ["ใช้น้ำมันไก่ปานกลาง"],
};

describe("AnalysisResultSchema", () => {
  it("accepts a food result with one dish", () => {
    expect(AnalysisResultSchema.safeParse({ is_food: true, dishes: [dish] }).success).toBe(true);
  });

  it("accepts a non-food result with no dishes", () => {
    expect(AnalysisResultSchema.safeParse({ is_food: false, dishes: [] }).success).toBe(true);
  });

  it("rejects is_food=true with zero dishes", () => {
    expect(AnalysisResultSchema.safeParse({ is_food: true, dishes: [] }).success).toBe(false);
  });

  it("rejects is_food=false with dishes", () => {
    expect(AnalysisResultSchema.safeParse({ is_food: false, dishes: [dish] }).success).toBe(false);
  });

  it("rejects kcal_high below kcal_low", () => {
    const bad = { ...dish, kcal_low: 700, kcal_high: 550 };
    expect(AnalysisResultSchema.safeParse({ is_food: true, dishes: [bad] }).success).toBe(false);
  });

  it.each([
    ["grams 0", { grams: 0 }],
    ["grams above 5000", { grams: 5001 }],
    ["fractional grams", { grams: 10.5 }],
    ["kcal above 5000", { kcal_high: 5001 }],
    ["confidence above 1", { confidence: 1.1 }],
    ["empty Thai name", { name_th: "" }],
    ["7 assumptions", { assumptions: Array(7).fill("x") }],
  ])("rejects a dish with %s", (_label, patch) => {
    expect(AnalysisResultSchema.safeParse({ is_food: true, dishes: [{ ...dish, ...patch }] }).success).toBe(false);
  });

  it("rejects more than 10 dishes", () => {
    expect(AnalysisResultSchema.safeParse({ is_food: true, dishes: Array(11).fill(dish) }).success).toBe(false);
  });
});

describe("MealItemInSchema", () => {
  const item = {
    dish_name_th: "ผัดกะเพรา",
    portion_grams: 300,
    kcal_low: 500,
    kcal_high: 600,
    edited: false,
    source: "ai",
  };

  it("accepts an ai item without dish_name_en", () => {
    expect(MealItemInSchema.safeParse(item).success).toBe(true);
  });

  it("accepts a manual item with equal low and high", () => {
    const manual = { ...item, source: "manual", kcal_low: 450, kcal_high: 450 };
    expect(MealItemInSchema.safeParse(manual).success).toBe(true);
  });

  it("rejects a manual item flagged edited", () => {
    expect(MealItemInSchema.safeParse({ ...item, source: "manual", edited: true }).success).toBe(false);
  });

  it("rejects kcal_high below kcal_low", () => {
    expect(MealItemInSchema.safeParse({ ...item, kcal_low: 600, kcal_high: 500 }).success).toBe(false);
  });

  it("rejects an unknown source", () => {
    expect(MealItemInSchema.safeParse({ ...item, source: "photo" }).success).toBe(false);
  });
});

describe("MealsCreateSchema", () => {
  const item = {
    dish_name_th: "ส้มตำ",
    portion_grams: 200,
    kcal_low: 100,
    kcal_high: 150,
    edited: true,
    source: "ai",
  };

  it("rejects an empty items list", () => {
    expect(MealsCreateSchema.safeParse({ items: [] }).success).toBe(false);
  });

  it("rejects more than 10 items", () => {
    expect(MealsCreateSchema.safeParse({ items: Array(11).fill(item) }).success).toBe(false);
  });
});

describe("ConsentPostSchema", () => {
  it("requires accepted to be literally true", () => {
    expect(ConsentPostSchema.safeParse({ version: "v1", accepted: true }).success).toBe(true);
    expect(ConsentPostSchema.safeParse({ version: "v1", accepted: "true" }).success).toBe(false);
    expect(ConsentPostSchema.safeParse({ version: "v1", accepted: false }).success).toBe(false);
  });
});

describe("MealsListQuerySchema", () => {
  it("defaults limit to 20", () => {
    expect(MealsListQuerySchema.parse({}).limit).toBe(20);
  });

  it("rejects limit 0 and 51", () => {
    expect(MealsListQuerySchema.safeParse({ limit: "0" }).success).toBe(false);
    expect(MealsListQuerySchema.safeParse({ limit: "51" }).success).toBe(false);
  });

  it("rejects a before value that is not an ISO date", () => {
    expect(MealsListQuerySchema.safeParse({ before: "yesterday" }).success).toBe(false);
    expect(MealsListQuerySchema.safeParse({ before: "2026-10-08T10:00:00.000Z" }).success).toBe(true);
  });
});

describe("AnalyzeFieldsSchema", () => {
  it("accepts no fields", () => {
    expect(AnalyzeFieldsSchema.safeParse({}).success).toBe(true);
  });

  it("accepts dish_hint with dish_index", () => {
    const parsed = AnalyzeFieldsSchema.parse({ dish_hint: "ต้มยำ", dish_index: "2" });
    expect(parsed.dish_index).toBe(2);
  });

  it("rejects dish_index without dish_hint", () => {
    expect(AnalyzeFieldsSchema.safeParse({ dish_index: "1" }).success).toBe(false);
  });

  it("rejects dish_index above 9 and hint above 80 chars", () => {
    expect(AnalyzeFieldsSchema.safeParse({ dish_hint: "a", dish_index: "10" }).success).toBe(false);
    expect(AnalyzeFieldsSchema.safeParse({ dish_hint: "a".repeat(81) }).success).toBe(false);
  });
});
