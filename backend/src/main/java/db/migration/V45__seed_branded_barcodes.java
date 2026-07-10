package db.migration;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.sql.Types;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.zip.GZIPInputStream;
import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

/**
 * Seeds the USDA FoodData Central Branded Foods extract bundled at
 * {@code classpath:db/data/usda_branded_foods.csv.gz} (built by
 * {@code backend/scripts/build_branded_foods.py}), giving the barcode scanner
 * local coverage of most US store-bought products (~450k rows with GTIN/UPC
 * codes in the canonical GTIN-14 form BarcodeFoodService uses).
 *
 * <p>Idempotent and safe over existing data:
 * <ul>
 *   <li>{@code ON CONFLICT (fdc_id) DO UPDATE} only backfills the barcode of
 *       an already-seeded row (never touching one it already has), so the
 *       older usda_foods.csv branded rows gain their codes without duplicate
 *       inserts.</li>
 *   <li>Barcodes already present in the table (e.g. products scanned via the
 *       OpenFoodFacts fallback before this migration ran) are skipped up
 *       front, since a cross-row barcode collision cannot be expressed in a
 *       single ON CONFLICT clause.</li>
 * </ul>
 *
 * <p>Streams the gzipped CSV with batched JDBC inserts (no Spring beans exist
 * during Java migrations). If the resource is absent the migration is a no-op
 * so the app still boots. Columns (header row required):
 * {@code fdc_id,description,brand_owner,data_type,serving_size,serving_unit,
 * household_serving,calories,protein_g,carbs_g,fat_g,barcode}. Nutrients are
 * per 100 g. USDA FDC data is public domain.
 */
public class V45__seed_branded_barcodes extends BaseJavaMigration {

  private static final String RESOURCE = "db/data/usda_branded_foods.csv.gz";
  private static final int BATCH_SIZE = 1000;
  private static final int LOG_EVERY = 100_000;

  private static final String INSERT_SQL =
    "INSERT INTO food_item (food_id, fdc_id, description, brand_owner, " +
    "data_type, serving_size, serving_unit, household_serving, calories, " +
    "protein_g, carbs_g, fat_g, barcode) " +
    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) " +
    "ON CONFLICT (fdc_id) DO UPDATE SET barcode = EXCLUDED.barcode " +
    "WHERE food_item.barcode IS NULL";

  @Override
  public void migrate(Context context) throws Exception {
    Connection conn = context.getConnection();

    try (
      InputStream in = getClass().getClassLoader().getResourceAsStream(RESOURCE)
    ) {
      if (in == null) {
        System.out.println(
          "[V45] " +
            RESOURCE +
            " not found on classpath; skipping branded seed."
        );
        return;
      }

      Set<String> existingBarcodes = loadExistingBarcodes(conn);

      try (
        BufferedReader reader = new BufferedReader(
          new InputStreamReader(new GZIPInputStream(in), StandardCharsets.UTF_8)
        );
        PreparedStatement insert = conn.prepareStatement(INSERT_SQL)
      ) {
        String header = reader.readLine(); // discard header
        if (header == null) return;

        String line;
        int inBatch = 0;
        int total = 0;
        int skipped = 0;
        while ((line = reader.readLine()) != null) {
          if (line.isBlank()) continue;
          List<String> cols = parseCsvLine(line);
          if (cols.size() < 12) continue;

          String barcode = cols.get(11).trim();
          if (barcode.isEmpty() || existingBarcodes.contains(barcode)) {
            skipped++;
            continue;
          }

          insert.setObject(1, UUID.randomUUID());
          setLong(insert, 2, cols.get(0));
          insert.setString(3, cols.get(1));
          setString(insert, 4, cols.get(2));
          setString(insert, 5, cols.get(3));
          setNumeric(insert, 6, cols.get(4));
          setString(insert, 7, cols.get(5));
          setString(insert, 8, cols.get(6));
          setNumeric(insert, 9, cols.get(7));
          setNumeric(insert, 10, cols.get(8));
          setNumeric(insert, 11, cols.get(9));
          setNumeric(insert, 12, cols.get(10));
          insert.setString(13, barcode);
          insert.addBatch();

          if (++inBatch >= BATCH_SIZE) {
            insert.executeBatch();
            total += inBatch;
            inBatch = 0;
            if (total % LOG_EVERY == 0) {
              System.out.println("[V45] " + total + " rows applied...");
            }
          }
        }
        if (inBatch > 0) {
          insert.executeBatch();
          total += inBatch;
        }
        System.out.println(
          "[V45] Applied " +
            total +
            " branded food rows (" +
            skipped +
            " skipped as already present)."
        );
      }
    }
  }

  /**
   * Barcodes already in the table. Normally empty on first run; non-empty
   * only when products were scanned in through the OpenFoodFacts fallback
   * before this migration applied.
   */
  private static Set<String> loadExistingBarcodes(Connection conn)
    throws java.sql.SQLException {
    Set<String> barcodes = new HashSet<>();
    try (
      Statement st = conn.createStatement();
      ResultSet rs = st.executeQuery(
        "SELECT barcode FROM food_item WHERE barcode IS NOT NULL"
      )
    ) {
      while (rs.next()) {
        barcodes.add(rs.getString(1));
      }
    }
    return barcodes;
  }

  private static void setLong(PreparedStatement ps, int idx, String v)
    throws java.sql.SQLException {
    if (v == null || v.isBlank()) {
      ps.setNull(idx, Types.BIGINT);
    } else {
      ps.setLong(idx, Long.parseLong(v.trim()));
    }
  }

  private static void setString(PreparedStatement ps, int idx, String v)
    throws java.sql.SQLException {
    if (v == null || v.isBlank()) {
      ps.setNull(idx, Types.VARCHAR);
    } else {
      ps.setString(idx, v);
    }
  }

  private static void setNumeric(PreparedStatement ps, int idx, String v)
    throws java.sql.SQLException {
    if (v == null || v.isBlank()) {
      ps.setNull(idx, Types.NUMERIC);
    } else {
      try {
        ps.setBigDecimal(idx, new BigDecimal(v.trim()));
      } catch (NumberFormatException e) {
        ps.setNull(idx, Types.NUMERIC);
      }
    }
  }

  /** Minimal RFC-4180 CSV field parser (handles quotes and escaped quotes). */
  private static List<String> parseCsvLine(String line) {
    List<String> out = new ArrayList<>();
    StringBuilder field = new StringBuilder();
    boolean inQuotes = false;
    for (int i = 0; i < line.length(); i++) {
      char c = line.charAt(i);
      if (inQuotes) {
        if (c == '"') {
          if (i + 1 < line.length() && line.charAt(i + 1) == '"') {
            field.append('"');
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          field.append(c);
        }
      } else if (c == '"') {
        inQuotes = true;
      } else if (c == ',') {
        out.add(field.toString());
        field.setLength(0);
      } else {
        field.append(c);
      }
    }
    out.add(field.toString());
    return out;
  }
}
