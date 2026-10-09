import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getConfig } from "../config";
import * as schema from "./schema";

function createDb() {
  // prepare:false keeps it working behind a transaction-mode pooler (Neon, Vercel Marketplace)
  const client = postgres(getConfig().databaseUrl, { prepare: false, max: 5 });
  return drizzle(client, { schema });
}

export type Db = ReturnType<typeof createDb>;

let db: Db | undefined;

export function getDb(): Db {
  db ??= createDb();
  return db;
}
