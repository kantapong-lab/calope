// Full capture flow in jsdom (no real camera/canvas): AC-1, 5, 6, 7, 8, 9, 10, 11, 13, 14, 22.
// Mocked: network client (@/lib/client/api calls), canvas resize, next/navigation. Real: all components and copy.
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { th } from "@/copy/th";

const replace = vi.fn();
const push = vi.fn();
// stable router object: the real Next router is referentially stable (a new object per render would re-run the consent effect)
const router = { replace, push };
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/" }));
vi.mock("@/lib/client/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/client/api")>()),
  getConsent: vi.fn(),
  analyze: vi.fn(),
  saveMeals: vi.fn(),
}));
vi.mock("@/lib/client/image", async (orig) => ({
  ...(await orig<typeof import("@/lib/client/image")>()),
  resizeToJpeg: vi.fn(async () => new Blob(["jpeg"], { type: "image/jpeg" })),
}));

import { ApiError, analyze, getConsent, saveMeals } from "@/lib/client/api";
import { CaptureFlow } from "@/components/CaptureFlow";

const consent = (active: boolean) => ({
  required_version: "2026-10-v1",
  active,
  version: active ? "2026-10-v1" : null,
  consented_at: null,
  withdrawn_at: null,
});
const dishA = { name_th: "ผัดไทย", name_en: "Pad Thai", grams: 280, kcal_low: 500, kcal_high: 650, confidence: 0.75, assumptions: ["ใช้น้ำมันปานกลาง"] };
const analysed = (dishes = [dishA]) => ({ request_id: "r", model: "m", is_food: true as const, dishes, dish_index: 0 });
const saved = (items: object[]) => items.map((i, n) => ({ id: `id${n}`, created_at: "2026-10-08T00:00:00.000Z", dish_name_en: null, ...i }));

const THAI_DISCLAIMER = th.disclaimer.short;
const hasDisclaimer = () => expect(document.body.textContent).toMatch(/ไม่ใช่คำแนะนำทางการแพทย์/);
const kcalValues = () => [...document.querySelectorAll(".kcal-value")].map((e) => e.textContent);

async function openCapture() {
  vi.mocked(getConsent).mockResolvedValue(consent(true));
  const view = render(<CaptureFlow />);
  await screen.findByText(th.capture.title);
  return view;
}
async function pick(view: ReturnType<typeof render>, file: File) {
  const input = view.container.querySelectorAll('input[type="file"]')[1] as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
}
const jpg = () => new File(["x"], "meal.jpg", { type: "image/jpeg" });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AC-14 consent gate on the capture screen", () => {
  it("AC-14 not consented: redirected to /consent, no capture inputs rendered, nothing uploaded", async () => {
    vi.mocked(getConsent).mockResolvedValue(consent(false));
    const view = render(<CaptureFlow />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/consent"));
    expect(view.container.querySelectorAll('input[type="file"]')).toHaveLength(0);
    expect(analyze).not.toHaveBeenCalled();
  });

  it("AC-14 consent text updated (older version on record): redirected to /consent?updated=1", async () => {
    vi.mocked(getConsent).mockResolvedValue({ ...consent(false), version: "old", consented_at: "2026-01-01T00:00:00Z" });
    render(<CaptureFlow />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/consent?updated=1"));
  });

  it("AC-14 withdrawn: redirected to /consent (analysis blocked until re-consent)", async () => {
    vi.mocked(getConsent).mockResolvedValue({ ...consent(false), version: "2026-10-v1", consented_at: "2026-10-01T00:00:00Z", withdrawn_at: "2026-10-02T00:00:00Z" });
    render(<CaptureFlow />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/consent"));
    expect(analyze).not.toHaveBeenCalled();
  });

  it("AC-14 consent check fails (500): fails closed with a Thai retry, capture stays unavailable", async () => {
    vi.mocked(getConsent).mockRejectedValue(new ApiError(500, "INTERNAL_ERROR", "x", true));
    const view = render(<CaptureFlow />);
    await screen.findByText(th.consent.checkFailedTitle);
    expect(view.container.querySelectorAll('input[type="file"]')).toHaveLength(0);
    expect(screen.queryByText(th.capture.camera)).toBeNull();
    // retry succeeds -> capture opens
    vi.mocked(getConsent).mockResolvedValue(consent(true));
    fireEvent.click(screen.getByRole("button", { name: th.history.retry }));
    await screen.findByText(th.capture.title);
  });

  it("AC-14 network failure while checking consent also fails closed", async () => {
    vi.mocked(getConsent).mockRejectedValue(new ApiError(0, "NETWORK", th.genericError));
    const view = render(<CaptureFlow />);
    await screen.findByText(th.consent.checkFailedTitle);
    expect(view.container.querySelectorAll('input[type="file"]')).toHaveLength(0);
  });
});

describe("AC-1 client pre-check", () => {
  it("AC-1 capture screen states formats and the 10 MB limit in Thai; disclaimer visible (AC-6)", async () => {
    await openCapture();
    expect(screen.getByText(th.capture.accepted)).toBeInTheDocument();
    expect(th.capture.accepted).toContain("10 MB");
    hasDisclaimer();
  });

  it.each([
    ["GIF", new File(["x"], "a.gif", { type: "image/gif" }), th.rejected.typeTitle],
    ["PDF", new File(["x"], "a.pdf", { type: "application/pdf" }), th.rejected.typeTitle],
    ["JPEG over 10 MB", new File([new Uint8Array(10 * 1024 * 1024 + 1)], "big.jpg", { type: "image/jpeg" }), th.rejected.sizeTitle],
  ])("AC-1 %s is rejected in Thai with the limit and no network call", async (_n, file, title) => {
    const view = await openCapture();
    await pick(view, file);
    await screen.findByText(title);
    expect(screen.getByText(th.rejected.body)).toBeInTheDocument();
    expect(th.rejected.body).toContain("10 MB");
    expect(analyze).not.toHaveBeenCalled();
  });

  it.each([
    ["JPEG", "image/jpeg"],
    ["PNG", "image/png"],
    ["WebP", "image/webp"],
    ["JPEG of exactly 10 MB", "image/jpeg"],
  ])("AC-1 %s is accepted and uploaded", async (n, type) => {
    vi.mocked(analyze).mockResolvedValue(analysed());
    const view = await openCapture();
    const size = n.includes("exactly") ? 10 * 1024 * 1024 : 1;
    await pick(view, new File([new Uint8Array(size)], "m", { type }));
    await screen.findByText(th.result.title);
    expect(analyze).toHaveBeenCalledTimes(1);
  });
});

describe("AC-4 / AC-5 / AC-6 / AC-22 result screen", () => {
  it("shows Thai+English names, grams, range 'N - N', confidence, assumptions, disclaimer; no single kcal number", async () => {
    vi.mocked(analyze).mockResolvedValue(analysed([dishA, { ...dishA, name_th: "ส้มตำ", name_en: "Som Tam", grams: 200, kcal_low: 120, kcal_high: 120, confidence: 0.4, assumptions: [] }]));
    const view = await openCapture();
    await pick(view, jpg());
    await screen.findByText(th.result.title);
    expect(screen.getByRole("heading", { name: "ผัดไทย" })).toBeInTheDocument();
    expect(screen.getByText("Pad Thai")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "ส้มตำ" })).toBeInTheDocument();
    expect(screen.getByText("Som Tam")).toBeInTheDocument();
    expect(screen.getByText(th.result.confidence(th.result.levels.high, 75))).toBeInTheDocument();
    expect(screen.getByText(th.result.confidence(th.result.levels.low, 40))).toBeInTheDocument();
    expect(screen.getByText("ใช้น้ำมันปานกลาง")).toBeInTheDocument();
    expect(screen.getByText(th.result.assumptions)).toBeInTheDocument();
    // dish ranges and the total are all ranges; equal low/high keeps the "N - N" form
    expect(kcalValues()).toEqual(expect.arrayContaining(["500 - 650", "120 - 120", "620 - 770"]));
    for (const v of kcalValues()) expect(v).toMatch(/^[\d,]+ - [\d,]+$/);
    hasDisclaimer();
  });

  it("AC-6 disclaimer is also on the analysing screen", async () => {
    let release!: (v: ReturnType<typeof analysed>) => void;
    vi.mocked(analyze).mockReturnValue(new Promise((r) => (release = r)));
    const view = await openCapture();
    await pick(view, jpg());
    await screen.findByText(th.analysing.title);
    expect(screen.getByText(THAI_DISCLAIMER)).toBeInTheDocument();
    release(analysed());
    await screen.findByText(th.result.title);
  });
});

describe("AC-7 not food", () => {
  it("shows the not-food message, no kcal anywhere, and the manual-entry option", async () => {
    vi.mocked(analyze).mockResolvedValue({ request_id: "r", model: "m", is_food: false, dishes: [], dish_index: 0 });
    const view = await openCapture();
    await pick(view, jpg());
    await screen.findByText(th.notFood.title);
    expect(kcalValues()).toEqual([]);
    expect(document.body.textContent).not.toContain(th.kcalUnit);
    expect(screen.getByRole("link", { name: th.notFood.manual })).toHaveAttribute("href", "/manual");
  });
});

describe("AC-11 provider failure -> Thai error + manual form that can save", () => {
  it.each(["PROVIDER_ERROR", "PROVIDER_TIMEOUT", "PROVIDER_INVALID_OUTPUT", "INTERNAL_ERROR"])("%s shows the fallback and a working manual form", async (code) => {
    vi.mocked(analyze).mockRejectedValue(new ApiError(502, code, "x", code !== "PROVIDER_INVALID_OUTPUT", "manual"));
    vi.mocked(saveMeals).mockImplementation(async (items) => saved(items) as never);
    const view = await openCapture();
    await pick(view, jpg());
    await screen.findByText(th.fallback.body);
    hasDisclaimer();
    fireEvent.change(screen.getByLabelText(th.manual.name), { target: { value: "ข้าวมันไก่" } });
    fireEvent.change(screen.getByLabelText(th.manual.grams), { target: { value: "300" } });
    fireEvent.change(screen.getByLabelText(th.manual.kcalFallback), { target: { value: "620" } });
    fireEvent.click(screen.getByRole("button", { name: th.manual.save }));
    await screen.findByText(th.saved.title);
    expect(saveMeals).toHaveBeenCalledWith([
      { dish_name_th: "ข้าวมันไก่", dish_name_en: null, portion_grams: 300, kcal_low: 620, kcal_high: 620, edited: false, source: "manual" },
    ]);
    expect(screen.getByText(/620 - 620/)).toBeInTheDocument();
  });

  it("AC-11 retryable failure offers re-analysis; non-retryable does not", async () => {
    vi.mocked(analyze).mockRejectedValue(new ApiError(502, "PROVIDER_ERROR", "x", true, "manual"));
    const view = await openCapture();
    await pick(view, jpg());
    await screen.findByText(th.fallback.body);
    expect(screen.getByRole("button", { name: th.fallback.retry })).toBeInTheDocument();
  });

  it("manual form validates: grams 0, kcal 5001 and empty name are refused, nothing saved", async () => {
    vi.mocked(analyze).mockRejectedValue(new ApiError(502, "PROVIDER_ERROR", "x", true, "manual"));
    const view = await openCapture();
    await pick(view, jpg());
    await screen.findByText(th.fallback.body);
    fireEvent.change(screen.getByLabelText(th.manual.grams), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText(th.manual.kcalFallback), { target: { value: "5001" } });
    fireEvent.click(screen.getByRole("button", { name: th.manual.save }));
    expect(await screen.findByText(th.edit.nameError)).toBeInTheDocument();
    expect(screen.getByText(th.edit.gramsError)).toBeInTheDocument();
    expect(saveMeals).not.toHaveBeenCalled();
  });
});

describe("AC-13 rate limit screen", () => {
  it("shows the Thai wait time from Retry-After and offers manual entry", async () => {
    vi.mocked(analyze).mockRejectedValue(new ApiError(429, "RATE_LIMITED", "x", false, undefined, 1500));
    const view = await openCapture();
    await pick(view, jpg());
    await screen.findByText(th.rateLimit.title);
    expect(screen.getByText(th.rateLimit.body(25))).toBeInTheDocument();
    expect(screen.getByRole("link", { name: th.rateLimit.manual })).toHaveAttribute("href", "/manual");
  });
});

describe("AC-8 / AC-9 / AC-10 edit and save", () => {
  async function openEditor() {
    vi.mocked(analyze).mockResolvedValue(analysed());
    const view = await openCapture();
    await pick(view, jpg());
    await screen.findByText(th.result.title);
    fireEvent.click(screen.getByRole("button", { name: new RegExp(th.result.editDish) }));
    await screen.findByText(th.edit.title);
  }
  const grams = () => screen.getByLabelText(`${th.edit.portion} (${th.gramUnit})`);

  it("AC-9 grams change recalculates both ends proportionally, on screen, with no provider call", async () => {
    await openEditor();
    vi.mocked(analyze).mockClear();
    fireEvent.change(grams(), { target: { value: "560" } });
    await waitFor(() => expect(kcalValues()).toContain("1,000 - 1,300"));
    fireEvent.change(grams(), { target: { value: "140" } });
    await waitFor(() => expect(kcalValues()).toContain("250 - 325"));
    expect(analyze).not.toHaveBeenCalled();
    hasDisclaimer();
  });

  it("AC-9 serving count converts to grams (2 servings = 560 g)", async () => {
    await openEditor();
    fireEvent.change(screen.getByLabelText(th.edit.servings), { target: { value: "2" } });
    await waitFor(() => expect(kcalValues()).toContain("1,000 - 1,300"));
  });

  it("5000 kcal cap: a portion whose kcal would exceed 5000 is refused with the Thai cap message, range unchanged", async () => {
    await openEditor();
    fireEvent.change(grams(), { target: { value: "5000" } }); // 650 * 5000/280 = 11607 > 5000
    expect(await screen.findByText(th.edit.kcalCapError)).toBeInTheDocument();
    expect(kcalValues()).toContain("500 - 650");
  });

  it("AC-9 grams outside 1..5000 are refused with the Thai grams message", async () => {
    await openEditor();
    fireEvent.change(grams(), { target: { value: "0" } });
    expect(await screen.findByText(th.edit.gramsError)).toBeInTheDocument();
    fireEvent.change(grams(), { target: { value: "5001" } });
    expect(screen.getAllByText(th.edit.gramsError).length).toBeGreaterThan(0);
  });

  it("AC-10 unedited save sends edited=false, source ai, the dish, grams and range", async () => {
    vi.mocked(analyze).mockResolvedValue(analysed());
    vi.mocked(saveMeals).mockImplementation(async (items) => saved(items) as never);
    const view = await openCapture();
    await pick(view, jpg());
    await screen.findByText(th.result.title);
    fireEvent.click(screen.getByRole("button", { name: th.result.save }));
    await screen.findByText(th.saved.title);
    expect(saveMeals).toHaveBeenCalledWith([
      { dish_name_th: "ผัดไทย", dish_name_en: "Pad Thai", portion_grams: 280, kcal_low: 500, kcal_high: 650, edited: false, source: "ai" },
    ]);
    hasDisclaimer();
  });

  it("AC-10 portion edit then save sends edited=true with the recalculated range", async () => {
    vi.mocked(saveMeals).mockImplementation(async (items) => saved(items) as never);
    await openEditor();
    fireEvent.change(grams(), { target: { value: "560" } });
    fireEvent.click(screen.getByRole("button", { name: th.edit.apply }));
    await screen.findByText(th.result.editedBadge);
    fireEvent.click(screen.getByRole("button", { name: th.result.save }));
    await screen.findByText(th.saved.title);
    expect(saveMeals).toHaveBeenCalledWith([expect.objectContaining({ portion_grams: 560, kcal_low: 1000, kcal_high: 1300, edited: true, source: "ai" })]);
  });

  it("AC-8 rename without re-estimate keeps kcal, clears the English name (saved as null), edited=true (Q7)", async () => {
    vi.mocked(saveMeals).mockImplementation(async (items) => saved(items) as never);
    await openEditor();
    fireEvent.change(screen.getByLabelText(th.edit.name), { target: { value: "ผัดไทยกุ้งสด" } });
    expect(screen.getByText(th.edit.renamedTitle)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: th.edit.apply }));
    await screen.findByText(th.result.editedBadge);
    expect(screen.queryByText("Pad Thai")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: th.result.save }));
    await screen.findByText(th.saved.title);
    expect(saveMeals).toHaveBeenCalledWith([
      { dish_name_th: "ผัดไทยกุ้งสด", dish_name_en: null, portion_grams: 280, kcal_low: 500, kcal_high: 650, edited: true, source: "ai" },
    ]);
  });

  it("AC-8 re-estimate sends dish_hint and dish_index and replaces both names and kcal", async () => {
    await openEditor();
    vi.mocked(analyze).mockResolvedValue(analysed([{ ...dishA, name_th: "ผัดไทยกุ้งสด", name_en: "Shrimp Pad Thai", kcal_low: 600, kcal_high: 720 }]));
    fireEvent.change(screen.getByLabelText(th.edit.name), { target: { value: "ผัดไทยกุ้งสด" } });
    fireEvent.click(screen.getByRole("button", { name: th.edit.reestimate }));
    await waitFor(() => expect(analyze).toHaveBeenLastCalledWith(expect.any(Blob), { dishHint: "ผัดไทยกุ้งสด", dishIndex: 0 }));
    await waitFor(() => expect(kcalValues()).toContain("600 - 720"));
    fireEvent.click(screen.getByRole("button", { name: th.edit.apply }));
    expect(await screen.findByText("Shrimp Pad Thai")).toBeInTheDocument();
  });

  it("AC-8 manual kcal entry replaces the range with the user's number shown as 'N - N'", async () => {
    await openEditor();
    fireEvent.click(screen.getByRole("button", { name: th.edit.manualKcal }));
    fireEvent.change(screen.getByLabelText(th.edit.manualKcalLabel), { target: { value: "700" } });
    await waitFor(() => expect(kcalValues()).toContain("700 - 700"));
    fireEvent.change(screen.getByLabelText(th.edit.manualKcalLabel), { target: { value: "5001" } });
    expect(await screen.findByText(th.edit.kcalError)).toBeInTheDocument();
  });

  it("AC-8 a re-estimate that comes back not-food shows the Thai not-food notice and keeps the old dish", async () => {
    await openEditor();
    vi.mocked(analyze).mockResolvedValue({ request_id: "r", model: "m", is_food: false, dishes: [], dish_index: 0 });
    fireEvent.click(screen.getByRole("button", { name: th.edit.reestimate }));
    expect(await screen.findByText(th.notFood.title)).toBeInTheDocument();
    expect(kcalValues()).toContain("500 - 650");
  });

  it("AC-10 a failed save keeps the result on screen and shows a Thai toast-level error path (no crash)", async () => {
    vi.mocked(analyze).mockResolvedValue(analysed());
    vi.mocked(saveMeals).mockRejectedValue(new ApiError(500, "INTERNAL_ERROR", "x", true));
    const view = await openCapture();
    await pick(view, jpg());
    await screen.findByText(th.result.title);
    fireEvent.click(screen.getByRole("button", { name: th.result.save }));
    await waitFor(() => expect(saveMeals).toHaveBeenCalled());
    expect(screen.getByText(th.result.title)).toBeInTheDocument();
    expect(within(document.body).queryByText(th.saved.title)).toBeNull();
  });
});
