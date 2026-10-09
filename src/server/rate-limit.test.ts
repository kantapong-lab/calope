import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const calls: string[] = [];
let windowRows: { createdAt: Date }[] = [];
const fakeTx = {
  execute: async () => void calls.push("lock"),
  delete: () => ({ where: async () => void calls.push("delete-old") }),
  select: () => ({ from: () => ({ where: () => ({ orderBy: async () => (calls.push("count"), windowRows) }) }) }),
  insert: () => ({ values: async () => void calls.push("insert") }),
};
vi.mock("./db", () => ({ getDb: () => ({ transaction: async (fn: (tx: typeof fakeTx) => unknown) => fn(fakeTx) }) }));
vi.mock("./config", () => ({ getConfig: () => ({ analyzeRateLimitPerHour: 2 }) }));

const { decideWindow, checkAndRecordAnalysis } = await import("./rate-limit");

const now = new Date("2026-10-08T12:00:00.000Z");
const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000);

describe("decideWindow", () => {
  it("allows when fewer events than the limit are in the window", () => {
    expect(decideWindow(Array.from({ length: 19 }, () => minutesAgo(5)), now, 20)).toEqual({ allowed: true });
  });

  it("blocks at the limit", () => {
    const events = Array.from({ length: 20 }, () => minutesAgo(5));
    expect(decideWindow(events, now, 20).allowed).toBe(false);
  });

  it("reports seconds until the oldest counted event leaves the window", () => {
    const events = [minutesAgo(50), ...Array.from({ length: 19 }, () => minutesAgo(5))];
    expect(decideWindow(events, now, 20)).toEqual({ allowed: false, retryAfterSec: 10 * 60 });
  });

  it("does not depend on event order", () => {
    const events = [minutesAgo(5), minutesAgo(59), minutesAgo(30)];
    expect(decideWindow(events, now, 3)).toEqual({ allowed: false, retryAfterSec: 60 });
  });

  it("never returns a Retry-After below 1 second", () => {
    const almostExpired = new Date(now.getTime() - 60 * 60_000 + 200);
    expect(decideWindow([almostExpired], now, 1)).toEqual({ allowed: false, retryAfterSec: 1 });
  });

  it("honours a configured limit of 1", () => {
    expect(decideWindow([], now, 1)).toEqual({ allowed: true });
    expect(decideWindow([minutesAgo(1)], now, 1).allowed).toBe(false);
  });
});

// Gap: the advisory lock itself (two concurrent requests serialised by Postgres) cannot be exercised
// without a real Postgres; these tests only pin the order of operations inside the transaction.
describe("checkAndRecordAnalysis transaction", () => {
  it("takes the lock first, then prunes, counts and records an event under the limit", async () => {
    calls.length = 0;
    windowRows = [{ createdAt: minutesAgo(3) }];
    expect(await checkAndRecordAnalysis("user-1", now)).toEqual({ allowed: true });
    expect(calls).toEqual(["lock", "delete-old", "count", "insert"]);
  });

  it("does not record an event when the limit is reached", async () => {
    calls.length = 0;
    windowRows = [{ createdAt: minutesAgo(30) }, { createdAt: minutesAgo(3) }];
    expect(await checkAndRecordAnalysis("user-1", now)).toEqual({ allowed: false, retryAfterSec: 30 * 60 });
    expect(calls).toEqual(["lock", "delete-old", "count"]);
  });
});
