import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { ConsentStatus } from "../shared/api-types";
import { getDb, type Db } from "./db";
import { consentRecords } from "./db/schema";

type ConsentRow = typeof consentRecords.$inferSelect;

// `latest` is the user's most recent record, or undefined when none exists.
export function toConsentStatus(latest: ConsentRow | undefined, requiredVersion: string): ConsentStatus {
  return {
    required_version: requiredVersion,
    active: latest !== undefined && latest.withdrawnAt === null &&
      latest.supersededAt === null &&
      latest.version === requiredVersion,
    version: latest?.version ?? null,
    consented_at: latest?.consentedAt.toISOString() ?? null,
    withdrawn_at: latest?.withdrawnAt?.toISOString() ?? null,
  };
}

const openRecord = (userId: string) =>
  and(eq(consentRecords.userId, userId), isNull(consentRecords.withdrawnAt), isNull(consentRecords.supersededAt));

async function latestRecord(userId: string, db: Pick<Db, "select"> = getDb()): Promise<ConsentRow | undefined> {
  const [row] = await db
    .select()
    .from(consentRecords)
    .where(eq(consentRecords.userId, userId))
    .orderBy(desc(consentRecords.consentedAt))
    .limit(1);
  return row;
}

export async function getConsentStatus(userId: string, requiredVersion: string): Promise<ConsentStatus> {
  return toConsentStatus(await latestRecord(userId), requiredVersion);
}

export async function recordConsent(
  userId: string,
  requiredVersion: string,
): Promise<{ status: ConsentStatus; created: boolean }> {
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}::text))`);
    const latest = await latestRecord(userId, tx);
    if (latest?.withdrawnAt === null && latest.supersededAt === null && latest.version === requiredVersion) {
      return { status: toConsentStatus(latest, requiredVersion), created: false };
    }
    // One open record per user: an open record for an older version is marked superseded, not withdrawn.
    await tx
      .update(consentRecords)
      .set({ supersededAt: new Date() })
      .where(openRecord(userId));
    const [row] = await tx
      .insert(consentRecords)
      .values({ userId, version: requiredVersion })
      .returning();
    return { status: toConsentStatus(row, requiredVersion), created: true };
  });
}

export async function withdrawConsent(userId: string, requiredVersion: string): Promise<ConsentStatus> {
  await getDb()
    .update(consentRecords)
    .set({ withdrawnAt: new Date() })
    .where(openRecord(userId));
  return getConsentStatus(userId, requiredVersion);
}
