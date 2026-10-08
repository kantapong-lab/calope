// C-ERR: every error code returns the envelope with the contract's status and Thai message_th (AC-22, AC-11, AC-13).
// Each code is triggered through a real route handler, then compared with the contract table copied into fixtures.
import Anthropic from "@anthropic-ai/sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CONTRACT_ERRORS } from "../../fixtures/contract";
import { captureOutput, consentActive, consentNone, fileOf, jsonReq, multipart, okReply, providerText } from "../../fixtures/harness";
import { apiError, createSpy } from "../../fixtures/provider.test";
import { png } from "../../fixtures/images";
import { auth } from "@/server/auth";
import { getConsentStatus } from "@/server/consent";
import { checkAndRecordAnalysis } from "@/server/rate-limit";
import { createMeals, deleteMeal } from "@/server/meals";
import { ERROR_SPECS } from "@/server/errors";
import { POST as analyze } from "@/app/api/analyze/route";
import { POST as consentPost } from "@/app/api/consent/route";
import { POST as mealsPost, DELETE as mealsDeleteAll } from "@/app/api/meals/route";
import { DELETE as mealDelete } from "@/app/api/meals/[id]/route";

const create = createSpy();
const THAI = /[฀-๿]/;
const ORIGIN = { origin: "http://qa.local" };
const UUID = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as never);
  vi.mocked(getConsentStatus).mockResolvedValue(consentActive);
  vi.mocked(checkAndRecordAnalysis).mockResolvedValue({ allowed: true });
  create.mockResolvedValue(okReply());
});
afterEach(() => {
  create.mockReset();
  vi.clearAllMocks();
});

const photo = async () => fileOf(await png());
const validMeal = { dish_name_th: "x", portion_grams: 100, kcal_low: 1, kcal_high: 2, edited: false, source: "manual" };

// code -> function that makes the server return it
const triggers: Record<string, () => Promise<Response>> = {
  UNAUTHENTICATED: async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    return mealsPost(jsonReq("POST", "/api/meals", { items: [validMeal] }, ORIGIN));
  },
  BAD_ORIGIN: async () => mealsPost(jsonReq("POST", "/api/meals", { items: [validMeal] }, {})),
  BAD_REQUEST: async () => mealsPost(jsonReq("POST", "/api/meals", { items: [] }, ORIGIN)),
  NOT_FOUND: async () => {
    vi.mocked(deleteMeal).mockResolvedValue(false);
    return mealDelete(jsonReq("DELETE", `/api/meals/${UUID}`, undefined, ORIGIN), { params: Promise.resolve({ id: UUID }) });
  },
  CONSENT_REQUIRED: async () => {
    vi.mocked(getConsentStatus).mockResolvedValue(consentNone);
    return analyze(multipart({ photo: await photo() }, ORIGIN));
  },
  CONSENT_VERSION_MISMATCH: async () => consentPost(jsonReq("POST", "/api/consent", { version: "1999-old", accepted: true }, ORIGIN)),
  INVALID_FILE_TYPE: async () => analyze(multipart({ photo: fileOf(Buffer.from("not an image at all")) }, ORIGIN)),
  FILE_TOO_LARGE: async () =>
    analyze(multipart({ photo: fileOf(Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(4_100_000)])) }, ORIGIN)),
  RATE_LIMITED: async () => {
    vi.mocked(checkAndRecordAnalysis).mockResolvedValue({ allowed: false, retryAfterSec: 60 });
    return analyze(multipart({ photo: await photo() }, ORIGIN));
  },
  PROVIDER_ERROR: async () => {
    create.mockRejectedValue(apiError(400));
    return analyze(multipart({ photo: await photo() }, ORIGIN));
  },
  PROVIDER_INVALID_OUTPUT: async () => {
    create.mockResolvedValue(providerText("nope"));
    return analyze(multipart({ photo: await photo() }, ORIGIN));
  },
  PROVIDER_TIMEOUT: async () => {
    create.mockRejectedValue(new Anthropic.APIConnectionTimeoutError());
    return analyze(multipart({ photo: await photo() }, ORIGIN));
  },
  INTERNAL_ERROR: async () => {
    vi.mocked(getConsentStatus).mockRejectedValue(new Error("db exploded"));
    return analyze(multipart({ photo: await photo() }, ORIGIN));
  },
};

describe("C-ERR envelope for every code", () => {
  it("every ErrorCode in the contract has a trigger in this suite", () => {
    expect(Object.keys(triggers).sort()).toEqual(Object.keys(CONTRACT_ERRORS).sort());
    expect(Object.keys(ERROR_SPECS).sort()).toEqual(Object.keys(CONTRACT_ERRORS).sort());
  });

  it.each(Object.keys(CONTRACT_ERRORS))("AC-22 %s: contract status, exact Thai message_th, envelope shape", async (code) => {
    const res = await triggers[code]();
    const expected = CONTRACT_ERRORS[code];
    expect(res.status).toBe(expected.status);
    expect(res.headers.get("content-type")).toMatch(/application\/json/);
    const body = await res.json();
    expect(Object.keys(body)).toEqual(["error"]);
    const err = body.error;
    expect(err.code).toBe(code);
    expect(err.message_th).toBe(expected.message_th);
    expect(err.message_th).toMatch(THAI);
    expect(typeof err.retryable).toBe("boolean");
    expect(["manual", undefined]).toContain(err.fallback);
  });

  it("AC-1 file-type and size messages both state the formats and the 10 MB limit", () => {
    for (const code of ["INVALID_FILE_TYPE", "FILE_TOO_LARGE"]) {
      expect(CONTRACT_ERRORS[code].message_th).toContain("JPEG, PNG, WebP");
      expect(CONTRACT_ERRORS[code].message_th).toContain("10 MB");
    }
  });

  it("AC-11 provider failures on /api/analyze carry fallback manual", async () => {
    for (const code of ["PROVIDER_ERROR", "PROVIDER_INVALID_OUTPUT", "PROVIDER_TIMEOUT"]) {
      vi.clearAllMocks();
      const body = await (await triggers[code]()).json();
      expect(body.error.fallback).toBe("manual");
    }
  });

  it("BAD_REQUEST carries details without echoing user content", async () => {
    const secret = "SECRET-USER-TEXT-7788";
    const res = await mealsPost(jsonReq("POST", "/api/meals", { items: [{ ...validMeal, dish_name_th: secret, kcal_low: "abc" }] }, ORIGIN));
    const text = await res.text();
    expect(res.status).toBe(400);
    expect(JSON.parse(text).error.details.length).toBeGreaterThan(0);
    expect(text).not.toContain(secret);
  });

  it("RATE_LIMITED shape: retryable false, Retry-After header present (fallback field absent: see QA note Q-1)", async () => {
    const res = await triggers.RATE_LIMITED();
    expect(res.headers.get("Retry-After")).toBe("60");
    const body = await res.json();
    expect(body.error.retryable).toBe(false);
  });
});

describe("INTERNAL_ERROR catch-all (AC-20, D1)", () => {
  it("/api/analyze: 500, retryable true, fallback manual, no exception text, no stack", async () => {
    const out = captureOutput();
    vi.mocked(getConsentStatus).mockRejectedValue(new Error("db password=hunter2 exploded at /srv/app.js:12"));
    const res = await analyze(multipart({ photo: await photo() }, ORIGIN));
    const text = await res.text();
    const logs = out.text();
    out.restore();
    expect(res.status).toBe(500);
    const body = JSON.parse(text);
    expect(body.error).toEqual({
      code: "INTERNAL_ERROR",
      message_th: CONTRACT_ERRORS.INTERNAL_ERROR.message_th,
      retryable: true,
      fallback: "manual",
    });
    expect(text).not.toMatch(/hunter2|exploded|\.js|stack/);
    expect(logs).not.toMatch(/hunter2|exploded|\/srv\/app/);
    expect(logs).toContain("INTERNAL_ERROR");
  });

  it("/api/meals: 500 INTERNAL_ERROR without fallback", async () => {
    vi.mocked(createMeals).mockRejectedValue(new Error("boom"));
    const res = await mealsPost(jsonReq("POST", "/api/meals", { items: [validMeal] }, ORIGIN));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toEqual({ code: "INTERNAL_ERROR", message_th: CONTRACT_ERRORS.INTERNAL_ERROR.message_th, retryable: true });
  });

  it("DELETE /api/meals without confirm is 400 BAD_REQUEST with Thai message", async () => {
    const res = await mealsDeleteAll(jsonReq("DELETE", "/api/meals", undefined, ORIGIN));
    expect(res.status).toBe(400);
    expect((await res.json()).error.message_th).toBe(CONTRACT_ERRORS.BAD_REQUEST.message_th);
  });
});
