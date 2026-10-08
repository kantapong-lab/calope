import type { Dish, MealItemIn } from "@/shared/api-types";

export const GRAMS_MIN = 1;
export const GRAMS_MAX = 5000;
export const KCAL_MAX = 5000;

// A dish on screen: baseline is the numbers proportional recalc scales from (contract C-API-MEALS).
export type Item = Dish & {
  base: { grams: number; kcal_low: number; kcal_high: number };
  edited: boolean;
};

export type ConfidenceLevel = "high" | "medium" | "low";

export function confidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.75) return "high";
  if (confidence >= 0.5) return "medium";
  return "low";
}

export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

export function formatRange(low: number, high: number): string {
  return `${formatNumber(low)} - ${formatNumber(high)}`;
}

export function toItem(dish: Dish): Item {
  return {
    ...dish,
    base: { grams: dish.grams, kcal_low: dish.kcal_low, kcal_high: dish.kcal_high },
    edited: false,
  };
}

export function clampGrams(grams: number): number {
  return Math.min(GRAMS_MAX, Math.max(GRAMS_MIN, Math.round(grams)));
}

export function withGrams(item: Item, grams: number): Item {
  const next = clampGrams(grams);
  const scale = (kcal: number) => Math.round((kcal * next) / item.base.grams);
  return {
    ...item,
    grams: next,
    kcal_low: scale(item.base.kcal_low),
    kcal_high: scale(item.base.kcal_high),
    edited: true,
  };
}

export function withManualKcal(item: Item, kcal: number): Item {
  return {
    ...item,
    kcal_low: kcal,
    kcal_high: kcal,
    base: { grams: item.grams, kcal_low: kcal, kcal_high: kcal },
    edited: true,
  };
}

// Rename without re-estimate: numbers and name_en stay (AC-22); only name_th changes.
export function withRename(item: Item, name: string): Item {
  return { ...item, name_th: name, edited: true };
}

export function withReestimate(dish: Dish): Item {
  return { ...toItem(dish), edited: true };
}

export function totals(items: { kcal_low: number; kcal_high: number }[]) {
  return items.reduce(
    (sum, i) => ({ low: sum.low + i.kcal_low, high: sum.high + i.kcal_high }),
    { low: 0, high: 0 },
  );
}

export function toMealItem(item: Item): MealItemIn {
  return {
    dish_name_th: item.name_th,
    dish_name_en: item.name_en || null,
    portion_grams: item.grams,
    kcal_low: item.kcal_low,
    kcal_high: item.kcal_high,
    edited: item.edited,
    source: "ai",
  };
}

export function isIntInRange(n: number, min: number, max: number): boolean {
  return Number.isInteger(n) && n >= min && n <= max;
}
