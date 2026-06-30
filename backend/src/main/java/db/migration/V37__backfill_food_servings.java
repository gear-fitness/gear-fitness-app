package db.migration;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.Types;
import java.util.ArrayList;
import java.util.List;
import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

/**
 * Backfills serving sizes onto food rows that were seeded without one.
 *
 * <p>USDA whole foods (SR Legacy / Foundation / FNDDS) ship with no serving
 * size, so the app fell back to a meaningless 100 g for them. The bundled
 * {@code usda_foods.csv} has since been enriched (see
 * {@code backend/scripts/backfill_servings.mjs}) with a sensible serving per
 * whole food — grams plus a friendly household label like "1 slice" or
 * "1 tbsp" — derived from USDA's published portion data.
 *
 * <p>V33 only loads the CSV into a fresh table and V36 tops up new rows with
 * {@code ON CONFLICT DO NOTHING}, so neither updates the serving columns of
 * rows that already existed. This migration reads the same CSV and applies the
 * serving columns to any matching row that is still missing one
 * ({@code serving_size IS NULL}). It is idempotent: rows that already have a
 * serving (every branded food, and anything a post-enrichment V33 loaded) are
 * left untouched, and CSV rows without a serving are skipped.
 *
 * <p>Columns (header row required): {@code fdc_id,description,brand_owner,
 * data_type,serving_size,serving_unit,household_serving,calories,protein_g,
 * carbs_g,fat_g}. USDA FDC data is in the public domain.
 */
public class V37__backfill_food_servings extends BaseJavaMigration {

  private static final String RESOURCE = "db/data/usda_foods.csv";
  private static final int BATCH_SIZE = 1000;

  private static final String UPDATE_SQL =
    "UPDATE food_item SET serving_size = ?, serving_unit = ?, " +
    "household_serving = ? WHERE fdc_id = ? AND serving_size IS NULL";

  @Override
  public void migrate(Context context) throws Exception {
    Connection conn = context.getConnection();

    try (
      InputStream in = getClass().getClassLoader().getResourceAsStream(RESOURCE)
    ) {
      if (in == null) {
        System.out.println(
          "[V37] " + RESOURCE + " not found on classpath; skipping backfill."
        );
        return;
      }

      try (
        BufferedReader reader = new BufferedReader(
          new InputStreamReader(in, StandardCharsets.UTF_8)
        );
        PreparedStatement update = conn.prepareStatement(UPDATE_SQL)
      ) {
        String header = reader.readLine(); // discard header
        if (header == null) return;

        String line;
        int inBatch = 0;
        int total = 0;
        while ((line = reader.readLine()) != null) {
          if (line.isBlank()) continue;
          List<String> cols = parseCsvLine(line);
          if (cols.size() < 11) continue;

          String fdcId = cols.get(0);
          String servingSize = cols.get(4);
          // Only rows that actually carry a serving are worth applying.
          if (fdcId == null || fdcId.isBlank()) continue;
          if (servingSize == null || servingSize.isBlank()) continue;

          setNumeric(update, 1, cols.get(4));
          setString(update, 2, cols.get(5));
          setString(update, 3, cols.get(6));
          setLong(update, 4, fdcId);
          update.addBatch();

          if (++inBatch >= BATCH_SIZE) {
            update.executeBatch();
            total += inBatch;
            inBatch = 0;
          }
        }
        if (inBatch > 0) {
          update.executeBatch();
          total += inBatch;
        }
        System.out.println(
          "[V37] Applied serving backfill for " + total +
          " candidate rows (rows already serving-sized were left unchanged)."
        );
      }
    }
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
