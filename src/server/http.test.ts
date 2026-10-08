import { describe, expect, it, vi } from "vitest";

vi.mock("./auth", () => ({ auth: vi.fn() }));

const { api, assertSameOrigin } = await import("./http");
const { AppError } = await import("./errors");

const req = (headers: Record<string, string> = {}) => new Request("https://app.example/api/x", { method: "POST", headers });

describe("assertSameOrigin", () => {
  it("allows a matching Origin", () => {
    expect(() => assertSameOrigin(req({ origin: "https://app.example" }))).not.toThrow();
  });

  it("rejects a missing Origin, a different host, a different port and a malformed Origin", () => {
    expect(() => assertSameOrigin(req())).toThrow(AppError);
    for (const origin of ["https://evil.example", "https://app.example:8443", "not a url"]) {
      expect(() => assertSameOrigin(req({ origin }))).toThrow(AppError);
    }
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

  it("passes route params to the handler", async () => {
    const handler = api<{ id: string }>("DELETE /x/[id]", async (_req, params) => Response.json(params));
    const res = await handler(req(), { params: Promise.resolve({ id: "abc" }) });
    expect(await res.json()).toEqual({ id: "abc" });
  });
});
