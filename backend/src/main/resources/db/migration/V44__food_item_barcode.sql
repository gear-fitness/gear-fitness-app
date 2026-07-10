-- Barcode (GTIN/UPC) support for the barcode scanner. Codes are stored in a
-- canonical GTIN-14 form (digits only, left-padded with zeros to 14), which is
-- how BarcodeFoodService normalizes every scanned or imported code. The unique
-- index is partial because almost all existing rows have no barcode.
ALTER TABLE food_item ADD COLUMN barcode VARCHAR(32);

CREATE UNIQUE INDEX ux_food_item_barcode
  ON food_item (barcode)
  WHERE barcode IS NOT NULL;
