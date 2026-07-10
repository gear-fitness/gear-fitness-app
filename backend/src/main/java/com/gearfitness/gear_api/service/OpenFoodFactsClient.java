package com.gearfitness.gear_api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Thin HTTP client for the OpenFoodFacts product API, the live fallback when a
 * scanned barcode misses the seeded USDA rows. Free and keyless; OFF policy
 * asks only for a descriptive User-Agent. Mirrors the raw {@link HttpClient}
 * pattern used by PerplexityClient.
 */
@Service
@Slf4j
public class OpenFoodFactsClient {

  private static final String ENDPOINT_TEMPLATE =
    "https://world.openfoodfacts.org/api/v2/product/%s.json" +
    "?fields=code,product_name,brands,nutriments,serving_size,serving_quantity,serving_quantity_unit";

  private static final String USER_AGENT =
    "GearFitness/1.0 (kobecortez31@gmail.com)";

  private final HttpClient httpClient = HttpClient.newBuilder()
    .connectTimeout(Duration.ofSeconds(5))
    .build();
  private final ObjectMapper mapper = new ObjectMapper();

  /**
   * One OFF product mapped onto our per-100g food model. Nutrient fields are
   * null when OFF has no value; servingQuantity is grams or milliliters (see
   * servingQuantityUnit), servingSizeText is the label string ("330 ml").
   */
  public record OffProduct(
    String name,
    String brands,
    Double kcal100g,
    Double protein100g,
    Double carbs100g,
    Double fat100g,
    Double servingQuantity,
    String servingQuantityUnit,
    String servingSizeText
  ) {}

  /**
   * Look up a barcode. Empty when OFF does not know the product (status 0 or
   * HTTP 404). Throws IllegalStateException on network failure or an
   * unexpected upstream status, which the service layer maps to 502.
   */
  public Optional<OffProduct> lookup(String barcode) {
    try {
      HttpRequest request = HttpRequest.newBuilder()
        .uri(URI.create(String.format(ENDPOINT_TEMPLATE, barcode)))
        .timeout(Duration.ofSeconds(10))
        .header("User-Agent", USER_AGENT)
        .header("Accept", "application/json")
        .GET()
        .build();

      HttpResponse<String> response = httpClient.send(
        request,
        HttpResponse.BodyHandlers.ofString()
      );

      // OFF answers 404 with a status-0 JSON body for unknown codes; treat
      // both signals as a clean miss rather than an upstream failure.
      if (response.statusCode() == 404) return Optional.empty();
      if (response.statusCode() < 200 || response.statusCode() >= 300) {
        log.error(
          "OpenFoodFacts call failed ({}): {}",
          response.statusCode(),
          response.body()
        );
        throw new IllegalStateException("OpenFoodFacts request failed");
      }

      JsonNode root = mapper.readTree(response.body());
      if (root.path("status").asInt(0) != 1) return Optional.empty();

      return Optional.of(mapProduct(root.path("product")));
    } catch (IllegalStateException e) {
      throw e;
    } catch (Exception e) {
      log.error("OpenFoodFacts lookup error: {}", e.getMessage());
      throw new IllegalStateException("OpenFoodFacts request failed", e);
    }
  }

  private OffProduct mapProduct(JsonNode product) {
    JsonNode nutriments = product.path("nutriments");

    Double kcal = numberOrNull(nutriments, "energy-kcal_100g");
    if (kcal == null) {
      // Some entries only carry energy in kJ; convert.
      Double kj = numberOrNull(nutriments, "energy_100g");
      if (kj != null) kcal = kj / 4.184;
    }

    return new OffProduct(
      textOrNull(product, "product_name"),
      textOrNull(product, "brands"),
      kcal,
      numberOrNull(nutriments, "proteins_100g"),
      numberOrNull(nutriments, "carbohydrates_100g"),
      numberOrNull(nutriments, "fat_100g"),
      numberOrNull(product, "serving_quantity"),
      textOrNull(product, "serving_quantity_unit"),
      textOrNull(product, "serving_size")
    );
  }

  /** OFF mixes numeric and numeric-string values; accept either, null otherwise. */
  private Double numberOrNull(JsonNode node, String field) {
    JsonNode value = node.path(field);
    if (value.isNumber()) return value.asDouble();
    if (value.isTextual()) {
      try {
        return Double.parseDouble(value.asText().trim());
      } catch (NumberFormatException ignored) {
        return null;
      }
    }
    return null;
  }

  private String textOrNull(JsonNode node, String field) {
    String value = node.path(field).asText("").trim();
    return value.isEmpty() ? null : value;
  }
}
