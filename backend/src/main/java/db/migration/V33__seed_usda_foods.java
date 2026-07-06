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
import java.util.List;
import java.util.UUID;
import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

/**
 * Seeds the {@code food_item} table from the bundled USDA FoodData Central
 * extract at {@code classpath:db/data/usda_foods.csv}.
 *
 * <p>The CSV is produced offline by {@code backend/scripts/build_usda_csv.mjs}
 * from the USDA FDC bulk download (Foundation + SR Legacy + a curated Branded
 * subset) and committed to the repo. Columns (header row required):
 * {@code fdc_id,description,brand_owner,data_type,serving_size,serving_unit,
 * household_serving,calories,protein_g,carbs_g,fat_g}. Nutrient values are per
 * 100 g. USDA FDC data is in the public domain.
 *
 * <p>Loaded with batched JDBC inserts (no Postgres-specific API) because Java
 * migrations run before the Spring context is built and cannot inject beans.
 * If the resource is absent the migration is a no-op so the app still boots.
 */
public class V33__seed_usda_foods extends BaseJavaMigration {

  private static final String RESOURCE = "db/data/usda_foods.csv";
  private static final int BATCH_SIZE = 1000;

  private static final String INSERT_SQL =
    "INSERT INTO food_item (food_id, fdc_id, description, brand_owner, " +
    "data_type, serving_size, serving_unit, household_serving, calories, " +
    "protein_g, carbs_g, fat_g) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) " +
    "ON CONFLICT (fdc_id) DO NOTHING";

  @Override
  public void migrate(Context context) throws Exception {
    Connection conn = context.getConnection();

    // Skip if already populated (e.g. re-run after a partial load).
    try (
      Statement check = conn.createStatement();
      ResultSet rs = check.executeQuery("SELECT COUNT(*) FROM food_item")
    ) {
      if (rs.next() && rs.getLong(1) > 0) {
        return;
      }
    }

    try (
      InputStream in = getClass().getClassLoader().getResourceAsStream(RESOURCE)
    ) {
      if (in == null) {
        System.out.println(
          "[V33] " + RESOURCE + " not found on classpath; skipping food seed."
        );
        return;
      }

      try (
        BufferedReader reader = new BufferedReader(
          new InputStreamReader(in, StandardCharsets.UTF_8)
        );
        PreparedStatement insert = conn.prepareStatement(INSERT_SQL)
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
          insert.addBatch();

          if (++inBatch >= BATCH_SIZE) {
            insert.executeBatch();
            total += inBatch;
            inBatch = 0;
          }
        }
        if (inBatch > 0) {
          insert.executeBatch();
          total += inBatch;
        }
        System.out.println("[V33] Seeded " + total + " food items.");
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
