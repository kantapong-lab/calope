import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// users and accounts follow the Auth.js Drizzle adapter shape (JWT sessions: no sessions table).
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { withTimezone: true }),
  image: text("image"),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const consentRecords = pgTable(
  "consent_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    version: text("version").notNull(),
    consentedAt: timestamp("consented_at", { withTimezone: true }).notNull().defaultNow(),
    withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("consent_one_active_per_user")
      .on(t.userId)
      .where(sql`${t.withdrawnAt} is null`),
  ],
);

export const mealLogs = pgTable(
  "meal_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    dishNameTh: text("dish_name_th").notNull(),
    dishNameEn: text("dish_name_en"),
    portionGrams: integer("portion_grams").notNull(),
    kcalLow: integer("kcal_low").notNull(),
    kcalHigh: integer("kcal_high").notNull(),
    edited: boolean("edited").notNull().default(false),
    source: text("source").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("meal_logs_portion_grams_check", sql`${t.portionGrams} between 1 and 5000`),
    check("meal_logs_kcal_low_check", sql`${t.kcalLow} between 0 and 5000`),
    check("meal_logs_kcal_high_check", sql`${t.kcalHigh} between ${t.kcalLow} and 5000`),
    check("meal_logs_source_check", sql`${t.source} in ('ai','manual')`),
    index("meal_logs_user_created").on(t.userId, t.createdAt.desc()),
  ],
);

export const analysisEvents = pgTable(
  "analysis_events",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("analysis_events_user_created").on(t.userId, t.createdAt)],
);
