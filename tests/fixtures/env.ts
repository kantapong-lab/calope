// Fake provider key: distinctive so the bundle scan (AC-19) can search for the exact value.
export const FAKE_KEY = "sk-ant-api03-QAFAKEKEY0123456789abcdefABCDEF-zzTESTONLY";

export const FAKE_ENV = {
  ANTHROPIC_API_KEY: FAKE_KEY,
  FOOD_VISION_MODEL: "claude-sonnet-5-5",
  DATABASE_URL: "postgres://qa:qa@127.0.0.1:1/unused",
  AUTH_SECRET: "qa-auth-secret-not-real",
  AUTH_GOOGLE_ID: "qa-google-id",
  AUTH_GOOGLE_SECRET: "qa-google-secret",
};
