// AC-23: fail if Thai FCD / THFOOD data files or paths exist in the repo.
import { readdirSync } from "node:fs";
import { join, relative } from "node:path";

const SKIP_DIRS = new Set(["node_modules", ".next", ".git", ".vercel", ".team", ".claude"]);
const PATH_PATTERN = /thfood|thai[-_ ]?fcd|(^|[\\/._-])fcd([\\/._-]|$)/i;
const DATA_EXTENSIONS = /\.(csv|xlsx?|json|sqlite3?|db|parquet|tsv)$/i;

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) yield* walk(join(dir, entry.name));
    } else {
      yield join(dir, entry.name);
    }
  }
}

const root = process.cwd();
const hits = [];
for (const file of walk(root)) {
  const rel = relative(root, file);
  if (PATH_PATTERN.test(rel) && (DATA_EXTENSIONS.test(rel) || /thfood|thai[-_ ]?fcd/i.test(rel))) {
    hits.push(rel);
  }
}

if (hits.length > 0) {
  console.error("Thai food composition data found in repo (AC-23):\n" + hits.join("\n"));
  process.exit(1);
}
console.log("check-no-thai-food-data: ok");
