// C-ORIGIN / AC-14 (gate ordering) / AC-19 (health leaks nothing).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CONTRACT_ERRORS } from "../../fixtures/contract";
import { consentActive, fileOf, HOST, jsonReq, multipart } from "../../fixtures/harness";
import { jpegWithExif } from "../../fixtures/images";
import { auth } from "@/server/auth";
import { getConsentStatus, recordConsent, withdrawConsent } from "@/server/consent";
import { checkAndRecordAnalysis } from "@/server/rate-limit";
import { createMeals, deleteAllMeals, deleteMeal, listMeals } from "@/server/meals";
import { POST as analyzePost } from "@/app/api/analyze/route";
import { DELETE as consentDelete, GET as consentGet, POST as consentPost } from "@/app/api/consent/route";
import { DELETE as mealsDelete, GET as mealsGet, POST as mealsPost } from "@/app/api/meals/route";
import { DELETE as mealDelete } from "@/app/api/meals/[id]/route";
import { GET as health } from "@/app/api/health/route";

const UUID = "11111111-1111-4111-8111-111111111111";
const mealBody = { items: [{ dish_name_th: "x", portion_grams: 100, kcal_low: 1, kcal_high: 2, edited: false, source: "manual" }] };

type Case = { name: string; call: (headers?: Record<string, string>) => Promise<Response> };
const noHeaders: Record<string, string> = {};
const cases: Case[] = [
  { name: "POST /api/analyze", call: async (h = noHeaders) => analyzePost(multipart({ photo: fileOf(await jpegWithExif(200, 100)) }, h)) },
  { name: "POST /api/consent", call: async (h = noHeaders) => consentPost(jsonReq("POST", "/api/consent", { version: "2026-10-v1", accepted: true }, h)) },
  { name: "DELETE /api/consent", call: async (h = noHeaders) => consentDelete(jsonReq("DELETE", "/api/consent", undefined, h)) },
  { name: "POST /api/meals", call: async (h = noHeaders) => mealsPost(jsonReq("POST", "/api/meals", mealBody, h)) },
  { name: "DELETE /api/meals?confirm=true", call: async (h = noHeaders) => mealsDelete(jsonReq("DELETE", "/api/meals?confirm=true", undefined, h)) },
  {
    name: "DELETE /api/meals/{id}",
    call: async (h = noHeaders) =>
      mealDelete(jsonReq("DELETE", `/api/meals/${UUID}`, undefined, h), { params: Promise.resolve({ id: UUID }) }),
  },
];

beforeEach(() => {
  vi.mocked(auth).mockResolvedValue(null as never); // not signed in: proves origin runs before session
});
afterEach(() => vi.clearAllMocks());

describe.each(cases)("AC-14/C-ORIGIN $name", ({ call }) => {
  it.each([
    ["no Origin header", {}],
    ["Origin of another host", { origin: "https://evil.example" }],
    ["literal Origin: null", { origin: "null" }],
    ["malformed Origin", { origin: "not a url" }],
    ["same host but other port", { origin: "http://qa.local:9999" }],
  ])("rejects with 403 BAD_ORIGIN and Thai message_th: %s", async (_label, headers) => {
    const res = await call(headers as Record<string, string>);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("BAD_ORIGIN");
    expect(body.error.message_th).toBe(CONTRACT_ERRORS.BAD_ORIGIN.message_th);
    expect(body.error.retryable).toBe(false);
    // origin is checked before the session, consent, body, rate limit and storage
    expect(auth).not.toHaveBeenCalled();
    expect(getConsentStatus).not.toHaveBeenCalled();
    expect(recordConsent).not.toHaveBeenCalled();
    expect(withdrawConsent).not.toHaveBeenCalled();
    expect(checkAndRecordAnalysis).not.toHaveBeenCalled();
    expect(createMeals).not.toHaveBeenCalled();
    expect(deleteMeal).not.toHaveBeenCalled();
    expect(deleteAllMeals).not.toHaveBeenCalled();
  });

  it("with a matching Origin it reaches the session check (401 UNAUTHENTICATED when signed out)", async () => {
    const res = await call({ origin: HOST });
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("UNAUTHENTICATED");
    expect(auth).toHaveBeenCalledOnce();
  });
});

describe("C-ORIGIN: GET is not origin-checked", () => {
  it("GET /api/consent without Origin is not 403", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as never);
    vi.mocked(getConsentStatus).mockResolvedValue(consentActive);
    const res = await consentGet(new Request(`${HOST}/api/consent`));
    expect(res.status).toBe(200);
  });
  it("GET /api/meals without Origin is not 403", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as never);
    vi.mocked(listMeals).mockResolvedValue({ items: [], next_before: null });
    const res = await mealsGet(new Request(`${HOST}/api/meals`));
    expect(res.status).toBe(200);
  });
});

describe("AC-19 health endpoint reveals nothing", () => {
  it("returns exactly {status:ok}: no env names, key presence, versions", async () => {
    const res = await health();
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ status: "ok" });
    expect(text).not.toMatch(/ANTHROPIC|sk-ant|node|version|DATABASE/i);
  });
});
