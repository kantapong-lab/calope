// Explicitly NOT RUN items, kept as visible skipped tests with reasons (never faked as passing).
import { describe, it } from "vitest";

describe("not-run items", () => {
  it.skip("AC-24 spike quality gate (median error <= 30%, dish >= 80%, range hit >= 70%, p95 <= 10 s, <= $0.01): needs the live Anthropic API and the weighed 30+ dish set in SPIKE_DATA_DIR (outside the repo); live provider calls are forbidden in QA", () => {});
  it.skip("AC-24 Haiku 5.5 image token usage on a 2000x1500 image: needs the live Anthropic API", () => {});
  it.skip("AC-3/AC-2 client side: createImageBitmap + Canvas resize to <= 1024 px and EXIF drop in a real browser: needs Playwright/Chromium (not a dependency; package.json is devops-owned); jsdom has no canvas", () => {});
  it.skip("AC-19 network trace: browser devtools/network capture of a real session: needs Playwright and real Google sign-in", () => {});
  it.skip("Auth.js Google sign-in, session cookie flags (HttpOnly, SameSite=Lax, Secure): needs real OAuth credentials and a browser", () => {});
});
