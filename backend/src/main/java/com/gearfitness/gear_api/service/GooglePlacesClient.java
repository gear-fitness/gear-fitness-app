package com.gearfitness.gear_api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Thin HTTP client for Google Places API (New) gym searches backing the
 * workout location picker. Mirrors the raw {@link HttpClient} pattern used by
 * PerplexityClient/ExpoPushService rather than pulling in an SDK.
 *
 * Every request sends a field mask restricted to id, displayName,
 * formattedAddress and location — the cheapest SKU tier (Pro) that still
 * returns a usable result. Adding a field here can silently move every call
 * to a pricier tier, so change the mask deliberately.
 */
@Service
@Slf4j
public class GooglePlacesClient {

  private static final String TEXT_SEARCH_ENDPOINT =
    "https://places.googleapis.com/v1/places:searchText";
  private static final String NEARBY_SEARCH_ENDPOINT =
    "https://places.googleapis.com/v1/places:searchNearby";
  private static final String FIELD_MASK =
    "places.id,places.displayName,places.formattedAddress,places.location";

  private static final int MAX_RESULTS = 20; // API maximum per request
  private static final int TEXT_BIAS_RADIUS_M = 50_000; // API maximum circle
  private static final int NEARBY_RADIUS_M = 10_000;
  // location NUMERIC(10,7) scale; Places returns more digits than fit.
  private static final int COORD_SCALE = 7;

  private final HttpClient httpClient = HttpClient.newBuilder()
    .connectTimeout(Duration.ofSeconds(10))
    .build();
  private final ObjectMapper mapper = new ObjectMapper();
  private final String apiKey;
  // Guards the missing-key WARN so it is logged once per process, not per call.
  private final AtomicBoolean warnedMissingKey = new AtomicBoolean(false);

  public GooglePlacesClient(@Value("${google.places.api.key}") String apiKey) {
    this.apiKey = apiKey;
  }

  /** One gym result, shaped to round-trip through LocationSubmissionDTO. */
  public record PlaceResult(
    String googlePlaceId,
    String name,
    String address,
    BigDecimal latitude,
    BigDecimal longitude
  ) {}

  /**
   * Whether a paid Places call can be attempted. The key is injected with an
   * empty default so an unset GOOGLE_PLACES_API_KEY does not kill startup;
   * when it is blank, callers degrade to the local location table instead of
   * erroring.
   */
  public boolean isConfigured() {
    if (apiKey != null && !apiKey.isBlank()) return true;
    if (warnedMissingKey.compareAndSet(false, true)) {
      log.warn(
        "GOOGLE_PLACES_API_KEY is not set; gym search runs against the local location table only."
      );
    }
    return false;
  }

  /** Text search, biased (not restricted) to the caller's position when known. */
  public List<PlaceResult> searchText(String query, Double lat, Double lng) {
    ObjectNode payload = mapper.createObjectNode();
    payload.put("textQuery", query);
    // Bias, not filter (strictTypeFiltering defaults to false): plenty of
    // gyms are typed fitness_center etc., and a hard filter would hide them.
    payload.put("includedType", "gym");
    payload.put("pageSize", MAX_RESULTS);
    if (lat != null && lng != null) {
      circle(payload.putObject("locationBias"), lat, lng, TEXT_BIAS_RADIUS_M);
    }
    return execute(TEXT_SEARCH_ENDPOINT, payload);
  }

  /** Distance-ranked gyms around the caller. */
  public List<PlaceResult> searchNearby(double lat, double lng) {
    ObjectNode payload = mapper.createObjectNode();
    ArrayNode types = payload.putArray("includedTypes");
    types.add("gym");
    types.add("fitness_center");
    payload.put("maxResultCount", MAX_RESULTS);
    payload.put("rankPreference", "DISTANCE");
    circle(payload.putObject("locationRestriction"), lat, lng, NEARBY_RADIUS_M);
    return execute(NEARBY_SEARCH_ENDPOINT, payload);
  }

  private void circle(ObjectNode target, double lat, double lng, int radiusM) {
    ObjectNode circle = target.putObject("circle");
    ObjectNode center = circle.putObject("center");
    center.put("latitude", lat);
    center.put("longitude", lng);
    circle.put("radius", radiusM);
  }

  private List<PlaceResult> execute(String endpoint, ObjectNode payload) {
    try {
      HttpRequest request = HttpRequest.newBuilder()
        .uri(URI.create(endpoint))
        .timeout(Duration.ofSeconds(10))
        .header("Content-Type", "application/json")
        .header("X-Goog-Api-Key", apiKey)
        .header("X-Goog-FieldMask", FIELD_MASK)
        .POST(
          HttpRequest.BodyPublishers.ofString(
            mapper.writeValueAsString(payload)
          )
        )
        .build();

      HttpResponse<String> response = httpClient.send(
        request,
        HttpResponse.BodyHandlers.ofString()
      );

      if (response.statusCode() < 200 || response.statusCode() >= 300) {
        log.error(
          "Places call failed ({}): {}",
          response.statusCode(),
          response.body()
        );
        throw new IllegalStateException("Places request failed");
      }
      return parsePlaces(response.body());
    } catch (IllegalStateException e) {
      throw e;
    } catch (Exception e) {
      log.error("Places request error: {}", e.getMessage());
      throw new IllegalStateException("Places request failed", e);
    }
  }

  private List<PlaceResult> parsePlaces(String body) throws Exception {
    JsonNode root = mapper.readTree(body);
    List<PlaceResult> results = new ArrayList<>();
    for (JsonNode p : root.path("places")) {
      String id = p.path("id").asText("").trim();
      String name = p.path("displayName").path("text").asText("").trim();
      if (id.isEmpty() || name.isEmpty()) continue;
      JsonNode loc = p.path("location");
      results.add(
        new PlaceResult(
          id,
          name,
          p.path("formattedAddress").asText(null),
          coord(loc, "latitude"),
          coord(loc, "longitude")
        )
      );
    }
    return results;
  }

  private BigDecimal coord(JsonNode location, String field) {
    JsonNode value = location.path(field);
    if (!value.isNumber()) return null;
    return BigDecimal.valueOf(value.asDouble()).setScale(
      COORD_SCALE,
      RoundingMode.HALF_UP
    );
  }
}
