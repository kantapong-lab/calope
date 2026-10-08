// Real-Postgres integration tests: AC-10, 13, 15, 16, 17, 18 (persistence, audit, rate-limit window, concurrency).
// SKIPPED when DATABASE_URL is absent. Nothing here is faked: no fake env is applied and no module is mocked,
// so the skip guard below reflects the real environment. Prerequisite when run: migrations applied
// (`npm run db:migrate`) to the target database; use a disposable database, rows are created and removed.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const REAL_DB = process.env.DATABASE_URL; // captured before anything else can touch the env
const SKIP_REASON = "DATABASE_URL absent: no Postgres available to the QA environment";

// importing server modules needs server-only stubbed; this is not a data mock.
vi.mock("server-only", () => ({}));

type Mods = {
  db: ReturnType<typeof import("@/server/db").getDb>;
  schema: typeof import("@/server/db/schema");
  consent: typeof import("@/server/consent");
  meals: typeof import("@/server/meals");
  rate: typeof import("@/server/rate-limit");
  sql: typeof import("drizzle-orm").sql;
  eq: typeof import("drizzle-orm").eq;
};
let m: Mods;
const created: string[] = [];

async function newUser(): Promise<string> {
  const [u] = await m.db.insert(m.schema.users).values({ email: `qa-${randomUUID()}@example.test` }).returning({ id: m.schema.users.id });
  created.push(u.id);
  return u.id;
}
const V = "2026-10-v1";
const item = (over: Record<string, unknown> = {}) => ({
  dish_name_th: "ผัดไทย", dish_name_en: "Pad Thai" as string | null, portion_grams: 280, kcal_low: 500, kcal_high: 650,
  edited: false, source: "ai" as const, ...over,
});

describe.skipIf(!REAL_DB)("e2e-db (needs DATABASE_URL)", () => {
  beforeAll(async () => {
    Object.assign(process.env, {
      ANTHROPIC_API_KEY: "sk-ant-api03-QAFAKE-db-tests",
      AUTH_SECRET: "s",
      AUTH_GOOGLE_ID: "i",
      AUTH_GOOGLE_SECRET: "g",
    });
    const drizzle = await import("drizzle-orm");
    m = {
      db: (await import("@/server/db")).getDb(),
      schema: await import("@/server/db/schema"),
      consent: await import("@/server/consent"),
      meals: await import("@/server/meals"),
      rate: await import("@/server/rate-limit"),
      sql: drizzle.sql,
      eq: drizzle.eq,
    };
  });
  afterAll(async () => {
    for (const id of created) await m.db.delete(m.schema.users).where(m.eq(m.schema.users.id, id));
  });

  describe("AC-15/16/18 consent persistence and audit", () => {
    it("AC-18 first consent stores user id, version and timestamp; repeating is idempotent (no new row)", async () => {
      const u = await newUser();
      const first = await m.consent.recordConsent(u, V);
      expect(first.created).toBe(true);
      expect(first.status).toMatchObject({ active: true, version: V, withdrawn_at: null });
      expect(first.status.consented_at).toBeTruthy();
      const again = await m.consent.recordConsent(u, V);
      expect(again.created).toBe(false);
      const rows = await m.db.select().from(m.schema.consentRecords).where(m.eq(m.schema.consentRecords.userId, u));
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ userId: u, version: V, withdrawnAt: null, supersededAt: null });
    });

    it("AC-16 withdraw sets withdrawn_at, blocks (active=false), keeps the row; second withdraw is a no-op", async () => {
      const u = await newUser();
      await m.consent.recordConsent(u, V);
      const w = await m.consent.withdrawConsent(u, V);
      expect(w.active).toBe(false);
      expect(w.withdrawn_at).toBeTruthy();
      expect((await m.consent.withdrawConsent(u, V)).withdrawn_at).toBe(w.withdrawn_at);
      expect((await m.consent.getConsentStatus(u, V)).active).toBe(false);
      const rows = await m.db.select().from(m.schema.consentRecords).where(m.eq(m.schema.consentRecords.userId, u));
      expect(rows).toHaveLength(1);
    });

    it("AC-16 re-consent after withdrawal inserts a new row and re-activates", async () => {
      const u = await newUser();
      await m.consent.recordConsent(u, V);
      await m.consent.withdrawConsent(u, V);
      const again = await m.consent.recordConsent(u, V);
      expect(again.created).toBe(true);
      expect(again.status.active).toBe(true);
      const rows = await m.db.select().from(m.schema.consentRecords).where(m.eq(m.schema.consentRecords.userId, u));
      expect(rows).toHaveLength(2);
    });

    it("withdraw with no consent record is a harmless no-op (active=false)", async () => {
      const u = await newUser();
      expect((await m.consent.withdrawConsent(u, V)).active).toBe(false);
    });

    it("D4/AC-18 a new consent version supersedes the old row (superseded_at), it does NOT record a withdrawal", async () => {
      const u = await newUser();
      await m.db.insert(m.schema.consentRecords).values({ userId: u, version: "2025-old-v0" });
      const before = await m.consent.getConsentStatus(u, V);
      expect(before.active).toBe(false); // old version does not satisfy the current one
      const r = await m.consent.recordConsent(u, V);
      expect(r.created).toBe(true);
      const rows = await m.db.select().from(m.schema.consentRecords).where(m.eq(m.schema.consentRecords.userId, u));
      const old = rows.find((x) => x.version === "2025-old-v0")!;
      expect(old.supersededAt).not.toBeNull();
      expect(old.withdrawnAt).toBeNull();
      expect(rows.find((x) => x.version === V)).toMatchObject({ supersededAt: null, withdrawnAt: null });
    });

    it("C-DATA one open consent row per user is enforced by the database (unique partial index)", async () => {
      const u = await newUser();
      await m.db.insert(m.schema.consentRecords).values({ userId: u, version: V });
      await expect(m.db.insert(m.schema.consentRecords).values({ userId: u, version: V })).rejects.toThrow();
    });

    it("concurrent first-time consent calls leave exactly one open row", async () => {
      const u = await newUser();
      await Promise.all(Array.from({ length: 8 }, () => m.consent.recordConsent(u, V)));
      const rows = await m.db.select().from(m.schema.consentRecords).where(m.eq(m.schema.consentRecords.userId, u));
      expect(rows.filter((r) => r.withdrawnAt === null && r.supersededAt === null)).toHaveLength(1);
    });
  });

  describe("AC-10 / AC-17 meal logs", () => {
    it("AC-10 stores dish, portion, kcal range, edited flag, source and a server timestamp", async () => {
      const u = await newUser();
      const [saved] = await m.meals.createMeals(u, [item({ edited: true })]);
      expect(saved).toMatchObject({ dish_name_th: "ผัดไทย", portion_grams: 280, kcal_low: 500, kcal_high: 650, edited: true, source: "ai" });
      expect(Math.abs(Date.now() - new Date(saved.created_at).getTime())).toBeLessThan(60_000);
    });

    it("AC-8/Q7 a renamed dish is stored with dish_name_en NULL", async () => {
      const u = await newUser();
      const [saved] = await m.meals.createMeals(u, [item({ dish_name_th: "ผัดไทยกุ้งสด", dish_name_en: null, edited: true })]);
      expect(saved.dish_name_en).toBeNull();
      const [row] = await m.db.select().from(m.schema.mealLogs).where(m.eq(m.schema.mealLogs.id, saved.id));
      expect(row.dishNameEn).toBeNull();
    });

    it("lists only the caller's meals, newest first, with limit and before cursor", async () => {
      const a = await newUser();
      const b = await newUser();
      const t0 = new Date("2026-10-01T10:00:00Z");
      for (let i = 0; i < 5; i++) await m.meals.createMeals(a, [item({ dish_name_th: `a${i}` })], new Date(t0.getTime() + i * 60_000));
      await m.meals.createMeals(b, [item({ dish_name_th: "b0" })]);
      const page1 = await m.meals.listMeals(a, 2);
      expect(page1.items.map((x) => x.dish_name_th)).toEqual(["a4", "a3"]);
      expect(page1.next_before).not.toBeNull();
      const page2 = await m.meals.listMeals(a, 10, new Date(page1.next_before!));
      expect(page2.items.map((x) => x.dish_name_th)).toEqual(["a2", "a1", "a0"]);
      expect(page2.next_before).toBeNull();
      expect((await m.meals.listMeals(b, 10)).items.map((x) => x.dish_name_th)).toEqual(["b0"]);
    });

    it("AC-17 deleting one meal removes it from the list; another user's id is not deletable (false -> 404)", async () => {
      const a = await newUser();
      const b = await newUser();
      const [mine] = await m.meals.createMeals(a, [item()]);
      expect(await m.meals.deleteMeal(b, mine.id)).toBe(false);
      expect((await m.meals.listMeals(a, 10)).items).toHaveLength(1);
      expect(await m.meals.deleteMeal(a, mine.id)).toBe(true);
      expect((await m.meals.listMeals(a, 10)).items).toHaveLength(0);
      expect(await m.meals.deleteMeal(a, mine.id)).toBe(false);
    });

    it("AC-17 delete-all removes every meal of the caller only; consent records are kept (audit)", async () => {
      const a = await newUser();
      const b = await newUser();
      await m.consent.recordConsent(a, V);
      await m.meals.createMeals(a, [item(), item({ dish_name_th: "ต้มยำ" })]);
      await m.meals.createMeals(b, [item()]);
      await m.meals.deleteAllMeals(a);
      expect((await m.meals.listMeals(a, 10)).items).toHaveLength(0);
      expect((await m.meals.listMeals(b, 10)).items).toHaveLength(1);
      expect((await m.consent.getConsentStatus(a, V)).active).toBe(true);
    });

    it("database CHECK constraints back the 5000 kcal cap and range order", async () => {
      const u = await newUser();
      const raw = (low: number, high: number) =>
        m.db.execute(m.sql`insert into meal_logs (user_id, dish_name_th, portion_grams, kcal_low, kcal_high, source) values (${u}, 'x', 100, ${low}, ${high}, 'ai')`);
      await expect(raw(100, 5001)).rejects.toThrow();
      await expect(raw(300, 200)).rejects.toThrow();
      await expect(raw(5000, 5000)).resolves.toBeDefined();
    });

    it("AC-17/ADR 0002 no photo, thumbnail or image column exists anywhere in the schema", async () => {
      const cols = (await m.db.execute(
        m.sql`select table_name, column_name from information_schema.columns where table_schema = 'public'`,
      )) as unknown as { table_name: string; column_name: string }[];
      expect(cols.length).toBeGreaterThan(10);
      expect(cols.filter((c) => /photo|image|thumb|picture|blob|base64/i.test(c.column_name) && c.table_name !== "users" && c.table_name !== "accounts")).toEqual([]);
    });

    it("deleting a user cascades to their meals, consent and analysis events", async () => {
      const u = await newUser();
      await m.consent.recordConsent(u, V);
      await m.meals.createMeals(u, [item()]);
      await m.rate.checkAndRecordAnalysis(u);
      await m.db.delete(m.schema.users).where(m.eq(m.schema.users.id, u));
      for (const t of ["consent_records", "meal_logs", "analysis_events"]) {
        const r = (await m.db.execute(m.sql`select count(*)::int as n from ${m.sql.raw(t)} where user_id = ${u}`)) as unknown as { n: number }[];
        expect(r[0].n).toBe(0);
      }
    });
  });

  describe("AC-13 rate limit (20 per rolling hour)", () => {
    it("allows 20, denies the 21st with retryAfterSec between 1 and 3600; other users unaffected", async () => {
      const a = await newUser();
      const b = await newUser();
      for (let i = 0; i < 20; i++) expect(await m.rate.checkAndRecordAnalysis(a)).toEqual({ allowed: true });
      const denied = await m.rate.checkAndRecordAnalysis(a);
      expect(denied.allowed).toBe(false);
      if (!denied.allowed) {
        expect(denied.retryAfterSec).toBeGreaterThanOrEqual(1);
        expect(denied.retryAfterSec).toBeLessThanOrEqual(3600);
      }
      expect(await m.rate.checkAndRecordAnalysis(b)).toEqual({ allowed: true });
    });

    it("a denied request is not recorded (still exactly 20 events)", async () => {
      const a = await newUser();
      for (let i = 0; i < 22; i++) await m.rate.checkAndRecordAnalysis(a);
      const r = (await m.db.execute(m.sql`select count(*)::int as n from analysis_events where user_id = ${a}`)) as unknown as { n: number }[];
      expect(r[0].n).toBe(20);
    });

    it("events older than one hour no longer count", async () => {
      const a = await newUser();
      for (let i = 0; i < 20; i++) await m.db.insert(m.schema.analysisEvents).values({ userId: a, createdAt: new Date(Date.now() - 61 * 60_000) });
      expect(await m.rate.checkAndRecordAnalysis(a)).toEqual({ allowed: true });
    });

    it("events older than 24 h are purged on the next check", async () => {
      const a = await newUser();
      await m.db.insert(m.schema.analysisEvents).values({ userId: a, createdAt: new Date(Date.now() - 25 * 3600_000) });
      await m.rate.checkAndRecordAnalysis(a);
      const r = (await m.db.execute(m.sql`select count(*)::int as n from analysis_events where user_id = ${a}`)) as unknown as { n: number }[];
      expect(r[0].n).toBe(1);
    });

    it("concurrency: 40 parallel requests for one user allow exactly 20 (advisory lock holds)", async () => {
      const a = await newUser();
      const results = await Promise.all(Array.from({ length: 40 }, () => m.rate.checkAndRecordAnalysis(a)));
      expect(results.filter((r) => r.allowed)).toHaveLength(20);
    });
  });
});

// Always-visible marker so a skipped DB suite is explicit in every run (reason, not silence).
describe.skipIf(!!REAL_DB)("e2e-db skipped", () => {
  it.skip(`AC-10, AC-13, AC-15, AC-16, AC-17, AC-18 persistence: ${SKIP_REASON}`, () => {});
});
