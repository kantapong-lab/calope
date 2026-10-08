import "server-only";

const DEFAULT_MODEL = "claude-sonnet-5-5";
const MODEL_ID = /^claude-[a-z0-9]+(-[a-z0-9]+)*$/;

export type Config = {
  anthropicApiKey: string;
  visionModel: string;
  databaseUrl: string;
  analyzeRateLimitPerHour: number;
  analyzeAttemptTimeoutMs: number;
};

type Env = Record<string, string | undefined>;

function required(env: Env, name: string, problems: string[]): string {
  const value = env[name]?.trim();
  if (!value) problems.push(`${name} is required`);
  return value ?? "";
}

function positiveInt(env: Env, name: string, fallback: number, problems: string[]): number {
  const raw = env[name];
  if (raw === undefined) return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) {
    problems.push(`${name} must be a positive integer`);
    return fallback;
  }
  return n;
}

export function validateModelId(id: string): string | null {
  if (!id) return "FOOD_VISION_MODEL must not be empty";
  if (!MODEL_ID.test(id)) return "FOOD_VISION_MODEL must match ^claude-[a-z0-9]+(-[a-z0-9]+)*$";
  if (id.endsWith("-latest") || !/\d/.test(id)) {
    return "FOOD_VISION_MODEL must be an exact model ID, not an alias";
  }
  return null;
}

export function parseConfig(env: Env): Config {
  const problems: string[] = [];

  const modelRaw = env.FOOD_VISION_MODEL === undefined ? DEFAULT_MODEL : env.FOOD_VISION_MODEL.trim();
  const modelProblem = validateModelId(modelRaw);
  if (modelProblem) problems.push(modelProblem);

  const config: Config = {
    anthropicApiKey: required(env, "ANTHROPIC_API_KEY", problems),
    visionModel: modelRaw,
    databaseUrl: required(env, "DATABASE_URL", problems),
    analyzeRateLimitPerHour: positiveInt(env, "ANALYZE_RATE_LIMIT_PER_HOUR", 20, problems),
    analyzeAttemptTimeoutMs: positiveInt(env, "ANALYZE_ATTEMPT_TIMEOUT_MS", 22000, problems),
  };
  for (const name of ["AUTH_SECRET", "AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET"]) {
    required(env, name, problems);
  }

  if (problems.length > 0) {
    throw new Error(`Invalid server configuration: ${problems.join("; ")}`);
  }
  return config;
}

let cached: Config | undefined;

export function getConfig(): Config {
  cached ??= parseConfig(process.env);
  return cached;
}
