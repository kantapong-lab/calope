// AC-21 (config), AC-19 (source-level key hygiene), AC-22 (Thai copy), AC-23 (no Thai food data).
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseConfig } from "@/server/config";
import { th } from "@/copy/th";

const ROOT = path.resolve(__dirname, "../../..");
const baseEnv = {
  ANTHROPIC_API_KEY: "k",
  DATABASE_URL: "postgres://x",
  AUTH_SECRET: "s",
  AUTH_GOOGLE_ID: "i",
  AUTH_GOOGLE_SECRET: "g",
};

function* walk(dir: string): Generator<string> {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next", ".git", ".team", ".claude", ".vercel"].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}

describe("AC-21 FOOD_VISION_MODEL from config", () => {
  it("AC-21 defaults to claude-sonnet-5-5 when unset", () => {
    expect(parseConfig(baseEnv).visionModel).toBe("claude-sonnet-5-5");
  });
  it("AC-21 uses the exact ID given (claude-haiku-5-5)", () => {
    expect(parseConfig({ ...baseEnv, FOOD_VISION_MODEL: "claude-haiku-5-5" }).visionModel).toBe("claude-haiku-5-5");
  });
  it.each(["", "  ", "sonnet", "claude-sonnet-latest", "claude-sonnet", "Claude-Sonnet-5-5", "claude sonnet 5", "gpt-5"])(
    "AC-21 startup rejects %j",
    (model) => {
      expect(() => parseConfig({ ...baseEnv, FOOD_VISION_MODEL: model })).toThrow(/FOOD_VISION_MODEL/);
    },
  );
  it("AC-21 the model id is not hardcoded outside config (only default + comments/tests)", () => {
    const hits: string[] = [];
    for (const f of walk(path.join(ROOT, "src"))) {
      if (!/\.(ts|tsx)$/.test(f) || /\.test\.tsx?$/.test(f)) continue;
      if (/claude-(sonnet|haiku|opus)-\d/.test(readFileSync(f, "utf8"))) hits.push(path.relative(ROOT, f).replaceAll("\\", "/"));
    }
    expect(hits).toEqual(["src/server/config.ts"]);
  });
  it("startup fails fast when the API key or DB url is missing", () => {
    const noKey: Record<string, string | undefined> = { ...baseEnv, ANTHROPIC_API_KEY: undefined };
    expect(() => parseConfig(noKey)).toThrow(/ANTHROPIC_API_KEY/);
    const noDb: Record<string, string | undefined> = { ...baseEnv, DATABASE_URL: undefined };
    expect(() => parseConfig(noDb)).toThrow(/DATABASE_URL/);
  });
  it("C-RATE default is 20 per hour, configurable; invalid value rejected", () => {
    expect(parseConfig(baseEnv).analyzeRateLimitPerHour).toBe(20);
    expect(parseConfig({ ...baseEnv, ANALYZE_RATE_LIMIT_PER_HOUR: "5" }).analyzeRateLimitPerHour).toBe(5);
    expect(() => parseConfig({ ...baseEnv, ANALYZE_RATE_LIMIT_PER_HOUR: "0" })).toThrow();
  });
});

describe("AC-19 source hygiene (the built-bundle scan is in tests/e2e/build)", () => {
  const sources = [...walk(path.join(ROOT, "src"))].filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f));

  it("only src/server/vision/analyze-food.ts imports the Anthropic SDK", () => {
    const importers = sources.filter((f) => /from\s+["']@anthropic-ai\/sdk["']/.test(readFileSync(f, "utf8"))).map((f) => path.relative(ROOT, f).replaceAll("\\", "/"));
    expect(importers).toEqual(["src/server/vision/analyze-food.ts"]);
  });
  it("no NEXT_PUBLIC_ variable mentions the key or provider", () => {
    for (const f of [...sources, ...[".env.example"].map((n) => path.join(ROOT, n))]) {
      expect(readFileSync(f, "utf8")).not.toMatch(/NEXT_PUBLIC_\w*(ANTHROPIC|API_KEY|SECRET)/i);
    }
  });
  it("ANTHROPIC_API_KEY is read only in server code (src/server/**)", () => {
    const readers = sources.filter((f) => /ANTHROPIC_API_KEY/.test(readFileSync(f, "utf8"))).map((f) => path.relative(ROOT, f).replaceAll("\\", "/"));
    for (const r of readers) expect(r.startsWith("src/server/") || r === "src/instrumentation.ts").toBe(true);
  });
  it("client code (components, lib/client, copy, shared) never imports server modules", () => {
    for (const f of sources.filter((s) => /src[\\/](components|lib|copy|shared)[\\/]/.test(s) || /\(app\)/.test(s))) {
      expect(readFileSync(f, "utf8"), f).not.toMatch(/from\s+["'](@\/server|\.\.\/(\.\.\/)*server)/);
    }
  });
});

describe("AC-22 Thai copy", () => {
  const THAI = /[฀-๿]/;
  const leaves: [string, string][] = [];
  (function collect(node: unknown, key: string) {
    if (typeof node === "string") leaves.push([key, node]);
    else if (typeof node === "function") leaves.push([key, (node as (...a: unknown[]) => string)("ชื่อ", 3, "100 - 200")]);
    else if (node && typeof node === "object") for (const [k, v] of Object.entries(node)) collect(v, `${key}.${k}`);
  })(th, "th");

  it("every string in src/copy/th.ts contains Thai text (no English-only UI string)", () => {
    expect(leaves.length).toBeGreaterThan(100);
    const offenders = leaves.filter(([, v]) => !THAI.test(v)).map(([k, v]) => `${k}=${JSON.stringify(v)}`);
    expect(offenders).toEqual([]);
  });
  it("the kcal unit and disclaimer are Thai", () => {
    expect(th.kcalUnit).toMatch(THAI);
    expect(th.disclaimer.short).toContain("ไม่ใช่คำแนะนำทางการแพทย์");
  });
});

describe("AC-23 no Thai FCD / THFOOD data", () => {
  it("repo check script passes on the repo", () => {
    const r = spawnSync(process.execPath, ["scripts/check-no-thai-food-data.mjs"], { cwd: ROOT, encoding: "utf8" });
    expect(r.status, r.stderr).toBe(0);
  });
  it("positive control: the script fails (exit 1) on a tree containing a THFOOD file", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "qa-thfood-"));
    mkdirSync(path.join(dir, "data"));
    writeFileSync(path.join(dir, "data", "thfood-2024.csv"), "id,kcal\n1,100\n");
    const r = spawnSync(process.execPath, [path.join(ROOT, "scripts/check-no-thai-food-data.mjs")], { cwd: dir, encoding: "utf8" });
    expect(r.status).toBe(1);
  });
  it("no file under src, db, scripts, public has a thfood/fcd name or a large dish table", () => {
    for (const d of ["src", "db", "scripts"]) {
      for (const f of walk(path.join(ROOT, d))) {
        expect(f).not.toMatch(/thfood|thai[-_ ]?fcd/i);
        if (/\.(csv|json|tsv|sqlite3?|xlsx?)$/i.test(f) && !/package(-lock)?\.json|_journal\.json|meta/.test(f)) {
          expect(statSync(f).size, f).toBeLessThan(50_000);
        }
      }
    }
  });
});
