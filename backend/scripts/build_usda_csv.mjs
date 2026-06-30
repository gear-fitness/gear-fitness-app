#!/usr/bin/env node
/**
 * build_usda_csv.mjs — Offline preprocessor for the seeded food database.
 *
 * Turns the USDA FoodData Central "Full Download of All Data Types" CSV export
 * into the trimmed, per-100g CSV that V33__seed_usda_foods loads at
 * classpath:db/data/usda_foods.csv.
 *
 * USDA FDC data is in the public domain. Download the bulk CSV export from
 *   https://fdc.nal.usda.gov/download-datasets.html
 * and unzip so this folder contains: food.csv, food_nutrient.csv,
 * branded_food.csv (food.csv carries description + data_type for every row),
 * plus food_portion.csv + measure_unit.csv for whole-food serving sizes.
 *
 * Usage:
 *   node build_usda_csv.mjs --in /path/to/fdc_csv_dir \
 *     --out ../src/main/resources/db/data/usda_foods.csv \
 *     --branded-limit 30000
 *
 * Output columns (header included), nutrients per 100 g:
 *   fdc_id,description,brand_owner,data_type,serving_size,serving_unit,
 *   household_serving,calories,protein_g,carbs_g,fat_g
 */
import { createReadStream, createWriteStream } from "node:fs";
import { createInterface } from "node:readline";
import { resolve } from "node:path";
import { buildServingMap } from "./usda_servings.mjs";

// Macro nutrient identifiers across FDC schemes. Foundation/SR Legacy/Branded
// use the new FDC nutrient.id values; FNDDS (survey) food_nutrient rows use the
// legacy SR nutrient numbers. The id ranges don't collide, so we accept both.
// Energy has several variants (direct kcal + Atwater general/specific + the SR
// number); we keep whichever is available, by priority.
const ENERGY_IDS = [1008, 2047, 2048, 208]; // all kcal; preference order
const ENERGY_SET = new Set(ENERGY_IDS);
const PROTEIN_IDS = new Set([1003, 203]);
const FAT_IDS = new Set([1004, 204]);
const CARB_IDS = new Set([1005, 205]);

// Real consumer-food data types. The Foundation download also ships lab
// sample/acquisition rows (sample_food, sub_sample_food, market_acquisition,
// agricultural_acquisition) that aren't foods you'd log — exclude them.
const KEEP_TYPES = new Set([
  "foundation_food",
  "sr_legacy_food",
  "survey_fndds_food",
  "branded_food",
]);

function resolveCalories(n) {
  if (!n || !n.energy) return null;
  for (const id of ENERGY_IDS) {
    if (n.energy[id] != null) return n.energy[id];
  }
  return null;
}

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const IN_DIR = resolve(arg("in", "."));
const OUT = resolve(arg("out", "../src/main/resources/db/data/usda_foods.csv"));
const BRANDED_LIMIT = parseInt(arg("branded-limit", "30000"), 10);

// Minimal RFC-4180 line parser (USDA rows do not embed newlines in fields).
function parseLine(line) {
  const out = [];
  let field = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"') {
        if (line[i + 1] === '"') { field += '"'; i++; }
        else q = false;
      } else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { out.push(field); field = ""; }
    else field += c;
  }
  out.push(field);
  return out;
}

function csvCell(v) {
  if (v == null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function* rows(file) {
  const rl = createInterface({
    input: createReadStream(resolve(IN_DIR, file), "utf8"),
    crlfDelay: Infinity,
  });
  let header = null;
  for await (const line of rl) {
    if (!line) continue;
    const cols = parseLine(line);
    if (!header) { header = cols; continue; }
    const obj = {};
    header.forEach((h, i) => (obj[h] = cols[i]));
    yield obj;
  }
}

async function main() {
  console.log(`Reading USDA CSVs from ${IN_DIR}`);

  // 1) food.csv: fdc_id -> { description, dataType }
  const foods = new Map();
  for await (const r of rows("food.csv")) {
    foods.set(r.fdc_id, { description: r.description, dataType: r.data_type });
  }
  console.log(`  food.csv: ${foods.size} rows`);

  // 2) branded_food.csv: serving info + brand owner
  const branded = new Map();
  for await (const r of rows("branded_food.csv")) {
    branded.set(r.fdc_id, {
      brandOwner: r.brand_owner || "",
      servingSize: r.serving_size || "",
      servingUnit: r.serving_size_unit || "",
      household: r.household_serving_fulltext || "",
    });
  }
  console.log(`  branded_food.csv: ${branded.size} rows`);

  // 3) food_nutrient.csv: accumulate the four macros per fdc_id (per 100 g)
  const nutrients = new Map();
  for await (const r of rows("food_nutrient.csv")) {
    const id = parseInt(r.nutrient_id, 10);
    const isEnergy = ENERGY_SET.has(id);
    if (
      !isEnergy &&
      !PROTEIN_IDS.has(id) &&
      !FAT_IDS.has(id) &&
      !CARB_IDS.has(id)
    ) {
      continue;
    }
    const amount = r.amount;
    if (amount === "" || amount == null) continue;
    let n = nutrients.get(r.fdc_id);
    if (!n) { n = {}; nutrients.set(r.fdc_id, n); }
    if (isEnergy) (n.energy ??= {})[id] = amount;
    else if (PROTEIN_IDS.has(id)) n.protein = amount;
    else if (FAT_IDS.has(id)) n.fat = amount;
    else if (CARB_IDS.has(id)) n.carbs = amount;
  }
  console.log(`  food_nutrient.csv: ${nutrients.size} foods with macros`);

  // 3b) food_portion.csv + measure_unit.csv: a sensible serving for the whole
  // foods (SR Legacy / Foundation / FNDDS), which otherwise carry no serving.
  // Branded foods already have a package serving from branded_food.csv.
  const descById = new Map();
  for (const [id, f] of foods) descById.set(id, f.description);
  const servings = await buildServingMap([IN_DIR], descById);
  console.log(`  food_portion.csv: ${servings.size} foods with a serving`);

  // 4) Emit. Keep all Foundation + SR Legacy; cap the Branded subset.
  const out = createWriteStream(OUT, "utf8");
  out.write(
    "fdc_id,description,brand_owner,data_type,serving_size,serving_unit," +
      "household_serving,calories,protein_g,carbs_g,fat_g\n"
  );
  let written = 0;
  let brandedWritten = 0;
  for (const [fdcId, food] of foods) {
    if (!KEEP_TYPES.has(food.dataType)) continue; // skip lab/sample rows
    const n = nutrients.get(fdcId);
    const calories = resolveCalories(n);
    if (calories == null) continue; // need at least calories
    const isBranded = food.dataType === "branded_food";
    if (isBranded && brandedWritten >= BRANDED_LIMIT) continue;
    const b = branded.get(fdcId) || {};
    // Prefer the branded package serving; fall back to the USDA portion serving
    // for whole foods (which have none of their own).
    const portion = servings.get(fdcId);
    const hasBrandedServing = b.servingSize != null && b.servingSize !== "";
    const servingSize = hasBrandedServing ? b.servingSize : portion?.grams ?? "";
    const servingUnit = hasBrandedServing ? b.servingUnit : portion ? "g" : "";
    const household = hasBrandedServing
      ? b.household
      : portion?.label ?? "";
    out.write(
      [
        fdcId,
        csvCell(food.description),
        csvCell(b.brandOwner),
        csvCell(food.dataType),
        servingSize,
        csvCell(servingUnit),
        csvCell(household),
        calories ?? "",
        n.protein ?? "",
        n.carbs ?? "",
        n.fat ?? "",
      ].join(",") + "\n"
    );
    written++;
    if (isBranded) brandedWritten++;
  }
  out.end();
  console.log(`Wrote ${written} foods (${brandedWritten} branded) to ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
