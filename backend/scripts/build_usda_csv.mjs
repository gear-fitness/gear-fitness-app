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
 * branded_food.csv (food.csv carries description + data_type for every row).
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

// USDA nutrient.id values (food_nutrient.nutrient_id references these).
const NUTRIENT = { CALORIES: 1008, PROTEIN: 1003, FAT: 1004, CARBS: 1005 };

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
    if (!Object.values(NUTRIENT).includes(id)) continue;
    const amount = r.amount;
    if (amount === "" || amount == null) continue;
    let n = nutrients.get(r.fdc_id);
    if (!n) { n = {}; nutrients.set(r.fdc_id, n); }
    if (id === NUTRIENT.CALORIES) n.calories = amount;
    else if (id === NUTRIENT.PROTEIN) n.protein = amount;
    else if (id === NUTRIENT.FAT) n.fat = amount;
    else if (id === NUTRIENT.CARBS) n.carbs = amount;
  }
  console.log(`  food_nutrient.csv: ${nutrients.size} foods with macros`);

  // 4) Emit. Keep all Foundation + SR Legacy; cap the Branded subset.
  const out = createWriteStream(OUT, "utf8");
  out.write(
    "fdc_id,description,brand_owner,data_type,serving_size,serving_unit," +
      "household_serving,calories,protein_g,carbs_g,fat_g\n"
  );
  let written = 0;
  let brandedWritten = 0;
  for (const [fdcId, food] of foods) {
    const n = nutrients.get(fdcId);
    if (!n || n.calories == null) continue; // need at least calories
    const isBranded = food.dataType === "branded_food";
    if (isBranded && brandedWritten >= BRANDED_LIMIT) continue;
    const b = branded.get(fdcId) || {};
    out.write(
      [
        fdcId,
        csvCell(food.description),
        csvCell(b.brandOwner),
        csvCell(food.dataType),
        b.servingSize ?? "",
        csvCell(b.servingUnit),
        csvCell(b.household),
        n.calories ?? "",
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
