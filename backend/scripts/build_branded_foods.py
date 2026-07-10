#!/usr/bin/env python3
"""Build the bundled USDA Branded Foods seed for the barcode scanner.

Reads an unzipped USDA FoodData Central "Branded Foods" CSV download
(https://fdc.nal.usda.gov/download-datasets, food.csv + branded_food.csv +
food_nutrient.csv, ~2.9GB) and emits a compact gzipped CSV at
backend/src/main/resources/db/data/usda_branded_foods.csv.gz that
V45__seed_branded_barcodes.java streams into food_item at migration time.

Output columns (same layout as usda_foods.csv plus a trailing barcode):
  fdc_id,description,brand_owner,data_type,serving_size,serving_unit,
  household_serving,calories,protein_g,carbs_g,fat_g,barcode

Rules:
  - US-market products only, with a valid 6-14 digit GTIN/UPC.
  - Nutrients are the per-100g label values (kcal 1008, protein 1003,
    fat 1004, carbs 1005; Atwater energy 2047/2048 as kcal fallback).
    Rows without energy are dropped (a barcode hit without calories is
    useless to the tracker).
  - Barcodes are normalized to canonical GTIN-14 (digits, zero-padded to
    14), matching BarcodeFoodService.toGtin14.
  - One row per GTIN: prefer non-discontinued, then the newest
    available_date, then the highest fdc_id.

Usage:
  python3 build_branded_foods.py /path/to/unzipped/dataset/dir

USDA FDC data is public domain.
"""

import csv
import gzip
import os
import sys

ENERGY_KCAL = "1008"
PROTEIN = "1003"
FAT = "1004"
CARBS = "1005"
ENERGY_ATWATER_GENERAL = "2047"
ENERGY_ATWATER_SPECIFIC = "2048"
WANTED_NUTRIENTS = {
    ENERGY_KCAL,
    PROTEIN,
    FAT,
    CARBS,
    ENERGY_ATWATER_GENERAL,
    ENERGY_ATWATER_SPECIFIC,
}

OUT_HEADER = [
    "fdc_id",
    "description",
    "brand_owner",
    "data_type",
    "serving_size",
    "serving_unit",
    "household_serving",
    "calories",
    "protein_g",
    "carbs_g",
    "fat_g",
    "barcode",
]


def to_gtin14(digits: str) -> str:
    return digits.zfill(14)


def clean(text: str, max_len: int) -> str:
    """Collapse whitespace (embedded newlines break the Java migration's
    line-based CSV reader) and truncate to the food_item column's varchar
    limit: description 512, brand_owner and household_serving 255."""
    return " ".join((text or "").split())[:max_len]


def load_descriptions(dataset_dir: str) -> dict:
    """fdc_id -> description for branded rows of food.csv."""
    descriptions = {}
    path = os.path.join(dataset_dir, "food.csv")
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row.get("data_type") != "branded_food":
                continue
            desc = clean(row.get("description"), 512)
            if desc:
                descriptions[row["fdc_id"]] = desc
    print(f"food.csv: {len(descriptions):,} branded descriptions")
    return descriptions


def load_nutrients(dataset_dir: str, fdc_ids: set) -> dict:
    """fdc_id -> {nutrient_id: amount} for the macros we keep."""
    nutrients = {}
    path = os.path.join(dataset_dir, "food_nutrient.csv")
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            nutrient_id = row.get("nutrient_id")
            if nutrient_id not in WANTED_NUTRIENTS:
                continue
            fdc_id = row.get("fdc_id")
            if fdc_id not in fdc_ids:
                continue
            amount = (row.get("amount") or "").strip()
            if not amount:
                continue
            try:
                value = float(amount)
            except ValueError:
                continue
            nutrients.setdefault(fdc_id, {})[nutrient_id] = value
    print(f"food_nutrient.csv: macros for {len(nutrients):,} foods")
    return nutrients


def energy_kcal(macros: dict):
    for key in (ENERGY_KCAL, ENERGY_ATWATER_GENERAL, ENERGY_ATWATER_SPECIFIC):
        if key in macros:
            return macros[key]
    return None


def fmt(value) -> str:
    if value is None:
        return ""
    return f"{value:.2f}".rstrip("0").rstrip(".")


def build(dataset_dir: str, out_path: str) -> None:
    descriptions = load_descriptions(dataset_dir)
    nutrients = load_nutrients(dataset_dir, set(descriptions))

    # One candidate per GTIN-14. Ranked (active, available_date, fdc_id) so a
    # relisted or newer version of the same product wins.
    best = {}
    total = kept = 0
    path = os.path.join(dataset_dir, "branded_food.csv")
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            total += 1
            if (row.get("market_country") or "").strip() != "United States":
                continue
            fdc_id = row["fdc_id"]
            desc = descriptions.get(fdc_id)
            if not desc:
                continue

            gtin = "".join(ch for ch in (row.get("gtin_upc") or "") if ch.isdigit())
            if not (6 <= len(gtin) <= 14):
                continue

            macros = nutrients.get(fdc_id, {})
            kcal = energy_kcal(macros)
            if kcal is None:
                continue

            barcode = to_gtin14(gtin)
            active = 0 if (row.get("discontinued_date") or "").strip() else 1
            rank = (active, (row.get("available_date") or ""), int(fdc_id))
            current = best.get(barcode)
            if current is not None and current[0] >= rank:
                continue

            # Round away the dataset's float32 noise ("29.799999237060547").
            serving_size = (row.get("serving_size") or "").strip()
            if serving_size:
                try:
                    serving_size = fmt(float(serving_size))
                except ValueError:
                    serving_size = ""
            serving_unit = (row.get("serving_size_unit") or "").strip().lower()
            out_row = [
                fdc_id,
                desc,
                clean(row.get("brand_owner"), 255),
                "branded_food",
                serving_size,
                serving_unit[:32] if serving_size else "",
                clean(row.get("household_serving_fulltext"), 255),
                fmt(kcal),
                fmt(macros.get(PROTEIN)),
                fmt(macros.get(CARBS)),
                fmt(macros.get(FAT)),
                barcode,
            ]
            if current is None:
                kept += 1
            best[barcode] = (rank, out_row)

    print(f"branded_food.csv: {total:,} rows scanned, {len(best):,} unique GTINs kept")

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with gzip.open(out_path, "wt", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(OUT_HEADER)
        for _, out_row in sorted(best.values(), key=lambda item: int(item[1][0])):
            writer.writerow(out_row)

    size_mb = os.path.getsize(out_path) / (1024 * 1024)
    print(f"wrote {out_path} ({size_mb:.1f} MB)")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)
    dataset_dir = sys.argv[1]
    script_dir = os.path.dirname(os.path.abspath(__file__))
    out_path = os.path.normpath(
        os.path.join(
            script_dir,
            "..",
            "src",
            "main",
            "resources",
            "db",
            "data",
            "usda_branded_foods.csv.gz",
        )
    )
    build(dataset_dir, out_path)
