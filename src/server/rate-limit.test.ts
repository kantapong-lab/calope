import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { decideWindow } = await import("./rate-limit");

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
