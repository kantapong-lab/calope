// Meals and consent endpoints at the HTTP boundary (request validation, ordering, response shape).
// Persistence itself is NOT proven here (store mocked): see tests/e2e/db/*.test.ts (skipped without DATABASE_URL).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { consentActive, jsonReq } from "../../fixtures/harness";
import { auth } from "@/server/auth";
import { recordConsent, withdrawConsent } from "@/server/consent";
import { createMeals, deleteAllMeals, deleteMeal, listMeals } from "@/server/meals";
import { DELETE as consentDelete, POST as consentPost } from "@/app/api/consent/route";
import { DELETE as mealsDelete, GET as mealsGet, POST as mealsPost } from "@/app/api/meals/route";
import { DELETE as mealDelete } from "@/app/api/meals/[id]/route";

const ORIGIN = { origin: "http://qa.local" };
const UUID = "33333333-3333-4333-8333-333333333333";
const item = (over: Record<string, unknown> = {}) => ({
  dish_name_th: "ผัดไทย",
  dish_name_en: "Pad Thai",
  portion_grams: 280,
  kcal_low: 500,
  kcal_high: 650,
  edited: false,
  source: "ai",
  ...over,
});
const post = (items: unknown[]) => mealsPost(jsonReq("POST", "/api/meals", { items }, ORIGIN));

beforeEach(() => {
  vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as never);
  vi.mocked(createMeals).mockImplementation(async (_u, items) =>
    items.map((i, n) => ({ ...i, dish_name_en: i.dish_name_en ?? null, id: `id-${n}`, created_at: "2026-10-08T00:00:00.000Z" })),
  );
});
afterEach(() => vi.clearAllMocks());

describe("AC-10 POST /api/meals", () => {
  it("AC-10 201 with items; stores edited flag, portion, kcal range, source; server sets created_at", async () => {
    const res = await post([item({ edited: true })]);
    expect(res.status).toBe(201);
    const [saved] = (await res.json()).items;
    expect(saved).toMatchObject({ dish_name_th: "ผัดไทย", portion_grams: 280, kcal_low: 500, kcal_high: 650, edited: true, source: "ai" });
    expect(saved.created_at).toBeTruthy();
    expect(createMeals).toHaveBeenCalledWith("user-1", [expect.objectContaining({ edited: true })]);
  });

  it("AC-10 the user id comes from the session, never from the body", async () => {
    await post([item({ user_id: "attacker" })]);
    expect(vi.mocked(createMeals).mock.calls[0][0]).toBe("user-1");
  });

  it("AC-8 renamed dish without re-estimate is passed on with dish_name_en null (Q7)", async () => {
    const res = await post([item({ dish_name_th: "ผัดไทยกุ้งสด", dish_name_en: null, edited: true })]);
    expect(res.status).toBe(201);
    expect((await res.json()).items[0].dish_name_en).toBeNull();
  });

  it("AC-5 manual entry is saved as a range with low == high", async () => {
    const res = await post([item({ source: "manual", dish_name_en: null, kcal_low: 450, kcal_high: 450 })]);
    expect(res.status).toBe(201);
  });

  it("AC-10 accepts 1 to 10 items, rejects 0 and 11", async () => {
    expect((await post(Array.from({ length: 10 }, () => item()))).status).toBe(201);
    expect((await post(Array.from({ length: 11 }, () => item()))).status).toBe(400);
    expect((await post([])).status).toBe(400);
  });

  it.each([
    ["5000 kcal cap: kcal_high 5001", { kcal_high: 5001 }],
    ["5000 kcal cap: kcal_low 5001", { kcal_low: 5001, kcal_high: 5001 }],
    ["kcal_high below kcal_low", { kcal_low: 600, kcal_high: 500 }],
    ["negative kcal", { kcal_low: -1 }],
    ["fractional kcal", { kcal_low: 10.5 }],
    ["portion 0", { portion_grams: 0 }],
    ["portion 5001", { portion_grams: 5001 }],
    ["fractional portion", { portion_grams: 10.5 }],
    ["empty dish name", { dish_name_th: "" }],
    ["dish name 121 chars", { dish_name_th: "ก".repeat(121) }],
    ["unknown source", { source: "robot" }],
    ["manual with edited=true", { source: "manual", edited: true }],
    ["edited missing", { edited: undefined }],
    ["kcal as string", { kcal_low: "500" }],
  ])("AC-10 rejects %s with 400 BAD_REQUEST and does not store", async (_n, over) => {
    const res = await post([item(over)]);
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("BAD_REQUEST");
    expect(createMeals).not.toHaveBeenCalled();
  });

  it("AC-5/cap boundary: kcal exactly 5000 and 0 are accepted", async () => {
    expect((await post([item({ kcal_low: 5000, kcal_high: 5000 })])).status).toBe(201);
    expect((await post([item({ kcal_low: 0, kcal_high: 0 })])).status).toBe(201);
  });

  it("malformed JSON body is 400 BAD_REQUEST", async () => {
    const req = new Request("http://qa.local/api/meals", { method: "POST", headers: { ...ORIGIN, "content-type": "application/json" }, body: "{oops" });
    const res = await mealsPost(req);
    expect(res.status).toBe(400);
  });

  it("saving a manual meal needs no consent (consent store is never consulted)", async () => {
    const consent = await import("@/server/consent");
    await post([item({ source: "manual", dish_name_en: null, kcal_low: 1, kcal_high: 1 })]);
    expect(consent.getConsentStatus).not.toHaveBeenCalled();
  });
});

describe("GET /api/meals", () => {
  it("scopes the query to the caller and forwards limit/before", async () => {
    vi.mocked(listMeals).mockResolvedValue({ items: [], next_before: null });
    const res = await mealsGet(new Request("http://qa.local/api/meals?limit=5&before=2026-10-08T00:00:00.000Z"));
    expect(res.status).toBe(200);
    expect(listMeals).toHaveBeenCalledWith("user-1", 5, new Date("2026-10-08T00:00:00.000Z"));
  });
  it("default limit 20", async () => {
    vi.mocked(listMeals).mockResolvedValue({ items: [], next_before: null });
    await mealsGet(new Request("http://qa.local/api/meals"));
    expect(vi.mocked(listMeals).mock.calls[0][1]).toBe(20);
  });
  it.each(["limit=0", "limit=51", "limit=abc", "before=yesterday"])("rejects %s with 400", async (q) => {
    const res = await mealsGet(new Request(`http://qa.local/api/meals?${q}`));
    expect(res.status).toBe(400);
  });
  it("signed out is 401 with Thai message", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await mealsGet(new Request("http://qa.local/api/meals"));
    expect(res.status).toBe(401);
    expect((await res.json()).error.message_th).toMatch(/[฀-๿]/);
  });
});

describe("AC-17 deletion endpoints", () => {
  it("DELETE /api/meals/{id} returns 204 for the caller's meal", async () => {
    vi.mocked(deleteMeal).mockResolvedValue(true);
    const res = await mealDelete(jsonReq("DELETE", `/api/meals/${UUID}`, undefined, ORIGIN), { params: Promise.resolve({ id: UUID }) });
    expect(res.status).toBe(204);
    expect(deleteMeal).toHaveBeenCalledWith("user-1", UUID);
  });
  it("unknown or not-owned id is 404 NOT_FOUND (indistinguishable)", async () => {
    vi.mocked(deleteMeal).mockResolvedValue(false);
    const res = await mealDelete(jsonReq("DELETE", `/api/meals/${UUID}`, undefined, ORIGIN), { params: Promise.resolve({ id: UUID }) });
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("NOT_FOUND");
  });
  it("non-uuid id is 404 NOT_FOUND without touching the store", async () => {
    const res = await mealDelete(jsonReq("DELETE", "/api/meals/abc", undefined, ORIGIN), { params: Promise.resolve({ id: "abc" }) });
    expect(res.status).toBe(404);
    expect(deleteMeal).not.toHaveBeenCalled();
  });
  it("DELETE /api/meals?confirm=true deletes all of the caller's rows (204)", async () => {
    const res = await mealsDelete(jsonReq("DELETE", "/api/meals?confirm=true", undefined, ORIGIN));
    expect(res.status).toBe(204);
    expect(deleteAllMeals).toHaveBeenCalledWith("user-1");
  });
  it.each(["", "?confirm=false", "?confirm=1", "?confirm=TRUE"])("DELETE /api/meals%s is 400 and deletes nothing", async (q) => {
    const res = await mealsDelete(jsonReq("DELETE", `/api/meals${q}`, undefined, ORIGIN));
    expect(res.status).toBe(400);
    expect(deleteAllMeals).not.toHaveBeenCalled();
  });
});

describe("AC-15/16/18 consent endpoints", () => {
  const status = { ...consentActive };
  it("AC-18 POST with the current version records it for the session user: 201 when new, 200 when already active", async () => {
    vi.mocked(recordConsent).mockResolvedValueOnce({ status, created: true }).mockResolvedValueOnce({ status, created: false });
    const body = { version: "2026-10-v1", accepted: true };
    expect((await consentPost(jsonReq("POST", "/api/consent", body, ORIGIN))).status).toBe(201);
    expect((await consentPost(jsonReq("POST", "/api/consent", body, ORIGIN))).status).toBe(200);
    expect(recordConsent).toHaveBeenCalledWith("user-1", "2026-10-v1");
  });
  it.each([
    ["accepted false", { version: "2026-10-v1", accepted: false }],
    ["accepted missing", { version: "2026-10-v1" }],
    ['accepted "true" string', { version: "2026-10-v1", accepted: "true" }],
    ["version missing", { accepted: true }],
  ])("AC-15 %s is 400 and records nothing", async (_n, body) => {
    const res = await consentPost(jsonReq("POST", "/api/consent", body, ORIGIN));
    expect(res.status).toBe(400);
    expect(recordConsent).not.toHaveBeenCalled();
  });
  it("AC-15 an old consent text version is 409 CONSENT_VERSION_MISMATCH with required_version, nothing recorded", async () => {
    const res = await consentPost(jsonReq("POST", "/api/consent", { version: "2026-01-v0", accepted: true }, ORIGIN));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe("CONSENT_VERSION_MISMATCH");
    expect(body.error.required_version).toBe("2026-10-v1");
    expect(recordConsent).not.toHaveBeenCalled();
  });
  it("AC-16 DELETE withdraws for the session user and returns active:false", async () => {
    vi.mocked(withdrawConsent).mockResolvedValue({ ...status, active: false, withdrawn_at: "2026-10-08T02:00:00.000Z" });
    const res = await consentDelete(jsonReq("DELETE", "/api/consent", undefined, ORIGIN));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ active: false, withdrawn_at: "2026-10-08T02:00:00.000Z" });
    expect(withdrawConsent).toHaveBeenCalledWith("user-1", "2026-10-v1");
  });
});
