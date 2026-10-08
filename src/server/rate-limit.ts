import { and, asc, eq, gt, lt, sql } from "drizzle-orm";
import { getConfig } from "./config";
import { getDb } from "./db";
import { analysisEvents } from "./db/schema";

const WINDOW_MS = 60 * 60 * 1000;
const RETENTION_MS = 24 * WINDOW_MS;

export type WindowDecision = { allowed: true } | { allowed: false; retryAfterSec: number };

// `recent` are the user's event times inside the window, any order.
export function decideWindow(recent: Date[], now: Date, limit: number): WindowDecision {
  if (recent.length < limit) return { allowed: true };
  const oldest = Math.min(...recent.map((d) => d.getTime()));
  const retryAfterSec = Math.max(1, Math.ceil((oldest + WINDOW_MS - now.getTime()) / 1000));
  return { allowed: false, retryAfterSec };
}

export async function checkAndRecordAnalysis(userId: string, now = new Date()): Promise<WindowDecision> {
  const limit = getConfig().analyzeRateLimitPerHour;
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}::text))`);
    await tx
      .delete(analysisEvents)
      .where(
        and(
          eq(analysisEvents.userId, userId),
          lt(analysisEvents.createdAt, new Date(now.getTime() - RETENTION_MS)),
        ),
      );
    const rows = await tx
      .select({ createdAt: analysisEvents.createdAt })
      .from(analysisEvents)
      .where(
        and(
          eq(analysisEvents.userId, userId),
          gt(analysisEvents.createdAt, new Date(now.getTime() - WINDOW_MS)),
        ),
      )
      .orderBy(asc(analysisEvents.createdAt));
    const decision = decideWindow(
      rows.map((r) => r.createdAt),
      now,
      limit,
    );
    if (decision.allowed) {
      await tx.insert(analysisEvents).values({ userId, createdAt: now });
    }
    return decision;
  });
}
