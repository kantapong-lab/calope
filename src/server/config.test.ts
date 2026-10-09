import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { parseConfig, validateModelId } = await import("./config");

const base = {
  ANTHROPIC_API_KEY: "test-key",
  DATABASE_URL: "postgres://test",
  AUTH_SECRET: "s",
  AUTH_GOOGLE_ID: "id",
  AUTH_GOOGLE_SECRET: "secret",
};

describe("parseConfig", () => {
  it("defaults the model to claude-sonnet-5-5 and limits to 20 per hour, 22 s per attempt", () => {
    const config = parseConfig(base);
    expect(config.visionModel).toBe("claude-sonnet-5-5");
    expect(config.analyzeRateLimitPerHour).toBe(20);
    expect(config.analyzeAttemptTimeoutMs).toBe(22000);
  });

  it("uses FOOD_VISION_MODEL when set", () => {
    expect(parseConfig({ ...base, FOOD_VISION_MODEL: "claude-haiku-5-5" }).visionModel).toBe("claude-haiku-5-5");
  });

  it.each([
    ["empty", ""],
    ["a -latest alias", "claude-sonnet-latest"],
    ["an alias without a version", "claude-sonnet"],
    ["uppercase", "Claude-Sonnet-5-5"],
    ["a non-claude id", "gpt-5"],
    ["trailing dash", "claude-sonnet-5-"],
  ])("rejects FOOD_VISION_MODEL that is %s", (_label, model) => {
    expect(() => parseConfig({ ...base, FOOD_VISION_MODEL: model })).toThrow(/FOOD_VISION_MODEL/);
  });

  it.each(["ANTHROPIC_API_KEY", "DATABASE_URL", "AUTH_SECRET", "AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET"])(
    "fails fast when %s is missing",
    (name) => {
      expect(() => parseConfig({ ...base, [name]: undefined })).toThrow(name);
    },
  );

  it("reads the rate limit override and rejects a non-integer", () => {
    expect(parseConfig({ ...base, ANALYZE_RATE_LIMIT_PER_HOUR: "5" }).analyzeRateLimitPerHour).toBe(5);
    expect(() => parseConfig({ ...base, ANALYZE_RATE_LIMIT_PER_HOUR: "abc" })).toThrow(/ANALYZE_RATE_LIMIT_PER_HOUR/);
    expect(() => parseConfig({ ...base, ANALYZE_RATE_LIMIT_PER_HOUR: "0" })).toThrow(/ANALYZE_RATE_LIMIT_PER_HOUR/);
  });

  it("does not put the API key in the error message", () => {
    expect(() => parseConfig({ ...base, FOOD_VISION_MODEL: "" })).toThrow(/^(?!.*test-key)/);
  });
});

describe("validateModelId", () => {
  it("accepts dated and undated exact ids", () => {
    expect(validateModelId("claude-sonnet-5-5")).toBeNull();
    expect(validateModelId("claude-sonnet-4-20250514")).toBeNull();
  });
});
