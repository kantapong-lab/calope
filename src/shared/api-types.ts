export type Dish = {
  name_th: string;
  name_en: string;
  grams: number;
  kcal_low: number;
  kcal_high: number;
  confidence: number;
  assumptions: string[];
};

export type AnalysisResult =
  | { is_food: true; dishes: Dish[] }
  | { is_food: false; dishes: [] };

export type AnalyzeResponse = AnalysisResult & {
  request_id: string;
  model: string;
  dish_index: number;
};

export type MealItemIn = {
  dish_name_th: string;
  dish_name_en?: string | null;
  portion_grams: number;
  kcal_low: number;
  kcal_high: number;
  edited: boolean;
  source: "ai" | "manual";
};

export type Meal = Omit<MealItemIn, "dish_name_en"> & {
  dish_name_en: string | null;
  id: string;
  created_at: string;
};

export type MealsCreateResponse = { items: Meal[] };
export type MealsListResponse = { items: Meal[]; next_before: string | null };

export type ConsentStatus = {
  required_version: string;
  active: boolean;
  version: string | null;
  consented_at: string | null;
  withdrawn_at: string | null;
};

export type ErrorCode =
  | "UNAUTHENTICATED"
  | "BAD_ORIGIN"
  | "BAD_REQUEST"
  | "NOT_FOUND"
  | "CONSENT_REQUIRED"
  | "CONSENT_VERSION_MISMATCH"
  | "INVALID_FILE_TYPE"
  | "FILE_TOO_LARGE"
  | "RATE_LIMITED"
  | "PROVIDER_ERROR"
  | "PROVIDER_TIMEOUT"
  | "PROVIDER_INVALID_OUTPUT"
  | "INTERNAL_ERROR";

export type ApiErrorBody = {
  error: {
    code: ErrorCode;
    message_th: string;
    retryable: boolean;
    fallback?: "manual";
    details?: { path: string; code: string }[];
    required_version?: string;
  };
};
