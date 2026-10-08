import { afterEach, describe, expect, it, vi } from "vitest";
import { CONSENT_VERSION } from "@/shared/consent";
import { ApiError, analyze, deleteMeal, postConsent } from "./api";

const ok = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const fail = (status: number, code: string, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify({ error: { code, message_th: "ข้อความ", retryable: false } }), { status, headers });

afterEach(() => vi.unstubAllGlobals());

describe("analyze request", () => {
  it("sends only the photo as image/jpeg when there is no hint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ is_food: true, dishes: [], dish_index: 0 }));
    vi.stubGlobal("fetch", fetchMock);
    await analyze(new Blob(["x"], { type: "image/jpeg" }));
    const form = fetchMock.mock.calls[0][1].body as FormData;
    expect([...form.keys()]).toEqual(["photo"]);
    expect((form.get("photo") as File).type).toBe("image/jpeg");
  });

  it("sends dish_hint with dish_index for a re-estimate", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ is_food: true, dishes: [], dish_index: 1 }));
    vi.stubGlobal("fetch", fetchMock);
    await analyze(new Blob(["x"]), { dishHint: "ผัดไทย", dishIndex: 1 });
    const form = fetchMock.mock.calls[0][1].body as FormData;
    expect(form.get("dish_hint")).toBe("ผัดไทย");
    expect(form.get("dish_index")).toBe("1");
  });
});

describe("error mapping", () => {
  it("keeps code, message_th and Retry-After", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(fail(429, "RATE_LIMITED", { "Retry-After": "720" })));
    const err = await analyze(new Blob(["x"])).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ code: "RATE_LIMITED", messageTh: "ข้อความ", retryAfter: 720 });
  });

  it("maps a platform 413 without envelope to FILE_TOO_LARGE", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("too big", { status: 413 })));
    const err = await analyze(new Blob(["x"])).catch((e) => e);
    expect(err.code).toBe("FILE_TOO_LARGE");
  });

  it("maps a network failure to NETWORK", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fail")));
    const err = await analyze(new Blob(["x"])).catch((e) => e);
    expect(err.code).toBe("NETWORK");
  });

  it("treats NOT_FOUND on delete as deleted", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(fail(404, "NOT_FOUND")));
    await expect(deleteMeal("abc")).resolves.toBeUndefined();
  });
});

describe("consent request", () => {
  it("posts the current version with accepted true", async () => {
    const fetchMock = vi.fn().mockResolvedValue(ok({ active: true }, 201));
    vi.stubGlobal("fetch", fetchMock);
    await postConsent();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ version: CONSENT_VERSION, accepted: true });
  });
});
