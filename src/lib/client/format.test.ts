import { describe, expect, it } from "vitest";
import { dayLabel, groupByDay } from "./format";

const now = new Date(2026, 9, 8, 15, 0);

describe("history day grouping", () => {
  it("labels today and yesterday", () => {
    expect(dayLabel(new Date(2026, 9, 8, 12, 30).toISOString(), now)).toBe("วันนี้");
    expect(dayLabel(new Date(2026, 9, 7, 23, 59).toISOString(), now)).toBe("เมื่อวาน");
  });

  it("groups consecutive rows of the same day", () => {
    const rows = [
      { created_at: new Date(2026, 9, 8, 12, 30).toISOString() },
      { created_at: new Date(2026, 9, 8, 8, 0).toISOString() },
      { created_at: new Date(2026, 9, 7, 8, 10).toISOString() },
    ];
    expect(groupByDay(rows, now).map((g) => [g.label, g.items.length])).toEqual([
      ["วันนี้", 2],
      ["เมื่อวาน", 1],
    ]);
  });
});
