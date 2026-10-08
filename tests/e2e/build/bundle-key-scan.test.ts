// AC-19: the provider API key must be absent from everything the browser can receive.
// Runs a real `next build` with a distinctive FAKE key, then scans .next/static and prerendered HTML/RSC payloads.
// If the build cannot run, the test FAILS (reported as not-run by QA), it never passes vacuously.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { FAKE_ENV, FAKE_KEY } from "../../fixtures/env";

const ROOT = path.resolve(__dirname, "../../..");
const NEXT = path.join(ROOT, ".next");

function* walk(dir: string): Generator<string> {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}

const KEY_PATTERNS = [/sk-ant-[A-Za-z0-9_-]{8,}/, /QAFAKEKEY/];
export function findKey(files: Iterable<string>): string[] {
  const hits: string[] = [];
  for (const f of files) {
    const text = readFileSync(f, "latin1");
    if (text.includes(FAKE_KEY) || KEY_PATTERNS.some((p) => p.test(text))) hits.push(f);
  }
  return hits;
}

// client-reachable output: static assets, prerendered HTML and RSC payloads
const clientFiles = () => [
  ...walk(path.join(NEXT, "static")),
  ...[...walk(path.join(NEXT, "server", "app"))].filter((f) => /\.(html|rsc|segment\.rsc|json)$/.test(f)),
];

let buildStatus: number | null = null;
let buildLog = "";

beforeAll(() => {
  const r = spawnSync("npm", ["run", "build"], {
    cwd: ROOT,
    env: { ...process.env, ...FAKE_ENV, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1" },
    encoding: "utf8",
    shell: true,
    timeout: 540_000,
  });
  buildStatus = r.status;
  buildLog = (r.stdout ?? "") + (r.stderr ?? "");
});

describe("AC-19 provider key is not in the client bundle", () => {
  it("next build succeeds with the fake env (precondition; failure = not-run)", () => {
    expect(buildStatus, buildLog.slice(-2000)).toBe(0);
  });

  it("scanner positive control: finds the fake key in a file that contains it", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "qa-scan-"));
    const f = path.join(dir, "leak.js");
    writeFileSync(f, `var k="${FAKE_KEY}";`);
    expect(findKey([f])).toEqual([f]);
    const clean = path.join(dir, "clean.js");
    writeFileSync(clean, "var k=1;");
    expect(findKey([clean])).toEqual([]);
  });

  it("the build scanned a non-trivial set of client files", () => {
    const files = [...clientFiles()];
    expect(files.length).toBeGreaterThan(5);
    expect([...walk(path.join(NEXT, "static"))].some((f) => f.endsWith(".js"))).toBe(true);
  });

  it("no file in .next/static or prerendered output contains the key or an sk-ant- token", () => {
    expect(findKey(clientFiles())).toEqual([]);
  });

  it("the key also does not appear in the Next public env manifest", () => {
    const hits = findKey([...walk(NEXT)].filter((f) => /required-server-files|routes-manifest|build-manifest|app-build-manifest/.test(f)));
    expect(hits).toEqual([]);
  });
});
