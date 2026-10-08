// AC-20: no image bytes, base64 or EXIF marker in any output at any level, on every path
// (success, not-food, provider errors, invalid output, validation errors, internal error).
import Anthropic from "@anthropic-ai/sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { captureOutput, consentActive, fileOf, multipart, okReply, providerText } from "../../fixtures/harness";
import { apiError, createSpy } from "../../fixtures/provider.test";
import { EXIF_MARKER, jpegWithExif } from "../../fixtures/images";
import { auth } from "@/server/auth";
import { getConsentStatus } from "@/server/consent";
import { checkAndRecordAnalysis } from "@/server/rate-limit";
import { POST } from "@/app/api/analyze/route";

const create = createSpy();
let out: ReturnType<typeof captureOutput>;
let original: Buffer;

beforeEach(async () => {
  original = await jpegWithExif(1500, 1000);
  vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as never);
  vi.mocked(getConsentStatus).mockResolvedValue(consentActive);
  vi.mocked(checkAndRecordAnalysis).mockResolvedValue({ allowed: true });
  create.mockResolvedValue(okReply());
  out = captureOutput();
});
afterEach(() => {
  out.restore();
  create.mockReset();
  vi.clearAllMocks();
});

function assertClean(sentBase64?: string) {
  const logs = out.text();
  expect(logs.length).toBeGreaterThan(0); // the request line itself is logged, so this is not a vacuous pass
  expect(logs).not.toContain(EXIF_MARKER);
  for (const chunk of [original.toString("base64"), sentBase64 ?? ""].filter(Boolean)) {
    expect(logs).not.toContain(chunk.slice(0, 120));
    expect(logs).not.toContain(chunk.slice(-120));
  }
  expect(logs).not.toMatch(/\/9j\/[A-Za-z0-9+/]{40}/); // base64 of a JPEG header
  expect(logs).not.toContain("user-1"); // user id only as a hash
  expect(logs).not.toContain(process.env.ANTHROPIC_API_KEY!);
}
const sent = () => create.mock.calls[0]?.[0].messages[0].content[0].source.data as string | undefined;

describe("AC-20 no image bytes in logs", () => {
  it("success path", async () => {
    await POST(multipart({ photo: fileOf(original) }));
    assertClean(sent());
  });
  it("not-food path", async () => {
    create.mockResolvedValue(providerText({ is_food: false, dishes: [] }));
    await POST(multipart({ photo: fileOf(original) }));
    assertClean(sent());
  });
  it("provider error whose message contains the image base64 (SDK error echo)", async () => {
    const b64 = original.toString("base64");
    create.mockRejectedValue(new Error(`request failed for ${b64}`));
    const res = await POST(multipart({ photo: fileOf(original) }));
    expect(await res.text()).not.toContain(b64.slice(0, 100));
    assertClean(sent());
  });
  it("provider 503 twice", async () => {
    create.mockRejectedValue(apiError(503));
    await POST(multipart({ photo: fileOf(original) }));
    assertClean(sent());
  });
  it("timeout twice", async () => {
    create.mockRejectedValue(new Anthropic.APIConnectionTimeoutError());
    await POST(multipart({ photo: fileOf(original) }));
    assertClean(sent());
  });
  it("invalid provider output echoing the image", async () => {
    create.mockResolvedValue(providerText(original.toString("base64")));
    await POST(multipart({ photo: fileOf(original) }));
    assertClean(sent());
  });
  it("rate-limited path", async () => {
    vi.mocked(checkAndRecordAnalysis).mockResolvedValue({ allowed: false, retryAfterSec: 5 });
    await POST(multipart({ photo: fileOf(original) }));
    assertClean();
  });
  it("internal error whose exception message carries the image", async () => {
    vi.mocked(checkAndRecordAnalysis).mockRejectedValue(new Error(`bad ${original.toString("base64")} ${EXIF_MARKER}`));
    const res = await POST(multipart({ photo: fileOf(original) }));
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain(EXIF_MARKER);
    assertClean();
  });
  it("validation failure (bad dish_hint) path", async () => {
    await POST(multipart({ photo: fileOf(original), dish_hint: "x".repeat(200) }));
    assertClean();
  });
  it("log lines are JSON metadata only (allowlisted keys)", async () => {
    await POST(multipart({ photo: fileOf(original), dish_hint: "ผัดไทยลับ" }));
    const allowed = new Set(["request_id", "route", "status", "latency_ms", "user_hash", "model", "input_tokens", "output_tokens", "attempts", "error_code", "error_name"]);
    const lines = out.text().split("\n").filter((l) => l.startsWith("{"));
    expect(lines.length).toBeGreaterThan(0);
    for (const l of lines) for (const k of Object.keys(JSON.parse(l))) expect(allowed.has(k)).toBe(true);
    expect(out.text()).not.toContain("ผัดไทยลับ");
  });
});
