// Accuracy spike (AC-24). Calls analyzeFood directly: no HTTP, no rate limit.
//
//   SPIKE_DATA_DIR=<dir> ANTHROPIC_API_KEY=... FOOD_VISION_MODEL=claude-sonnet-5-5 \
//     npx tsx --conditions react-server scripts/spike/run-spike.ts [--raw] [--runs 3]
//
// SPIKE_DATA_DIR (kept outside the repo) holds images/ and reference.csv with header: file,kcal
// (file relative to images/, kcal = weighed reference for the whole plate).
// --raw skips the 1024 px resize (JPEG re-encode only) to record input_tokens of a 2000x1500 image.
// Output: <SPIKE_DATA_DIR>/results-<model>[-raw].csv
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

async function main() {
  // getConfig() validates every server variable; the spike only needs the model and the key.
  for (const name of ["DATABASE_URL", "AUTH_SECRET", "AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET"]) {
    process.env[name] ??= "unused-in-spike";
  }

  const { getConfig } = await import("../../src/server/config");
  const { processImage } = await import("../../src/server/image");
  const { analyzeFood, ProviderError } = await import("../../src/server/vision/analyze-food");

  const dataDir = process.env.SPIKE_DATA_DIR;
  if (!dataDir) throw new Error("SPIKE_DATA_DIR is required");
  const raw = process.argv.includes("--raw");
  const runsFlag = process.argv.indexOf("--runs");
  const runs = runsFlag > -1 ? Number(process.argv[runsFlag + 1]) : 3;
  const model = getConfig().visionModel;

  const reference = readFileSync(join(dataDir, "reference.csv"), "utf8")
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => {
      const [file, kcal] = line.split(",");
      return { file: file.trim(), kcal: Number(kcal) };
    });

  const rows = ["image,run,model,kcal_low,kcal_high,ref_kcal,hit,latency_ms,input_tokens,output_tokens,dishes,status"];
  for (const { file, kcal } of reference) {
    const original = readFileSync(join(dataDir, "images", file));
    const image = raw ? await sharp(original).jpeg({ quality: 85 }).toBuffer() : await processImage(original);
    for (let run = 1; run <= runs; run++) {
      try {
        const out = await analyzeFood({ image, mediaType: "image/jpeg" });
        const low = out.result.dishes.reduce((sum, d) => sum + d.kcal_low, 0);
        const high = out.result.dishes.reduce((sum, d) => sum + d.kcal_high, 0);
        const names = out.result.dishes.map((d) => d.name_en).join("; ").replaceAll('"', "'");
        rows.push(
          [file, run, model, low, high, kcal, kcal >= low && kcal <= high, out.latency_ms, out.usage.input_tokens, out.usage.output_tokens, `"${names}"`, "ok"].join(","),
        );
      } catch (err) {
        const status = err instanceof ProviderError ? err.kind : "error";
        rows.push([file, run, model, "", "", kcal, "", "", "", "", "", status].join(","));
      }
    }
  }

  const outPath = join(dataDir, `results-${model}${raw ? "-raw" : ""}.csv`);
  writeFileSync(outPath, rows.join("\n") + "\n");
  console.log(`wrote ${outPath} (${rows.length - 1} rows)`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
