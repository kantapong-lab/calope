// POST /api/analyze end to end at the HTTP boundary: AC-1, 2, 3, 4, 7, 11, 12, 13, 14, 21.
// Mocked: auth, consent store, rate-limit store, provider SDK. Real: route, validation, sharp, zod, retry logic.
import sharp from "sharp";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { CONTRACT_ERRORS } from "../../fixtures/contract";
import {
  consentActive,
  consentNone,
    dish,
  fileOf,
  jsonReq,
  multipart,
  okReply,
  providerText,
} from "../../fixtures/harness";
import { apiError, createSpy } from "../../fixtures/provider.test";
import { corruptJpeg, EXIF_MARKER, gif, jpegWithExif, png, textFile, webp } from "../../fixtures/images";
import { auth } from "@/server/auth";
import { getConsentStatus } from "@/server/consent";
import { checkAndRecordAnalysis } from "@/server/rate-limit";
import { POST } from "@/app/api/analyze/route";
import Anthropic from "@anthropic-ai/sdk";

const create = createSpy();

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

const sentImage = () => create.mock.calls[0][0].messages[0].content[0].source;

describe("AC-1 file type and size (server side)", () => {
  it("AC-1 accepts JPEG, PNG and WebP", async () => {
    for (const bytes of [await jpegWithExif(800, 600), await png(), await webp()]) {
      const res = await POST(multipart({ photo: fileOf(bytes) }));
      expect(res.status).toBe(200);
    }
    expect(create).toHaveBeenCalledTimes(3);
  });

  it.each([
    ["GIF", gif()],
    ["plain text", textFile()],
    ["empty file", Buffer.alloc(0)],
  ])("AC-1 rejects %s with 400 INVALID_FILE_TYPE and the Thai limit message, before any provider call", async (_n, bytes) => {
    const res = await POST(multipart({ photo: fileOf(bytes, "x.jpg", "image/jpeg") }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_FILE_TYPE");
    expect(body.error.message_th).toBe(CONTRACT_ERRORS.INVALID_FILE_TYPE.message_th);
    expect(body.error.message_th).toContain("10 MB");
    expect(create).not.toHaveBeenCalled();
    expect(checkAndRecordAnalysis).not.toHaveBeenCalled();
  });

  it("AC-1 type is decided by magic bytes, not the declared content type", async () => {
    const res = await POST(multipart({ photo: fileOf(gif(), "pic.jpg", "image/jpeg") }));
    expect((await res.json()).error.code).toBe("INVALID_FILE_TYPE");
    const ok = await POST(multipart({ photo: fileOf(await png(), "pic.txt", "text/plain") }));
    expect(ok.status).toBe(200);
  });

  it("AC-1 rejects an over-cap photo with 413 FILE_TOO_LARGE and the Thai 10 MB message, no provider call", async () => {
    const big = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(4_100_000, 1)]);
    const res = await POST(multipart({ photo: fileOf(big) }));
    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.error.code).toBe("FILE_TOO_LARGE");
    expect(body.error.message_th).toBe(CONTRACT_ERRORS.FILE_TOO_LARGE.message_th);
    expect(create).not.toHaveBeenCalled();
    expect(checkAndRecordAnalysis).not.toHaveBeenCalled();
  });

  it("AC-1 rejects by Content-Length before reading the body", async () => {
    const req = new Request("http://qa.local/api/analyze", {
      method: "POST",
      headers: { origin: "http://qa.local", "content-length": "9000000", "content-type": "multipart/form-data; boundary=x" },
      body: "--x--",
    });
    const res = await POST(req);
    expect(res.status).toBe(413);
    expect((await res.json()).error.code).toBe("FILE_TOO_LARGE");
  });

  it("AC-1 missing photo field is 400 BAD_REQUEST", async () => {
    const res = await POST(multipart({ dish_hint: "x" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("BAD_REQUEST");
  });

  it("AC-1 a body that is not multipart is 400 BAD_REQUEST", async () => {
    const res = await POST(jsonReq("POST", "/api/analyze", { photo: "abc" }, { origin: "http://qa.local" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("BAD_REQUEST");
  });

  it("AC-1/C-RATE probe: a decodable-looking but corrupt JPEG is rejected and must NOT consume rate-limit quota", async () => {
    const res = await POST(multipart({ photo: fileOf(corruptJpeg()) }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_FILE_TYPE");
    expect(create).not.toHaveBeenCalled();
    // contract C-RATE: "invalid files ... do not count"
    expect(checkAndRecordAnalysis).not.toHaveBeenCalled();
  });

  it("AC-1 an image over the pixel limit (sharp limitInputPixels) is rejected, not decoded", async () => {
    const huge = await sharp({ create: { width: 8000, height: 6000, channels: 3, background: "#fff" } }).png({ compressionLevel: 9 }).toBuffer();
    expect(huge.length).toBeLessThan(4_000_000);
    const res = await POST(multipart({ photo: fileOf(huge) }));
    expect(res.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });
});

describe("AC-2 / AC-3 what is sent to the provider", () => {
  it("AC-2 outgoing image has no EXIF/GPS/device metadata and no marker bytes", async () => {
    const original = await jpegWithExif(2000, 1500);
    expect(original.includes(EXIF_MARKER)).toBe(true);
    await POST(multipart({ photo: fileOf(original) }));
    const bytes = Buffer.from(sentImage().data, "base64");
    expect(sentImage().media_type).toBe("image/jpeg");
    expect(bytes.includes(EXIF_MARKER)).toBe(false);
    const meta = await sharp(bytes).metadata();
    expect(meta.exif).toBeUndefined();
    expect(meta.icc).toBeUndefined();
    expect(meta.format).toBe("jpeg");
  });

  it("AC-3 long edge sent is at most 1024 px for JPEG, PNG and WebP of any size", async () => {
    for (const bytes of [await jpegWithExif(4000, 3000), await png(3000, 5000), await webp(2048, 1024)]) {
      create.mockClear();
      await POST(multipart({ photo: fileOf(bytes) }));
      const meta = await sharp(Buffer.from(sentImage().data, "base64")).metadata();
      expect(Math.max(meta.width!, meta.height!)).toBeLessThanOrEqual(1024);
    }
  });

  it("AC-3 never enlarges a small photo", async () => {
    await POST(multipart({ photo: fileOf(await jpegWithExif(320, 240)) }));
    const meta = await sharp(Buffer.from(sentImage().data, "base64")).metadata();
    expect([meta.width, meta.height]).toEqual([320, 240]);
  });

  it("AC-2 EXIF orientation is applied to pixels, then dropped (rotated 90: 400x200 -> 200x400)", async () => {
    await POST(multipart({ photo: fileOf(await jpegWithExif(400, 200, 6)) }));
    const meta = await sharp(Buffer.from(sentImage().data, "base64")).metadata();
    expect([meta.width, meta.height]).toEqual([200, 400]);
    expect(meta.orientation).toBeUndefined();
  });
});

describe("AC-4 / AC-7 result body", () => {
  it("AC-4 returns every dish field plus request_id, model and dish_index; no UI text", async () => {
    const res = await POST(multipart({ photo: fileOf(await jpegWithExif(400, 300)) }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.is_food).toBe(true);
    expect(body.dishes[0]).toEqual(dish);
    expect(Object.keys(body).sort()).toEqual(["dish_index", "dishes", "is_food", "model", "request_id"]);
    expect(body.dish_index).toBe(0);
    expect(body.model).toBe("claude-sonnet-5-5");
  });

  it("AC-8 dish_hint + dish_index are echoed and the hint reaches the provider as quoted data", async () => {
    const res = await POST(multipart({ photo: fileOf(await png()), dish_hint: "ข้าวผัดกุ้ง", dish_index: "3" }));
    expect((await res.json()).dish_index).toBe(3);
    const text = create.mock.calls[0][0].messages[0].content[1].text as string;
    expect(text).toContain("ข้าวผัดกุ้ง");
  });

  it.each([
    ["dish_index without dish_hint", { dish_index: "1" }],
    ["dish_index 10", { dish_hint: "x", dish_index: "10" }],
    ["dish_index -1", { dish_hint: "x", dish_index: "-1" }],
    ["dish_hint over 80 chars", { dish_hint: "ก".repeat(81) }],
    ["empty dish_hint", { dish_hint: "" }],
  ])("AC-8 rejects %s with 400 BAD_REQUEST", async (_n, extra) => {
    const res = await POST(multipart({ photo: fileOf(await png()), ...extra }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("BAD_REQUEST");
    expect(create).not.toHaveBeenCalled();
  });

  it("AC-7 is_food=false returns no dishes and no kcal", async () => {
    create.mockResolvedValue(providerText({ is_food: false, dishes: [] }));
    const res = await POST(multipart({ photo: fileOf(await png()) }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ is_food: false, dishes: [] });
    expect(JSON.stringify(body)).not.toMatch(/kcal/);
  });
});

describe("AC-14 consent gate (server)", () => {
  it("AC-14 without consent: 403 CONSENT_REQUIRED, no provider call, no rate-limit count", async () => {
    vi.mocked(getConsentStatus).mockResolvedValue(consentNone);
    const res = await POST(multipart({ photo: fileOf(await png()) }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("CONSENT_REQUIRED");
    expect(body.error.message_th).toBe(CONTRACT_ERRORS.CONSENT_REQUIRED.message_th);
    expect(create).not.toHaveBeenCalled();
    expect(checkAndRecordAnalysis).not.toHaveBeenCalled();
  });

  it("AC-14 consent is checked before the body is read (garbage body still gets 403, not 400)", async () => {
    vi.mocked(getConsentStatus).mockResolvedValue(consentNone);
    const res = await POST(jsonReq("POST", "/api/analyze", { junk: true }, { origin: "http://qa.local" }));
    expect(res.status).toBe(403);
  });

  it("AC-16 withdrawn consent blocks analysis the same way", async () => {
    vi.mocked(getConsentStatus).mockResolvedValue({ ...consentNone, version: "2026-10-v1", withdrawn_at: "2026-10-08T01:00:00.000Z" });
    const res = await POST(multipart({ photo: fileOf(await png()) }));
    expect((await res.json()).error.code).toBe("CONSENT_REQUIRED");
    expect(create).not.toHaveBeenCalled();
  });

  it("AC-14 consent is looked up for the signed-in user and the current version", async () => {
    await POST(multipart({ photo: fileOf(await png()) }));
    expect(getConsentStatus).toHaveBeenCalledWith("user-1", "2026-10-v1");
  });
});

describe("AC-13 rate limit response", () => {
  it("AC-13 over the limit: 429 RATE_LIMITED, Retry-After seconds, Thai message, no provider call", async () => {
    vi.mocked(checkAndRecordAnalysis).mockResolvedValue({ allowed: false, retryAfterSec: 1234 });
    const res = await POST(multipart({ photo: fileOf(await png()) }));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("1234");
    const body = await res.json();
    expect(body.error).toMatchObject({ code: "RATE_LIMITED", message_th: CONTRACT_ERRORS.RATE_LIMITED.message_th, retryable: false });
    expect(create).not.toHaveBeenCalled();
  });

  it("AC-13 the limit is checked once per request, after consent and file validation", async () => {
    await POST(multipart({ photo: fileOf(await png()) }));
    expect(checkAndRecordAnalysis).toHaveBeenCalledTimes(1);
    expect(checkAndRecordAnalysis).toHaveBeenCalledWith("user-1");
  });

  it("AC-13/C-RATE the provider retry does not add a count", async () => {
    create.mockRejectedValueOnce(apiError(503)).mockResolvedValueOnce(okReply());
    await POST(multipart({ photo: fileOf(await png()) }));
    expect(create).toHaveBeenCalledTimes(2);
    expect(checkAndRecordAnalysis).toHaveBeenCalledTimes(1);
  });
});

describe("AC-11 / AC-12 provider failure handling", () => {
  const photo = async () => fileOf(await png());
  const expectManualFallback = async (res: Response, status: number, code: string) => {
    expect(res.status).toBe(status);
    const body = await res.json();
    expect(body.error.code).toBe(code);
    expect(body.error.message_th).toBe(CONTRACT_ERRORS[code].message_th);
    expect(body.error.fallback).toBe("manual");
    return body;
  };

  it("AC-11 retryable 503 then success: one retry, 200", async () => {
    create.mockRejectedValueOnce(apiError(503)).mockResolvedValueOnce(okReply());
    const res = await POST(multipart({ photo: await photo() }));
    expect(res.status).toBe(200);
    expect(create).toHaveBeenCalledTimes(2);
  });

  it.each([429, 500, 502, 503, 529])("AC-11 persistent HTTP %i: exactly 2 attempts then 502 PROVIDER_ERROR + manual fallback", async (status) => {
    create.mockRejectedValue(apiError(status));
    const res = await POST(multipart({ photo: await photo() }));
    expect(create).toHaveBeenCalledTimes(2);
    expect((await expectManualFallback(res, 502, "PROVIDER_ERROR")).error.retryable).toBe(true);
  });

  it.each([400, 401, 403, 404, 413])("AC-11 fatal HTTP %i is not retried: 1 attempt, 502 PROVIDER_ERROR", async (status) => {
    create.mockRejectedValue(apiError(status));
    const res = await POST(multipart({ photo: await photo() }));
    expect(create).toHaveBeenCalledTimes(1);
    await expectManualFallback(res, 502, "PROVIDER_ERROR");
  });

  it("AC-11 two timeouts: 504 PROVIDER_TIMEOUT retryable + manual fallback", async () => {
    create.mockRejectedValue(new Anthropic.APIConnectionTimeoutError());
    const res = await POST(multipart({ photo: await photo() }));
    expect(create).toHaveBeenCalledTimes(2);
    expect((await expectManualFallback(res, 504, "PROVIDER_TIMEOUT")).error.retryable).toBe(true);
  });

  it("AC-11 network error is retried once", async () => {
    create.mockRejectedValue(new Anthropic.APIConnectionError({ message: "down" }));
    const res = await POST(multipart({ photo: await photo() }));
    expect(create).toHaveBeenCalledTimes(2);
    expect(res.status).toBe(502);
  });

  it("AC-12 malformed JSON then valid: 200 after one retry", async () => {
    create.mockResolvedValueOnce(providerText("{not json")).mockResolvedValueOnce(okReply());
    const res = await POST(multipart({ photo: await photo() }));
    expect(res.status).toBe(200);
    expect(create).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["non-JSON text", "{not json"],
    ["wrong shape", { foo: 1 }],
    ["kcal_high below kcal_low", { is_food: true, dishes: [{ ...dish, kcal_low: 700, kcal_high: 600 }] }],
    ["kcal above 5000", { is_food: true, dishes: [{ ...dish, kcal_high: 5001 }] }],
    ["is_food true with no dishes", { is_food: true, dishes: [] }],
    ["is_food false with dishes", { is_food: false, dishes: [dish] }],
  ])("AC-12 twice invalid (%s): 2 attempts then 502 PROVIDER_INVALID_OUTPUT + manual fallback", async (_n, payload) => {
    create.mockResolvedValue(providerText(payload));
    const res = await POST(multipart({ photo: await photo() }));
    expect(create).toHaveBeenCalledTimes(2);
    await expectManualFallback(res, 502, "PROVIDER_INVALID_OUTPUT");
  });

  it("AC-12 invalid then provider error still stops at 2 attempts total (shared retry budget)", async () => {
    create.mockResolvedValueOnce(providerText("oops")).mockRejectedValueOnce(apiError(503));
    const res = await POST(multipart({ photo: await photo() }));
    expect(create).toHaveBeenCalledTimes(2);
    expect(res.status).toBe(502);
  });
});

describe("AC-21 request to the provider", () => {
  it("AC-21 sends only the allowlisted keys, model from FOOD_VISION_MODEL, no sampling/thinking/prefill", async () => {
    await POST(multipart({ photo: fileOf(await png()) }));
    const body = create.mock.calls[0][0];
    expect(Object.keys(body).sort()).toEqual(["max_tokens", "messages", "model", "output_config", "system"]);
    expect(body.model).toBe(process.env.FOOD_VISION_MODEL);
    for (const forbidden of ["temperature", "top_p", "top_k", "thinking"]) expect(body).not.toHaveProperty(forbidden);
    expect(body.messages).toHaveLength(1);
    expect(body.messages.at(-1).role).toBe("user");
    expect(body.output_config.effort).toBe("low");
    expect(body.output_config.format.type).toBe("json_schema");
  });

  it("AC-21 the SDK client is built with no automatic retries (we own the retry count)", async () => {
    // Observable consequence: a single 503 yields exactly 2 provider attempts (see AC-11), never 3+.
    create.mockRejectedValue(apiError(503));
    await POST(multipart({ photo: fileOf(await png()) }));
    expect(create).toHaveBeenCalledTimes(2);
  });
});

describe("check order and failure isolation", () => {
  it("origin, then session: signed-out user gets 401 before consent is looked at", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await POST(multipart({ photo: fileOf(await png()) }));
    expect(res.status).toBe(401);
    expect(getConsentStatus).not.toHaveBeenCalled();
  });
});
