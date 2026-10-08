import Anthropic from "@anthropic-ai/sdk";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("../shared/consent", () => ({ CONSENT_VERSION: "test-v1" }));
vi.mock("./auth", () => ({ auth: vi.fn(async () => ({ user: { id: "user-1" } })) }));
vi.mock("./consent", () => ({ getConsentStatus: vi.fn() }));
vi.mock("./rate-limit", () => ({ checkAndRecordAnalysis: vi.fn() }));

Object.assign(process.env, {
  ANTHROPIC_API_KEY: "test-key-not-real",
  FOOD_VISION_MODEL: "claude-sonnet-5-5",
  DATABASE_URL: "postgres://unused",
  AUTH_SECRET: "s",
  AUTH_GOOGLE_ID: "id",
  AUTH_GOOGLE_SECRET: "secret",
});

const { POST } = await import("../app/api/analyze/route");
const { auth } = await import("./auth");
const { getConsentStatus } = await import("./consent");
const { checkAndRecordAnalysis } = await import("./rate-limit");

const MARKER = "ROUTE-PHOTO-MARKER-98765";
const dish = {
  name_th: "ผัดไทย",
  name_en: "Pad Thai",
  grams: 280,
  kcal_low: 500,
  kcal_high: 650,
  confidence: 0.75,
  assumptions: ["ใช้น้ำมันปานกลาง"],
};
const providerReply = {
  content: [{ type: "text", text: JSON.stringify({ is_food: true, dishes: [dish] }) }],
  usage: { input_tokens: 900, output_tokens: 120 },
};

const create = vi.spyOn(Anthropic.Messages.prototype, "create") as unknown as ReturnType<typeof vi.fn>;
const consentActive = { required_version: "test-v1", active: true, version: "test-v1", consented_at: null, withdrawn_at: null };

async function photoWithExif(width = 2000, height = 1500) {
  return sharp({ create: { width, height, channels: 3, background: "#aa8844" } })
    .withExif({ IFD0: { Copyright: MARKER, Make: MARKER } })
    .jpeg()
    .toBuffer();
}

function request(fields: Record<string, string | Blob>, headers: Record<string, string> = { origin: "http://localhost" }) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  return new Request("http://localhost/api/analyze", { method: "POST", body: form, headers });
}
const asFile = (bytes: Buffer, name = "meal.jpg") => new File([new Uint8Array(bytes)], name);

let printed: string[];
const consoleSpies: { mockRestore: () => void }[] = [];
beforeEach(() => {
  printed = [];
  for (const m of ["log", "info", "warn", "error", "debug"] as const) {
    consoleSpies.push(vi.spyOn(console, m).mockImplementation((...args) => void printed.push(args.map(String).join(" "))));
  }
  vi.mocked(getConsentStatus).mockResolvedValue(consentActive);
  vi.mocked(checkAndRecordAnalysis).mockResolvedValue({ allowed: true });
  create.mockResolvedValue(providerReply);
});
afterEach(() => {
  create.mockReset();
  vi.mocked(auth).mockClear();
  vi.mocked(getConsentStatus).mockReset();
  vi.mocked(checkAndRecordAnalysis).mockReset();
  consoleSpies.splice(0).forEach((s) => s.mockRestore());
});

describe("POST /api/analyze", () => {
  it("returns the dishes with request_id, model and echoed dish_index", async () => {
    const res = await POST(request({ photo: asFile(await photoWithExif()), dish_hint: "ผัดไทยกุ้ง", dish_index: "2" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ is_food: true, dishes: [dish], model: "claude-sonnet-5-5", dish_index: 2 });
    expect(body.request_id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("defaults dish_index to 0", async () => {
    const res = await POST(request({ photo: asFile(await photoWithExif(400, 300)) }));
    expect((await res.json()).dish_index).toBe(0);
  });

  it("sends the provider a resized JPEG with no EXIF or marker (AC-2, AC-3)", async () => {
    const original = await photoWithExif();
    expect(original.includes(MARKER)).toBe(true);
    await POST(request({ photo: asFile(original) }));
    const sent = create.mock.calls[0][0].messages[0].content[0].source;
    const bytes = Buffer.from(sent.data, "base64");
    const meta = await sharp(bytes).metadata();
    expect(sent.media_type).toBe("image/jpeg");
    expect(Math.max(meta.width!, meta.height!)).toBeLessThanOrEqual(1024);
    expect(meta.exif).toBeUndefined();
    expect(bytes.includes(MARKER)).toBe(false);
  });

  it("logs metadata only: no marker, image bytes or base64 (AC-20)", async () => {
    const original = await photoWithExif();
    await POST(request({ photo: asFile(original) }));
    const sentBase64: string = create.mock.calls[0][0].messages[0].content[0].source.data;
    const logs = printed.join("\n");
    expect(logs).toContain("POST /api/analyze");
    expect(logs).not.toContain(MARKER);
    expect(logs).not.toContain(original.toString("base64").slice(0, 200));
    expect(logs).not.toContain(sentBase64.slice(0, 200));
    expect(logs).not.toContain("user-1");
  });

  it("returns is_food=false without dishes", async () => {
    create.mockResolvedValue({ ...providerReply, content: [{ type: "text", text: '{"is_food":false,"dishes":[]}' }] });
    const body = await (await POST(request({ photo: asFile(await photoWithExif(300, 300)) }))).json();
    expect(body).toMatchObject({ is_food: false, dishes: [] });
  });

  it("rejects an unauthenticated caller with 401 before anything else", async () => {
    vi.mocked(auth).mockResolvedValueOnce(null as never);
    const res = await POST(request({ photo: asFile(await photoWithExif(100, 100)) }));
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("UNAUTHENTICATED");
    expect(getConsentStatus).not.toHaveBeenCalled();
  });

  it("rejects a cross-origin request with BAD_ORIGIN", async () => {
    const res = await POST(request({ photo: asFile(await photoWithExif(100, 100)) }, { origin: "https://evil.example" }));
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("BAD_ORIGIN");
    expect(create).not.toHaveBeenCalled();
  });

  it("accepts a same-origin request", async () => {
    const res = await POST(request({ photo: asFile(await photoWithExif(100, 100)) }, { origin: "http://localhost" }));
    expect(res.status).toBe(200);
  });

  it("returns 403 CONSENT_REQUIRED without touching the body, rate limit or provider (AC-14)", async () => {
    vi.mocked(getConsentStatus).mockResolvedValue({ ...consentActive, active: false });
    const req = request({ photo: asFile(await photoWithExif(100, 100)) });
    const formData = vi.spyOn(req, "formData");
    const res = await POST(req);
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("CONSENT_REQUIRED");
    expect(formData).not.toHaveBeenCalled();
    expect(checkAndRecordAnalysis).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("returns 400 INVALID_FILE_TYPE for a GIF labelled image/jpeg, with no provider call or rate-limit count", async () => {
    const gif = new File([new Uint8Array(Buffer.from("GIF89a-not-a-jpeg"))], "x.jpg", { type: "image/jpeg" });
    const res = await POST(request({ photo: gif }));
    expect(res.status).toBe(400);
    const { error } = await res.json();
    expect(error.code).toBe("INVALID_FILE_TYPE");
    expect(error.message_th).toContain("10 MB");
    expect(checkAndRecordAnalysis).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("returns 400 INVALID_FILE_TYPE for a corrupt JPEG and uses no rate-limit slot", async () => {
    const corrupt = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 1)]);
    const res = await POST(request({ photo: asFile(corrupt) }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_FILE_TYPE");
    expect(checkAndRecordAnalysis).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("returns 413 FILE_TOO_LARGE above the 4 MB server cap", async () => {
    const big = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(4_000_001)]);
    const res = await POST(request({ photo: asFile(big) }));
    expect(res.status).toBe(413);
    const { error } = await res.json();
    expect(error.code).toBe("FILE_TOO_LARGE");
    expect(error.message_th).toBe("ไฟล์ที่ส่งมาใหญ่เกิน 4 MB หลังย่อรูป กรุณาเลือกรูปอื่น (ต้นฉบับต้องไม่เกิน 10 MB)");
    expect(create).not.toHaveBeenCalled();
  });

  it("returns 400 BAD_REQUEST when photo is missing or dish_index comes without dish_hint", async () => {
    expect((await POST(request({ dish_hint: "x" }))).status).toBe(400);
    const res = await POST(request({ photo: asFile(await photoWithExif(100, 100)), dish_index: "1" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("BAD_REQUEST");
    expect(create).not.toHaveBeenCalled();
  });

  it("returns 429 with Retry-After and no provider call when rate limited (AC-13)", async () => {
    vi.mocked(checkAndRecordAnalysis).mockResolvedValue({ allowed: false, retryAfterSec: 321 });
    const res = await POST(request({ photo: asFile(await photoWithExif(100, 100)) }));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("321");
    expect((await res.json()).error.code).toBe("RATE_LIMITED");
    expect(create).not.toHaveBeenCalled();
  });

  it("returns 502 PROVIDER_ERROR with manual fallback after a persistent 503 (AC-11)", async () => {
    create.mockRejectedValue(Anthropic.APIError.generate(503, {}, "down", new Headers()));
    const res = await POST(request({ photo: asFile(await photoWithExif(100, 100)) }));
    expect(res.status).toBe(502);
    const { error } = await res.json();
    expect(error).toMatchObject({ code: "PROVIDER_ERROR", retryable: true, fallback: "manual" });
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("returns 500 INTERNAL_ERROR with fallback manual and no exception text on an unexpected fault", async () => {
    vi.mocked(checkAndRecordAnalysis).mockRejectedValue(new Error("db password leaked"));
    const res = await POST(request({ photo: asFile(await photoWithExif(100, 100)) }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatchObject({ code: "INTERNAL_ERROR", retryable: true, fallback: "manual" });
    expect(JSON.stringify(body)).not.toContain("leaked");
  });

  it("returns 504 PROVIDER_TIMEOUT when both attempts time out", async () => {
    create.mockRejectedValue(new Anthropic.APIConnectionTimeoutError());
    const res = await POST(request({ photo: asFile(await photoWithExif(100, 100)) }));
    expect(res.status).toBe(504);
    expect((await res.json()).error.code).toBe("PROVIDER_TIMEOUT");
  });

  it("returns 502 PROVIDER_INVALID_OUTPUT after two malformed replies (AC-12)", async () => {
    create.mockResolvedValue({ ...providerReply, content: [{ type: "text", text: "nope" }] });
    const res = await POST(request({ photo: asFile(await photoWithExif(100, 100)) }));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatchObject({ code: "PROVIDER_INVALID_OUTPUT", fallback: "manual" });
    expect(create).toHaveBeenCalledTimes(2);
  });
});
