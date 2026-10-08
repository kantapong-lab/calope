import { describe, expect, it } from "vitest";
import { clampGrams, confidenceLevel, formatRange, toItem, toMealItem, totals, withGrams, withManualKcal, withRename } from "./meal";

const dish = {
  name_th: "ข้าวกะเพราไก่ไข่ดาว",
  name_en: "Basil chicken rice with fried egg",
  grams: 350,
  kcal_low: 520,
  kcal_high: 680,
  confidence: 0.6,
  assumptions: ["น้ำมันพืชประมาณ 1 ช้อนโต๊ะ"],
};

describe("proportional recalc (AC-9)", () => {
  it("scales low and high by new grams over base grams", () => {
    const item = withGrams(toItem(dish), 525);
    expect(item.kcal_low).toBe(780);
    expect(item.kcal_high).toBe(1020);
    expect(item.edited).toBe(true);
  });

  it("always scales from the analysis baseline, not the previous edit", () => {
    const item = withGrams(withGrams(toItem(dish), 700), 350);
    expect([item.kcal_low, item.kcal_high]).toEqual([520, 680]);
  });

  it("clamps grams to 1..5000", () => {
    expect(clampGrams(0)).toBe(1);
    expect(clampGrams(9000)).toBe(5000);
  });

  it("manual kcal becomes the new baseline", () => {
    const item = withGrams(withManualKcal(toItem(dish), 400), 175);
    expect([item.kcal_low, item.kcal_high]).toEqual([200, 200]);
  });
});

describe("display rules", () => {
  it("formats a range with thousands separator, also when equal", () => {
    expect(formatRange(780, 1020)).toBe("780 - 1,020");
    expect(formatRange(200, 200)).toBe("200 - 200");
  });

  it("derives confidence level from thresholds", () => {
    expect(confidenceLevel(0.75)).toBe("high");
    expect(confidenceLevel(0.6)).toBe("medium");
    expect(confidenceLevel(0.49)).toBe("low");
  });

  it("sums totals", () => {
    expect(totals([{ kcal_low: 520, kcal_high: 680 }, { kcal_low: 60, kcal_high: 110 }])).toEqual({ low: 580, high: 790 });
  });
});

describe("save payload (AC-10)", () => {
  it("maps an edited AI dish", () => {
    const body = toMealItem(withGrams(toItem(dish), 175));
    expect(body).toMatchObject({ portion_grams: 175, kcal_low: 260, kcal_high: 340, edited: true, source: "ai" });
  });

  it("sends null English name after a rename", () => {
    expect(toMealItem(withRename(toItem(dish), "ผัดกะเพรา")).dish_name_en).toBeNull();
  });

  it("unedited result has edited=false", () => {
    expect(toMealItem(toItem(dish)).edited).toBe(false);
  });
});
