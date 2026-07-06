/**
 * usda_servings.mjs — Derive a sensible default serving for USDA whole foods
 * from FoodData Central's food_portion.csv + measure_unit.csv.
 *
 * SR Legacy / Foundation / FNDDS (survey) foods ship with NO serving size, so
 * the app would otherwise fall back to a meaningless 100 g for them. FDC does,
 * however, publish portion data (food_portion.csv) — the household amounts a
 * food is normally measured in, each with a gram weight. This module reads that
 * data and picks the single portion that best represents a "normal serving",
 * returning { grams, label } per fdc_id (e.g. 167512 -> "1 slice", 25 g).
 *
 * Picking the right portion is the whole job: FDC's seq_num=1 is frequently NOT
 * the typical serving (butter's first portion is a 5 g "pat", bread's is "oz",
 * a banana's is "cup, mashed"). So instead of trusting order we score each
 * portion, strongly preferring discrete "eat-as" units (slice, medium, piece,
 * egg…) and the FDA "NLEA serving", and de-preferring bulk/volume/odd units
 * (cup of mashed banana, a pat of butter, a bare ounce). Calibrated against
 * butter→1 tbsp, bread→1 slice, banana→1 medium, scrambled egg→1 large,
 * cooked rice→1 cup.
 *
 * USDA FDC data is in the public domain.
 */
import { createReadStream, existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { resolve } from "node:path";

// Minimal RFC-4180 line parser (USDA rows quote fields containing commas but
// never embed newlines, so a per-line parse is safe).
export function parseLine(line) {
  const out = [];
  let field = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else q = false;
      } else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      out.push(field);
      field = "";
    } else field += c;
  }
  out.push(field);
  return out;
}

async function* rows(filePath) {
  const rl = createInterface({
    input: createReadStream(filePath, "utf8"),
    crlfDelay: Infinity,
  });
  let header = null;
  for await (const line of rl) {
    if (!line) continue;
    const cols = parseLine(line);
    if (!header) {
      header = cols;
      continue;
    }
    const obj = {};
    header.forEach((h, i) => (obj[h] = cols[i]));
    yield obj;
  }
}

// Trim trailing zeros from a numeric amount: "2.0" -> "2", "0.50" -> "0.5".
function formatAmount(a) {
  const n = parseFloat(a);
  if (!isFinite(n)) return "";
  return String(Math.round(n * 1000) / 1000);
}

// Shorten verbose unit names and drop parentheticals / survey "NFS" noise so a
// label reads like "1 tbsp" or "1 medium" rather than "1.0 tablespoon" or
// "1 medium (7\" to 7-7/8\" long)".
function tidyUnit(raw) {
  let u = (raw || "")
    .replace(/\(.*?\)/g, " ") // drop "(1\" sq, 1/3\" high)" etc.
    .replace(/,?\s*nfs\b/gi, "") // survey "Not Further Specified"
    .replace(/,?\s*ns\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  u = u
    .replace(/\btablespoons?\b/gi, "tbsp")
    .replace(/\bteaspoons?\b/gi, "tsp")
    .replace(/\bfluid ounces?\b/gi, "fl oz")
    .replace(/\bounces?\b/gi, "oz");
  return u;
}

function buildLabel(amount, unit, surveyDesc) {
  // Survey portions carry the whole label ("1 cup") in the description and
  // leave amount blank; everything else is amount + unit.
  if (surveyDesc && !amount) return tidyUnit(surveyDesc);
  const amt = formatAmount(amount) || "1";
  const u = tidyUnit(unit);
  return u ? `${amt} ${u}` : amt;
}

const wordIn = (text, word) =>
  new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(text);

// Discrete units a food is naturally counted in — the most intuitive serving.
// Kept deliberately to units that denote a single, normal-sized item; bulk or
// ambiguous ones (stick, loaf, can, container, cake…) are left out so they
// can't beat a more typical portion like a tbsp or slice.
const DISCRETE = [
  "slice", "piece", "medium", "large", "small", "egg", "cookie", "cracker",
  "biscuit", "muffin", "roll", "bun", "patty", "pattie", "link", "fillet",
  "filet", "breast", "thigh", "drumstick", "wing", "leg", "chop", "bagel",
  "waffle", "pancake", "tortilla", "scoop", "fruit", "stalk", "spear",
  "floret", "clove", "ear", "kernel", "sheet", "square", "cube", "wedge",
  "strip", "nugget", "bar",
];

// Foods measured by the cupful/glassful rather than the spoonful — a tbsp is a
// fine default for butter or honey, but nonsense for milk or juice.
const BEVERAGE =
  /\b(milk|juice|beverage|drink|soda|cola|coffee|tea|water|broth|stock|smoothie|shake|lemonade|cider|nectar|kefir|kombucha|eggnog)\b/;

// Score a candidate portion; higher wins. Returns -Infinity to reject.
function scorePortion(p, desc = "") {
  const k = p.keywords;
  if (!isFinite(p.grams) || p.grams <= 0) return -Infinity;
  if (/quantity not specified|not specified|guideline|as packaged/.test(k)) {
    return -Infinity;
  }

  let s;
  if (DISCRETE.some((w) => wordIn(k, w))) s = 90;
  else if (k.includes("nlea serving")) s = 80;
  else if (wordIn(k, "serving")) s = 70;
  else if (wordIn(k, "tbsp") || wordIn(k, "tablespoon")) s = 65;
  else if (wordIn(k, "cup")) s = /cup\s*,/.test(k) ? 45 : 55;
  else if (wordIn(k, "tsp") || wordIn(k, "teaspoon")) s = 40;
  else if (k.includes("fl oz") || k.includes("fluid ounce")) s = 38;
  else if (wordIn(k, "oz") || wordIn(k, "ounce")) s = 30;
  else if (wordIn(k, "pat") || wordIn(k, "dash") || wordIn(k, "drop") ||
           wordIn(k, "sprinkle") || k.includes("cubic inch")) s = 20;
  else s = 50; // an unknown named unit still beats a bare ounce

  // Beverages are served by the cup/fl-oz, not the spoon — flip the default.
  if (BEVERAGE.test(desc.toLowerCase())) {
    if (wordIn(k, "cup")) s += 25;
    else if (k.includes("fl oz") || k.includes("fluid ounce")) s += 25;
    else if (wordIn(k, "tbsp") || wordIn(k, "tsp")) s -= 25;
  }

  // Among size words, "medium" is the canonical serving; nudge it above
  // small/large/extra so a banana lands on "1 medium" not "1 extra small".
  if (wordIn(k, "medium")) s += 8;
  if (wordIn(k, "extra")) s -= 4;
  // Prefer the simplest label ("slice" over "slice, large" / "cup, crumbs").
  s -= ((p.label.match(/,/g) || []).length) * 2;
  // Sanity on the amount: avoid garnish-sized (a 5 g pat) and bulk (a 227 g
  // cup of butter) portions when a more normal one exists.
  if (p.grams < 3) s -= 30;
  else if (p.grams > 500) s -= 25;
  return s;
}

/**
 * Read every dataset directory's measure_unit.csv + food_portion.csv and return
 * Map<fdc_id (string), { grams, label }> with the best serving per food.
 *
 * `descriptions` (Map<fdc_id, string>) is optional; when given it lets scoring
 * be food-aware (e.g. beverages prefer a cup over a tbsp).
 */
export async function buildServingMap(dirs, descriptions = new Map()) {
  // 1) measure_unit id -> name (merge across datasets; ids are dataset-local
  //    but the same integer maps to the same name within a download).
  const unitName = new Map();
  for (const dir of dirs) {
    const f = resolve(dir, "measure_unit.csv");
    if (!existsSync(f)) continue;
    for await (const r of rows(f)) unitName.set(r.id, r.name);
  }

  // 2) Collect candidate portions per fdc_id, keeping the best-scoring one.
  const best = new Map(); // fdcId -> { grams, label, score }
  for (const dir of dirs) {
    const f = resolve(dir, "food_portion.csv");
    if (!existsSync(f)) continue;
    for await (const r of rows(f)) {
      const grams = parseFloat(r.gram_weight);
      if (!isFinite(grams) || grams <= 0) continue;

      const muName =
        r.measure_unit_id && r.measure_unit_id !== "9999"
          ? unitName.get(r.measure_unit_id) || ""
          : "";
      const unit = muName || r.modifier || "";
      const label = buildLabel(r.amount, unit, r.portion_description);
      if (!label) continue;

      const keywords = `${unit} ${r.portion_description || ""} ${label}`
        .toLowerCase()
        .trim();
      const cand = { grams, label, keywords };
      const score = scorePortion(cand, descriptions.get(r.fdc_id) || "");
      if (score === -Infinity) continue;

      const prev = best.get(r.fdc_id);
      if (!prev || score > prev.score) {
        best.set(r.fdc_id, { grams, label, score });
      }
    }
  }

  // Drop the score; round grams to 2 dp and tidy the display label by keeping
  // only the leading clause ("0.5 breast, bone and skin removed" -> "0.5
  // breast"). Scoring already ran on the full label, so this is display-only.
  const out = new Map();
  for (const [fdcId, v] of best) {
    out.set(fdcId, {
      grams: Math.round(v.grams * 100) / 100,
      label: v.label.split(",")[0].trim(),
    });
  }
  return out;
}
