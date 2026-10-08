import { and, desc, eq, lt } from "drizzle-orm";
import type { Meal, MealItemIn } from "../shared/api-types";
import { getDb } from "./db";
import { mealLogs } from "./db/schema";

type MealRow = typeof mealLogs.$inferSelect;

export function toMeal(row: MealRow): Meal {
  return {
    id: row.id,
    dish_name_th: row.dishNameTh,
    dish_name_en: row.dishNameEn,
    portion_grams: row.portionGrams,
    kcal_low: row.kcalLow,
    kcal_high: row.kcalHigh,
    edited: row.edited,
    source: row.source as Meal["source"],
    created_at: row.createdAt.toISOString(),
  };
}

export async function createMeals(userId: string, items: MealItemIn[], now = new Date()): Promise<Meal[]> {
  // Each row gets a distinct created_at (1 ms apart, first dish newest) so the
  // `before` cursor of the list endpoint never splits rows that share a timestamp.
  const rows = await getDb()
    .insert(mealLogs)
    .values(
      items.map((item, i) => ({
        userId,
        dishNameTh: item.dish_name_th,
        dishNameEn: item.dish_name_en ?? null,
        portionGrams: item.portion_grams,
        kcalLow: item.kcal_low,
        kcalHigh: item.kcal_high,
        edited: item.edited,
        source: item.source,
        createdAt: new Date(now.getTime() - i),
      })),
    )
    .returning();
  return rows.map(toMeal);
}

export async function listMeals(
  userId: string,
  limit: number,
  before?: Date,
): Promise<{ items: Meal[]; next_before: string | null }> {
  const rows = await getDb()
    .select()
    .from(mealLogs)
    .where(and(eq(mealLogs.userId, userId), before ? lt(mealLogs.createdAt, before) : undefined))
    .orderBy(desc(mealLogs.createdAt))
    .limit(limit + 1);
  const page = rows.slice(0, limit).map(toMeal);
  return { items: page, next_before: rows.length > limit ? page[page.length - 1].created_at : null };
}

export async function deleteMeal(userId: string, id: string): Promise<boolean> {
  const rows = await getDb()
    .delete(mealLogs)
    .where(and(eq(mealLogs.userId, userId), eq(mealLogs.id, id)))
    .returning({ id: mealLogs.id });
  return rows.length > 0;
}

export async function deleteAllMeals(userId: string): Promise<void> {
  await getDb().delete(mealLogs).where(eq(mealLogs.userId, userId));
}
