#!/usr/bin/env node
/**
 * backfill_servings.mjs — Fill in sensible serving sizes for the whole foods in
 * the already-built usda_foods.csv.
 *
 * The seeded CSV carries branded foods with real package servings, but the USDA
 * whole foods (SR Legacy / Foundation / FNDDS) have empty serving columns, so
 * the app shows a meaningless 100 g default for them. This reads FDC's portion
 * data (via usda_servings.mjs) straight from the downloaded dataset folders and
 * writes the chosen serving — grams + a friendly household label — into the
 * serving_size / serving_unit / household_serving columns of any row that's
 * missing one. Rows that already have a serving (all branded foods) are left
 * exactly as-is, so the food set and every other column is unchanged.
 *
 * Usage:
 *   node backfill_servings.mjs \
 *     --csv ../src/main/resources/db/data/usda_foods.csv \
 *     --datasets /path/to/FoodData_Central_sr_legacy_food_csv_2018-04 \
 *     --datasets /path/to/FoodData_Central_foundation_food_csv_2026-04-30 \
 *     --datasets /path/to/FoodData_Central_survey_food_csv_2024-10-31
 */
import { createReadStream, createWriteStream } from "node:fs";
import { rename } from "node:fs/promises";
import { createInterface } from "node:readline";
import { resolve } from "node:path";
import { buildServingMap, parseLine } from "./usda_servings.mjs";

function args(name) {
  const out = [];
  process.argv.forEach((a, i) => {
    if (a === `--${name}` && process.argv[i + 1]) out.push(process.argv[i + 1]);
  });
  return out;
}

const CSV = resolve(
  args("csv")[0] ?? "../src/main/resources/db/data/usda_foods.csv",
);
const DATASETS = args("datasets");

function csvCell(v) {
  if (v == null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function main() {
  if (DATASETS.length === 0) {
    console.error("No --datasets dirs given (need the FDC dataset folders).");
    process.exit(1);
  }

  // First pass: collect fdc_id -> description so scoring can be food-aware
  // (e.g. beverages prefer a cup over a tbsp).
  const descriptions = new Map();
  {
    const rl = createInterface({
      input: createReadStream(CSV, "utf8"),
      crlfDelay: Infinity,
    });
    let header = true;
    for await (const line of rl) {
      if (header) {
        header = false;
        continue;
      }
      if (!line.trim()) continue;
      const cols = parseLine(line);
      descriptions.set(cols[0], cols[1] || "");
    }
  }

  console.log(`Reading portion data from ${DATASETS.length} dataset(s)…`);
  const servings = await buildServingMap(DATASETS, descriptions);
  console.log(`  resolved a serving for ${servings.size} foods`);

  // Second pass: rewrite the serving columns for every food we have a portion
  // for. Only whole foods (SR Legacy / Foundation / FNDDS) appear in the map —
  // branded foods keep their package serving untouched — so this overwrites
  // any previously-derived serving with the current best choice.
  const tmp = `${CSV}.tmp`;
  const out = createWriteStream(tmp, "utf8");
  const rl = createInterface({
    input: createReadStream(CSV, "utf8"),
    crlfDelay: Infinity,
  });

  let header = true;
  let filled = 0;
  let total = 0;
  for await (const line of rl) {
    if (header) {
      out.write(line + "\n");
      header = false;
      continue;
    }
    if (!line.trim()) continue;
    total++;
    const cols = parseLine(line);
    // Columns: fdc_id,description,brand_owner,data_type,serving_size,
    //          serving_unit,household_serving,calories,protein_g,carbs_g,fat_g
    const serving = servings.get(cols[0]);
    if (serving) {
      cols[4] = String(serving.grams);
      cols[5] = "g";
      cols[6] = serving.label;
      filled++;
    }
    out.write(cols.map(csvCell).join(",") + "\n");
  }

  await new Promise((res, rej) =>
    out.end((err) => (err ? rej(err) : res())),
  );
  await rename(tmp, CSV);
  console.log(
    `Backfilled ${filled} of ${total} rows with a serving; wrote ${CSV}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
