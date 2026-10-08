import type { Dish, Meal, MealItemIn } from "@/shared/api-types";
import { CONSENT_VERSION } from "@/shared/consent";
import { th } from "@/copy/th";

export type ConsentState = {
  required_version: string;
  active: boolean;
  version: string | null;
  consented_at: string | null;
  withdrawn_at: string | null;
};

export type AnalyzeResponse = {
  request_id: string;
  model: string;
  is_food: boolean;
  dishes: Dish[];
  dish_index: number;
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly messageTh: string,
    readonly retryable = false,
    readonly fallback?: string,
    readonly retryAfter?: number,
  ) {
    super(code);
  }
}

async function toError(res: Response): Promise<ApiError> {
  // Platform 413 (body over Vercel limit) arrives without our envelope.
  let body: { error?: { code?: string; message_th?: string; retryable?: boolean; fallback?: string } } = {};
  try {
    body = await res.json();
  } catch {
    // not JSON
  }
  const retryAfter = Number(res.headers.get("Retry-After")) || undefined;
  const err = body.error;
  if (err?.code) {
    return new ApiError(res.status, err.code, err.message_th ?? th.genericError, err.retryable, err.fallback, retryAfter);
  }
  if (res.status === 413) return new ApiError(413, "FILE_TOO_LARGE", th.rejected.body);
  return new ApiError(res.status, "UNKNOWN", th.genericError);
}

async function request(url: string, init?: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new ApiError(0, "NETWORK", th.genericError);
  }
  if (res.ok) return res;
  const err = await toError(res);
  if (err.code === "UNAUTHENTICATED" && typeof window !== "undefined") {
    window.location.assign("/signin?signedout=1");
  }
  throw err;
}

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export async function getConsent(): Promise<ConsentState> {
  return (await request("/api/consent")).json();
}

export async function postConsent(): Promise<ConsentState> {
  return (await request("/api/consent", json({ version: CONSENT_VERSION, accepted: true }))).json();
}

export async function deleteConsent(): Promise<ConsentState> {
  return (await request("/api/consent", { method: "DELETE" })).json();
}

export async function analyze(
  photo: Blob,
  opts: { dishHint?: string; dishIndex?: number } = {},
  signal?: AbortSignal,
): Promise<AnalyzeResponse> {
  const form = new FormData();
  form.append("photo", new File([photo], "photo.jpg", { type: "image/jpeg" }));
  if (opts.dishHint) {
    form.append("dish_hint", opts.dishHint);
    form.append("dish_index", String(opts.dishIndex ?? 0));
  }
  return (await request("/api/analyze", { method: "POST", body: form, signal })).json();
}

export async function saveMeals(items: MealItemIn[]): Promise<Meal[]> {
  const body = (await (await request("/api/meals", json({ items }))).json()) as { items: Meal[] };
  return body.items;
}

export async function listMeals(before?: string): Promise<{ items: Meal[]; next_before: string | null }> {
  const query = before ? `?before=${encodeURIComponent(before)}` : "";
  return (await request(`/api/meals${query}`)).json();
}

export async function deleteMeal(id: string): Promise<void> {
  try {
    await request(`/api/meals/${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch (e) {
    if (e instanceof ApiError && e.code === "NOT_FOUND") return;
    throw e;
  }
}

export async function deleteAllMeals(): Promise<void> {
  await request("/api/meals?confirm=true", { method: "DELETE" });
}
