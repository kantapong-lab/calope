import { vi } from "vitest";

export const HOST = "http://qa.local";
export const GOOD_ORIGIN = { origin: HOST };

export const consentActive = {
  required_version: "2026-10-v1",
  active: true,
  version: "2026-10-v1",
  consented_at: "2026-10-08T00:00:00.000Z",
  withdrawn_at: null,
};
export const consentNone = { ...consentActive, active: false, version: null, consented_at: null };

export const dish = {
  name_th: "ผัดไทย",
  name_en: "Pad Thai",
  grams: 280,
  kcal_low: 500,
  kcal_high: 650,
  confidence: 0.75,
  assumptions: ["ใช้น้ำมันปานกลาง"],
};

export const providerText = (obj: unknown) => ({
  content: [{ type: "text", text: typeof obj === "string" ? obj : JSON.stringify(obj) }],
  usage: { input_tokens: 900, output_tokens: 120 },
});
export const okReply = () => providerText({ is_food: true, dishes: [dish] });

export function multipart(
  fields: Record<string, string | Blob>,
  headers: Record<string, string> = GOOD_ORIGIN,
  url = `${HOST}/api/analyze`,
) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  return new Request(url, { method: "POST", body: form, headers });
}

export const fileOf = (bytes: Buffer | Uint8Array, name = "meal.jpg", type = "image/jpeg") =>
  new File([new Uint8Array(bytes)], name, { type });

export function jsonReq(method: string, path: string, body?: unknown, headers: Record<string, string> = GOOD_ORIGIN) {
  return new Request(`${HOST}${path}`, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

// Captures everything the process prints (console.* and raw stdout/stderr writes).
export function captureOutput() {
  const lines: string[] = [];
  const spies = (["log", "info", "warn", "error", "debug"] as const).map((m) =>
    vi.spyOn(console, m).mockImplementation((...args: unknown[]) => void lines.push(args.map(String).join(" "))),
  );
  const w1 = vi.spyOn(process.stdout, "write").mockImplementation(((c: unknown) => (lines.push(String(c)), true)) as never);
  const w2 = vi.spyOn(process.stderr, "write").mockImplementation(((c: unknown) => (lines.push(String(c)), true)) as never);
  return {
    text: () => lines.join("\n"),
    restore: () => [...spies, w1, w2].forEach((s) => s.mockRestore()),
  };
}
