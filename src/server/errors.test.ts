import { describe, expect, it } from "vitest";
import type { ErrorCode } from "../shared/api-types";
import { ERROR_SPECS, errorResponse } from "./errors";

const codes = Object.keys(ERROR_SPECS) as ErrorCode[];

describe("errorResponse", () => {
  it.each(codes)("%s carries a Thai message_th and the contract envelope", async (code) => {
    const res = errorResponse(code);
    const { error } = await res.json();
    expect(res.status).toBe(ERROR_SPECS[code].status);
    expect(error.code).toBe(code);
    expect(error.message_th).toMatch(/[฀-๿]/);
    expect(typeof error.retryable).toBe("boolean");
  });

  it("uses the contract text for INTERNAL_ERROR", async () => {
    const { error } = await errorResponse("INTERNAL_ERROR").json();
    expect(error.message_th).toBe("เกิดข้อผิดพลาดภายในระบบ กรุณาลองอีกครั้ง");
    expect(error.retryable).toBe(true);
  });

  it("maps the contract statuses", () => {
    expect(errorResponse("UNAUTHENTICATED").status).toBe(401);
    expect(errorResponse("BAD_ORIGIN").status).toBe(403);
    expect(errorResponse("CONSENT_REQUIRED").status).toBe(403);
    expect(errorResponse("CONSENT_VERSION_MISMATCH").status).toBe(409);
    expect(errorResponse("INVALID_FILE_TYPE").status).toBe(400);
    expect(errorResponse("FILE_TOO_LARGE").status).toBe(413);
    expect(errorResponse("RATE_LIMITED").status).toBe(429);
    expect(errorResponse("PROVIDER_ERROR").status).toBe(502);
    expect(errorResponse("PROVIDER_INVALID_OUTPUT").status).toBe(502);
    expect(errorResponse("PROVIDER_TIMEOUT").status).toBe(504);
  });

  it("states the 10 MB limit in both file errors", async () => {
    for (const code of ["INVALID_FILE_TYPE", "FILE_TOO_LARGE"] as const) {
      const { error } = await errorResponse(code).json();
      expect(error.message_th).toContain("10 MB");
    }
  });

  it("sets fallback manual on provider errors only", async () => {
    for (const code of ["PROVIDER_ERROR", "PROVIDER_TIMEOUT", "PROVIDER_INVALID_OUTPUT"] as const) {
      expect((await errorResponse(code).json()).error.fallback).toBe("manual");
    }
    expect((await errorResponse("RATE_LIMITED").json()).error.fallback).toBeUndefined();
  });

  it("marks provider error and timeout retryable, invalid output not", async () => {
    expect((await errorResponse("PROVIDER_ERROR").json()).error.retryable).toBe(true);
    expect((await errorResponse("PROVIDER_TIMEOUT").json()).error.retryable).toBe(true);
    expect((await errorResponse("PROVIDER_INVALID_OUTPUT").json()).error.retryable).toBe(false);
  });

  it("adds Retry-After and required_version when given", async () => {
    expect(errorResponse("RATE_LIMITED", { retryAfterSec: 90 }).headers.get("Retry-After")).toBe("90");
    const { error } = await errorResponse("CONSENT_VERSION_MISMATCH", { required_version: "v2" }).json();
    expect(error.required_version).toBe("v2");
  });
});
