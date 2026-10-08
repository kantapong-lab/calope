// Node-side harness: fake env, DB-backed modules mocked, outbound provider traffic forbidden.
import { vi } from "vitest";
import { FAKE_ENV } from "../fixtures/env";

Object.assign(process.env, FAKE_ENV);

vi.mock("server-only", () => ({}));
vi.mock("@/server/auth", () => ({ auth: vi.fn() }));
vi.mock("@/server/consent", () => ({
  getConsentStatus: vi.fn(),
  recordConsent: vi.fn(),
  withdrawConsent: vi.fn(),
}));
vi.mock("@/server/rate-limit", () => ({ checkAndRecordAnalysis: vi.fn() }));
vi.mock("@/server/meals", () => ({
  createMeals: vi.fn(),
  listMeals: vi.fn(),
  deleteMeal: vi.fn(),
  deleteAllMeals: vi.fn(),
}));

// The live Anthropic call must never happen in QA: any request to the provider host throws.
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
  if (/anthropic\.com/i.test(url)) throw new Error(`QA guard: live provider call blocked (${url})`);
  return realFetch(input, init);
}) as typeof fetch;
