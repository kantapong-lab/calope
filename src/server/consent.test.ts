import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { toConsentStatus } = await import("./consent");

const record = (patch: Partial<Parameters<typeof toConsentStatus>[0] & object> = {}) => ({
  id: "r1",
  userId: "u1",
  version: "v2",
  consentedAt: new Date("2026-10-08T10:00:00.000Z"),
  withdrawnAt: null,
  supersededAt: null,
  ...patch,
});

describe("toConsentStatus", () => {
  it("is inactive with nulls when the user has no record", () => {
    expect(toConsentStatus(undefined, "v2")).toEqual({
      required_version: "v2",
      active: false,
      version: null,
      consented_at: null,
      withdrawn_at: null,
    });
  });

  it("is active for a non-withdrawn record at the required version", () => {
    const status = toConsentStatus(record(), "v2");
    expect(status.active).toBe(true);
    expect(status.consented_at).toBe("2026-10-08T10:00:00.000Z");
    expect(status.withdrawn_at).toBeNull();
  });

  it("is inactive after withdrawal and reports the timestamp", () => {
    const status = toConsentStatus(record({ withdrawnAt: new Date("2026-10-09T01:00:00.000Z") }), "v2");
    expect(status.active).toBe(false);
    expect(status.withdrawn_at).toBe("2026-10-09T01:00:00.000Z");
  });

  it("is inactive when the record was superseded, with withdrawn_at still null", () => {
    const status = toConsentStatus(record({ supersededAt: new Date("2026-10-09T01:00:00.000Z") }), "v2");
    expect(status.active).toBe(false);
    expect(status.withdrawn_at).toBeNull();
  });

  it("is inactive when the record is for an older version", () => {
    const status = toConsentStatus(record({ version: "v1" }), "v2");
    expect(status.active).toBe(false);
    expect(status.version).toBe("v1");
  });
});
