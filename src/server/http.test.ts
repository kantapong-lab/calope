import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./auth", () => ({ auth: vi.fn() }));

const { api, assertSameOrigin } = await import("./http");
const { AppError } = await import("./errors");

// The URL host is deliberately different from every expected host: it must never be used.
const req = (headers: Record<string, string> = {}) => new Request("http://0.0.0.0:3000/api/x", { method: "POST", headers });

describe("assertSameOrigin", () => {
  afterEach(() => {
    delete process.env.APP_ORIGIN;
  });

  it("passes when Origin matches APP_ORIGIN, ignoring the Host header", () => {
    process.env.APP_ORIGIN = "http://localhost:3000";
    expect(() => assertSameOrigin(req({ origin: "http://localhost:3000", host: "other:1" }))).not.toThrow();
  });

  it("fails when Origin differs from APP_ORIGIN, even if it equals the Host header", () => {
    process.env.APP_ORIGIN = "http://localhost:3000";
    expect(() => assertSameOrigin(req({ origin: "http://127.0.0.1:3000", host: "127.0.0.1:3000" }))).toThrow(AppError);
  });

  it("falls back to the Host header when APP_ORIGIN is unset", () => {
    expect(() => assertSameOrigin(req({ origin: "http://127.0.0.1:3000", host: "127.0.0.1:3000" }))).not.toThrow();
    expect(() => assertSameOrigin(req({ origin: "http://localhost:3000", host: "127.0.0.1:3000" }))).toThrow(AppError);
  });

  it("ignores the req.url host (0.0.0.0:3000 in a container)", () => {
    expect(() => assertSameOrigin(req({ origin: "http://0.0.0.0:3000", host: "localhost:3000" }))).toThrow(AppError);
    process.env.APP_ORIGIN = "http://localhost:3000";
    expect(() => assertSameOrigin(req({ origin: "http://0.0.0.0:3000" }))).toThrow(AppError);
  });

  it("rejects a missing or malformed Origin and a missing expected host", () => {
    process.env.APP_ORIGIN = "http://localhost:3000";
    expect(() => assertSameOrigin(req())).toThrow(AppError);
    expect(() => assertSameOrigin(req({ origin: "not a url" }))).toThrow(AppError);
    delete process.env.APP_ORIGIN;
    expect(() => assertSameOrigin(req({ origin: "http://localhost:3000" }))).toThrow(AppError);
  });

  it("rejects a different port", () => {
    process.env.APP_ORIGIN = "http://localhost:3000";
    expect(() => assertSameOrigin(req({ origin: "http://localhost:3001" }))).toThrow(AppError);
  });
});

describe("api wrapper", () => {
  it("turns an AppError into the Thai error envelope", async () => {
    const handler = api("POST /x", async () => {
      throw new AppError("NOT_FOUND");
    });
    const res = await handler(req());
    expect(res.status).toBe(404);
    expect((await res.json()).error.message_th).toBe("ไม่พบรายการนี้");
  });

  it("hides unexpected errors behind INTERNAL_ERROR and logs only the error name", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const handler = api("POST /x", async () => {
      throw new Error("secret detail with postgres://user:pw@host");
    });
    const res = await handler(req());
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe("INTERNAL_ERROR");
    const line = String(log.mock.calls[0][0]);
    expect(line).toContain('"error_name":"Error"');
    expect(line).not.toContain("secret detail");
    log.mockRestore();
  });

  it("adds fallback manual to INTERNAL_ERROR only when the route asks for it", async () => {
    const boom = async () => {
      throw new Error("x");
    };
    expect((await (await api("POST /a", boom, { fallbackManual: true })(req())).json()).error.fallback).toBe("manual");
    expect((await (await api("POST /b", boom)(req())).json()).error.fallback).toBeUndefined();
  });

  it("passes route params to the handler", async () => {
    const handler = api<{ id: string }>("DELETE /x/[id]", async (_req, params) => Response.json(params));
    const res = await handler(req(), { params: Promise.resolve({ id: "abc" }) });
    expect(await res.json()).toEqual({ id: "abc" });
  });
});
