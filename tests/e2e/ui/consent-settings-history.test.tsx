// AC-15 (consent screen content, no pre-tick, no bundling), AC-16 (withdraw UI), AC-17 (delete UI), AC-5/6 (history range + disclaimer).
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { th } from "@/copy/th";
import { CONSENT_ROWS, CONSENT_STATEMENT, CONSENT_VERSION } from "@/shared/consent";

const push = vi.fn();
const router = { replace: vi.fn(), push };
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/" }));
vi.mock("next-auth/react", () => ({ signOut: vi.fn() }));
vi.mock("@/lib/client/api", async (orig) => ({
  ...(await orig<typeof import("@/lib/client/api")>()),
  getConsent: vi.fn(),
  deleteConsent: vi.fn(),
  deleteAllMeals: vi.fn(),
  deleteMeal: vi.fn(),
  listMeals: vi.fn(),
}));

import { deleteAllMeals, deleteConsent, deleteMeal, getConsent, listMeals } from "@/lib/client/api";
import { ConsentPanel } from "@/components/ConsentPanel";
import { HistoryList } from "@/components/HistoryList";
import { SettingsPanel } from "@/components/SettingsPanel";

beforeEach(() => vi.clearAllMocks());

describe("AC-15 consent screen", () => {
  const text = () => document.body.textContent ?? "";

  it("names Anthropic, the USA transfer, purpose, retention (30 days) and the right to withdraw, all in Thai", () => {
    render(<ConsentPanel onAccept={() => {}} />);
    expect(text()).toContain("Anthropic");
    expect(text()).toContain("สหรัฐอเมริกา");
    expect(text()).toContain("นอกประเทศไทย");
    expect(CONSENT_ROWS.map((r) => r.label)).toEqual(["ผู้ประมวลผล", "ส่งไปที่ไหน", "ใช้ทำอะไร", "เก็บนานแค่ไหน", "สิทธิ์ของคุณ"]);
    expect(text()).toContain("30 วัน");
    expect(text()).toContain("ถอนความยินยอม");
    expect(text()).toContain(th.consent.versionLine(CONSENT_VERSION));
  });

  it("explicit action: exactly one checkbox, not pre-ticked, the button is disabled until it is ticked", () => {
    const onAccept = vi.fn();
    render(<ConsentPanel onAccept={onAccept} />);
    const boxes = screen.getAllByRole("checkbox");
    expect(boxes).toHaveLength(1); // not bundled with other terms
    expect(boxes[0]).not.toBeChecked();
    const button = screen.getByRole("button", { name: th.consent.button });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onAccept).not.toHaveBeenCalled();
    fireEvent.click(boxes[0]);
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onAccept).toHaveBeenCalledTimes(1);
    // unticking disables again
    fireEvent.click(boxes[0]);
    expect(button).toBeDisabled();
  });

  it("the checkbox statement itself names Anthropic and the USA, and a no-consent path (manual entry) exists", () => {
    render(<ConsentPanel onAccept={() => {}} />);
    expect(CONSENT_STATEMENT).toMatch(/Anthropic.*สหรัฐอเมริกา/);
    expect(screen.getByRole("link", { name: th.consent.decline })).toHaveAttribute("href", "/manual");
  });
});

describe("AC-16 withdraw in settings", () => {
  const active = { required_version: "v", active: true, version: "2026-10-v1", consented_at: "2026-10-01T03:00:00Z", withdrawn_at: null };

  it("an active consent shows the withdraw action; withdrawing calls DELETE /api/consent and shows the Thai confirmation", async () => {
    vi.mocked(getConsent).mockResolvedValue(active);
    vi.mocked(deleteConsent).mockResolvedValue({ ...active, active: false, withdrawn_at: "2026-10-08T00:00:00Z" });
    render(<SettingsPanel />);
    fireEvent.click(await screen.findByRole("button", { name: th.settings.withdraw }));
    await screen.findByText(th.settings.withdrawnTitle);
    expect(deleteConsent).toHaveBeenCalledTimes(1);
    expect(screen.getByText(th.settings.statusWithdrawn)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: th.settings.consentAgain })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: th.settings.withdraw })).toBeNull();
  });

  it("re-consent from settings goes to the consent screen", async () => {
    vi.mocked(getConsent).mockResolvedValue({ ...active, active: false, withdrawn_at: "2026-10-08T00:00:00Z" });
    render(<SettingsPanel />);
    fireEvent.click(await screen.findByRole("button", { name: th.settings.consentAgain }));
    expect(push).toHaveBeenCalledWith("/consent");
  });
});

describe("AC-17 delete in the UI", () => {
  it("delete-all needs a confirmation step, then calls the API once", async () => {
    vi.mocked(getConsent).mockResolvedValue({ required_version: "v", active: false, version: null, consented_at: null, withdrawn_at: null });
    vi.mocked(deleteAllMeals).mockResolvedValue();
    render(<SettingsPanel />);
    fireEvent.click(await screen.findByRole("button", { name: th.settings.deleteAll }));
    expect(deleteAllMeals).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: th.settings.deleteAllConfirm }));
    await waitFor(() => expect(deleteAllMeals).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(document.querySelector('dialog')?.hasAttribute('open')).toBe(false));
  });

  const meal = (id: string, name: string, low: number, high: number) => ({
    id, dish_name_th: name, dish_name_en: null, portion_grams: 200, kcal_low: low, kcal_high: high, edited: false, source: "ai" as const,
    created_at: new Date().toISOString(),
  });

  it("AC-5/AC-6 history lists every meal as a range 'N - N' with the Thai disclaimer, and deletes one after confirmation", async () => {
    vi.mocked(listMeals).mockResolvedValue({ items: [meal("a", "ผัดไทย", 500, 650), meal("b", "ส้มตำ", 120, 120)], next_before: null });
    vi.mocked(deleteMeal).mockResolvedValue();
    render(<HistoryList />);
    await screen.findByText("ผัดไทย");
    const values = [...document.querySelectorAll(".kcal-value")].map((e) => e.textContent);
    expect(values).toEqual(["500 - 650", "120 - 120"]);
    expect(document.body.textContent).toMatch(/ไม่ใช่คำแนะนำทางการแพทย์/);
    fireEvent.click(screen.getByRole("button", { name: th.history.deleteLabel("ผัดไทย") }));
    expect(deleteMeal).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: th.history.delete }));
    await waitFor(() => expect(deleteMeal).toHaveBeenCalledWith("a"));
    await waitFor(() => expect(screen.queryByText("ผัดไทย")).toBeNull());
    expect(screen.getByText("ส้มตำ")).toBeInTheDocument();
  });

  it("empty history shows the Thai empty state; load error shows retry", async () => {
    vi.mocked(listMeals).mockResolvedValue({ items: [], next_before: null });
    const { unmount } = render(<HistoryList />);
    await screen.findByText(th.history.emptyTitle);
    unmount();
    vi.mocked(listMeals).mockRejectedValue(new Error("x"));
    render(<HistoryList />);
    await screen.findByText(th.history.errorTitle);
  });
});
