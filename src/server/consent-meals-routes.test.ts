import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./consent-version", () => ({ CONSENT_VERSION: "test-v2" }));
vi.mock("./auth", () => ({ auth: vi.fn(async () => ({ user: { id: "user-1" } })) }));
vi.mock("./consent", () => ({ getConsentStatus: vi.fn(), recordConsent: vi.fn(), withdrawConsent: vi.fn() }));
vi.mock("./meals", () => ({ createMeals: vi.fn(), listMeals: vi.fn(), deleteMeal: vi.fn(), deleteAllMeals: vi.fn() }));

const consentRoute = await import("../app/api/consent/route");
const mealsRoute = await import("../app/api/meals/route");
const mealRoute = await import("../app/api/meals/[id]/route");
const { auth } = await import("./auth");
const consent = await import("./consent");
const meals = await import("./meals");

const origin = { origin: "http://localhost" };
const json = (method: string, url: string, body: unknown, headers: Record<string, string> = origin) =>
  new Request(url, { method, headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
const plain = (method: string, url: string, headers: Record<string, string> = origin) =>
  new Request(url, { method, headers });

const status = (patch = {}) => ({
  required_version: "test-v2",
  active: true,
  version: "test-v2",
  consented_at: "2026-10-08T10:00:00.000Z",
  withdrawn_at: null,
  ...patch,
});
const item = {
  dish_name_th: "ข้าวผัด",
  portion_grams: 300,
  kcal_low: 450,
  kcal_high: 600,
  edited: false,
  source: "ai",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("/api/consent", () => {
  it("GET returns the status for the required version", async () => {
    vi.mocked(consent.getConsentStatus).mockResolvedValue(status({ active: false, version: null }));
    const res = await consentRoute.GET(plain("GET", "http://localhost/api/consent"));
    expect(res.status).toBe(200);
    expect(consent.getConsentStatus).toHaveBeenCalledWith("user-1", "test-v2");
    expect((await res.json()).required_version).toBe("test-v2");
  });

  it("GET without a session returns 401 with a Thai message", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never);
    const res = await consentRoute.GET(plain("GET", "http://localhost/api/consent"));
    expect(res.status).toBe(401);
    expect((await res.json()).error.message_th).toMatch(/[฀-๿]/);
  });

  it("POST records consent and returns 201 for a new record", async () => {
    vi.mocked(consent.recordConsent).mockResolvedValue({ status: status(), created: true });
    const res = await consentRoute.POST(json("POST", "http://localhost/api/consent", { version: "test-v2", accepted: true }));
    expect(res.status).toBe(201);
    expect((await res.json()).active).toBe(true);
  });

  it("POST returns 200 when an active record already exists", async () => {
    vi.mocked(consent.recordConsent).mockResolvedValue({ status: status(), created: false });
    const res = await consentRoute.POST(json("POST", "http://localhost/api/consent", { version: "test-v2", accepted: true }));
    expect(res.status).toBe(200);
  });

  it("POST with an old version returns 409 and the required version, without writing", async () => {
    const res = await consentRoute.POST(json("POST", "http://localhost/api/consent", { version: "test-v1", accepted: true }));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatchObject({ code: "CONSENT_VERSION_MISMATCH", required_version: "test-v2" });
    expect(consent.recordConsent).not.toHaveBeenCalled();
  });

  it("POST with accepted:false returns 400 BAD_REQUEST without writing", async () => {
    const res = await consentRoute.POST(json("POST", "http://localhost/api/consent", { version: "test-v2", accepted: false }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("BAD_REQUEST");
    expect(consent.recordConsent).not.toHaveBeenCalled();
  });

  it("POST cross-origin returns 403 BAD_ORIGIN", async () => {
    const res = await consentRoute.POST(
      json("POST", "http://localhost/api/consent", { version: "test-v2", accepted: true }, { origin: "https://evil.example" }),
    );
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("BAD_ORIGIN");
  });

  it("DELETE withdraws and returns active:false with withdrawn_at", async () => {
    vi.mocked(consent.withdrawConsent).mockResolvedValue(status({ active: false, withdrawn_at: "2026-10-09T01:00:00.000Z" }));
    const res = await consentRoute.DELETE(plain("DELETE", "http://localhost/api/consent"));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ active: false, withdrawn_at: "2026-10-09T01:00:00.000Z" });
  });
});

describe("/api/meals", () => {
  it("POST creates the items and returns 201", async () => {
    vi.mocked(meals.createMeals).mockResolvedValue([{ ...item, id: "m1", dish_name_en: null, created_at: "2026-10-08T10:00:00.000Z" } as never]);
    const res = await mealsRoute.POST(json("POST", "http://localhost/api/meals", { items: [item] }));
    expect(res.status).toBe(201);
    expect((await res.json()).items).toHaveLength(1);
    expect(meals.createMeals).toHaveBeenCalledWith("user-1", [item]);
  });

  it("POST with an invalid body returns 400 with details and no echoed content", async () => {
    const res = await mealsRoute.POST(json("POST", "http://localhost/api/meals", { items: [{ ...item, dish_name_th: "SECRET-TEXT", kcal_low: 900, kcal_high: 100 }] }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("BAD_REQUEST");
    expect(body.error.details.length).toBeGreaterThan(0);
    expect(JSON.stringify(body)).not.toContain("SECRET-TEXT");
    expect(meals.createMeals).not.toHaveBeenCalled();
  });

  it("POST with malformed JSON returns 400", async () => {
    const res = await mealsRoute.POST(new Request("http://localhost/api/meals", { method: "POST", headers: origin, body: "{oops" }));
    expect(res.status).toBe(400);
  });

  it("GET passes limit and before through, scoped to the caller", async () => {
    vi.mocked(meals.listMeals).mockResolvedValue({ items: [], next_before: null });
    const res = await mealsRoute.GET(plain("GET", "http://localhost/api/meals?limit=5&before=2026-10-08T10:00:00.000Z"));
    expect(res.status).toBe(200);
    expect(meals.listMeals).toHaveBeenCalledWith("user-1", 5, new Date("2026-10-08T10:00:00.000Z"));
  });

  it("GET with limit above 50 returns 400", async () => {
    const res = await mealsRoute.GET(plain("GET", "http://localhost/api/meals?limit=51"));
    expect(res.status).toBe(400);
  });

  it("DELETE without confirm=true returns 400 and deletes nothing", async () => {
    for (const url of ["http://localhost/api/meals", "http://localhost/api/meals?confirm=yes"]) {
      const res = await mealsRoute.DELETE(plain("DELETE", url));
      expect(res.status).toBe(400);
    }
    expect(meals.deleteAllMeals).not.toHaveBeenCalled();
  });

  it("DELETE with confirm=true returns 204 and deletes the caller's meals", async () => {
    const res = await mealsRoute.DELETE(plain("DELETE", "http://localhost/api/meals?confirm=true"));
    expect(res.status).toBe(204);
    expect(meals.deleteAllMeals).toHaveBeenCalledWith("user-1");
  });
});

describe("/api/meals/[id]", () => {
  const id = "3f2b8c1e-0d4a-4b7e-9c55-1a2b3c4d5e6f";
  const call = (rawId: string) =>
    mealRoute.DELETE(plain("DELETE", `http://localhost/api/meals/${rawId}`), { params: Promise.resolve({ id: rawId }) });

  it("returns 204 when the caller owns the meal", async () => {
    vi.mocked(meals.deleteMeal).mockResolvedValue(true);
    expect((await call(id)).status).toBe(204);
    expect(meals.deleteMeal).toHaveBeenCalledWith("user-1", id);
  });

  it("returns 404 NOT_FOUND when the meal is missing or owned by someone else", async () => {
    vi.mocked(meals.deleteMeal).mockResolvedValue(false);
    const res = await call(id);
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("NOT_FOUND");
  });

  it("returns 404 for a non-uuid id without querying", async () => {
    expect((await call("not-a-uuid")).status).toBe(404);
    expect(meals.deleteMeal).not.toHaveBeenCalled();
  });
});
