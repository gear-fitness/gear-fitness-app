package com.gearfitness.gear_api.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gearfitness.gear_api.dto.LocationSearchResultDTO;
import com.gearfitness.gear_api.entity.Location;
import com.gearfitness.gear_api.entity.LocationSearchCache;
import com.gearfitness.gear_api.repository.LocationRepository;
import com.gearfitness.gear_api.repository.LocationSearchCacheRepository;
import com.gearfitness.gear_api.service.GooglePlacesClient.PlaceResult;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

/**
 * Gym search behind the workout location picker. Pipeline per request:
 * cache check -> spend guards -> paid Places call -> cache write. Whenever
 * the paid path is unavailable (key unset, caps reached, upstream failure)
 * the search degrades to the local location table instead of erroring, so
 * the picker always works. Cache and spend-guard design mirror
 * {@link AiNutritionService}.
 */
@Service
@Slf4j
public class LocationSearchService {

  // Google's terms cap caching of Places response fields at 30 days (place
  // IDs alone are exempt — those persist in the location table).
  private static final int CACHE_TTL_DAYS = 30;
  private static final int LOCAL_LIMIT = 20;

  private final GooglePlacesClient placesClient;
  private final LocationSearchCacheRepository cacheRepository;
  private final LocationRepository locationRepository;
  private final ObjectMapper mapper = new ObjectMapper();
  private final int monthlyCap;
  private final int userDailyCap;

  // Per-user daily paid-call limiter. NOTE: in-memory, so the count resets on
  // restart and is per-instance only — a cheap backstop so one user cannot
  // drain the global monthly cap, same trade-off as AiNutritionService.
  private final ConcurrentHashMap<UUID, DailyCount> dailyCounts =
    new ConcurrentHashMap<>();

  private static final class DailyCount {

    private final LocalDate day;
    private int count;

    private DailyCount(LocalDate day, int count) {
      this.day = day;
      this.count = count;
    }
  }

  public LocationSearchService(
    GooglePlacesClient placesClient,
    LocationSearchCacheRepository cacheRepository,
    LocationRepository locationRepository,
    @Value("${places.monthly-cap:4500}") int monthlyCap,
    @Value("${places.user.daily.cap:30}") int userDailyCap
  ) {
    this.placesClient = placesClient;
    this.cacheRepository = cacheRepository;
    this.locationRepository = locationRepository;
    this.monthlyCap = monthlyCap;
    this.userDailyCap = userDailyCap;
  }

  /**
   * Query-only -> text search; coords-only -> nearby gyms; both -> text
   * search biased to the caller; neither -> empty list. Out-of-range
   * coordinates are treated as absent rather than rejected.
   */
  public List<LocationSearchResultDTO> search(
    UUID userId,
    String rawQuery,
    Double lat,
    Double lng
  ) {
    String query = rawQuery == null ? "" : normalizeQuery(rawQuery);
    boolean hasCoords =
      lat != null && lng != null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
    if (query.isEmpty() && !hasCoords) {
      return List.of();
    }

    String key = cacheKey(
      query,
      hasCoords ? lat : null,
      hasCoords ? lng : null
    );
    Optional<LocationSearchCache> cached = cacheRepository.findByCacheKey(key);
    if (cached.isPresent()) {
      LocationSearchCache hit = cached.get();
      if (
        hit
          .getCreatedAt()
          .isAfter(LocalDateTime.now().minusDays(CACHE_TTL_DAYS))
      ) {
        hit.setHitCount(hit.getHitCount() + 1);
        hit.setLastHitAt(LocalDateTime.now());
        cacheRepository.save(hit);
        return deserialize(hit.getResults());
      }
      // Expired: delete so the fresh paid call below can rewrite the key.
      cacheRepository.delete(hit);
    }

    if (
      !placesClient.isConfigured() ||
      monthlyCapReached() ||
      !recordPaidCallWithinDailyCap(userId)
    ) {
      return localSearch(query, lat, lng);
    }

    List<PlaceResult> places;
    try {
      places = query.isEmpty()
        ? placesClient.searchNearby(lat, lng)
        : placesClient.searchText(
            query,
            hasCoords ? lat : null,
            hasCoords ? lng : null
          );
    } catch (RuntimeException e) {
      // An upstream failure is not the user's problem — degrade to the local
      // table rather than surfacing a 5xx from a picker.
      log.error(
        "Places search failed, falling back to local: {}",
        e.getMessage()
      );
      return localSearch(query, lat, lng);
    }

    List<LocationSearchResultDTO> results = places
      .stream()
      .map(p ->
        new LocationSearchResultDTO(
          p.googlePlaceId(),
          p.name(),
          p.address(),
          p.latitude(),
          p.longitude()
        )
      )
      .toList();
    writeCacheRow(key, results);
    return results;
  }

  private boolean monthlyCapReached() {
    LocalDateTime monthStart = LocalDate.now().withDayOfMonth(1).atStartOfDay();
    boolean reached =
      cacheRepository.countByCreatedAtAfter(monthStart) >= monthlyCap;
    if (reached) {
      log.warn(
        "Monthly Places cap ({}) reached; gym search degraded to local-only.",
        monthlyCap
      );
    }
    return reached;
  }

  /**
   * Count a paid call against the user's daily budget, atomically. Returns
   * false (without counting) once the cap is reached — the caller degrades
   * to local search instead of erroring.
   */
  private boolean recordPaidCallWithinDailyCap(UUID userId) {
    LocalDate today = LocalDate.now();
    boolean[] allowed = { true };
    dailyCounts.compute(userId, (id, existing) -> {
      if (existing == null || !existing.day.equals(today)) {
        return new DailyCount(today, 1);
      }
      if (existing.count >= userDailyCap) {
        allowed[0] = false;
        return existing;
      }
      existing.count++;
      return existing;
    });
    return allowed[0];
  }

  private List<LocationSearchResultDTO> localSearch(
    String query,
    Double lat,
    Double lng
  ) {
    // query.isEmpty() implies valid coords: the empty-query/no-coords case
    // already returned before any fallback can be reached.
    List<Location> rows = query.isEmpty()
      ? locationRepository.findNearest(lat, lng, LOCAL_LIMIT)
      : locationRepository.searchByName(query, LOCAL_LIMIT);
    return rows
      .stream()
      .map(l ->
        new LocationSearchResultDTO(
          l.getGooglePlaceId(),
          l.getName(),
          l.getAddress(),
          l.getLatitude(),
          l.getLongitude()
        )
      )
      .toList();
  }

  /**
   * Unlike nutrition_cache, empty result lists ARE cached: "no gyms match"
   * is a real answer for a query, and skipping the write would let repeated
   * misses on the same bad query drain the spend caps.
   */
  private void writeCacheRow(
    String key,
    List<LocationSearchResultDTO> results
  ) {
    try {
      cacheRepository.save(
        LocationSearchCache.builder()
          .cacheKey(key)
          .results(serialize(results))
          .hitCount(0)
          .createdAt(LocalDateTime.now())
          .build()
      );
    } catch (DataIntegrityViolationException dup) {
      // A concurrent request cached the same key between our lookup and this
      // insert. Harmless — our own results still stand.
      log.debug("Concurrent cache insert for key '{}', ignoring", key);
    }
  }

  /**
   * Normalize the query for both the upstream call and the cache key:
   * lowercase, collapse whitespace, strip edge punctuation — so "Gold's " and
   * "gold's" share one cached paid call.
   */
  String normalizeQuery(String text) {
    String s = text.toLowerCase(Locale.ROOT).trim();
    s = s.replaceAll("^[^a-z0-9]+", "").replaceAll("[^a-z0-9'&]+$", "");
    s = s.replaceAll("\\s+", " ");
    if (s.length() > 512) s = s.substring(0, 512);
    return s;
  }

  /**
   * Coordinates are rounded to 2 decimals (~1.1 km) so neighbouring callers
   * share one paid call; "-" marks a missing coordinate pair.
   */
  String cacheKey(String query, Double lat, Double lng) {
    String coords =
      lat != null && lng != null
        ? String.format(Locale.US, "%.2f,%.2f", lat, lng)
        : "-";
    return (query.isEmpty() ? "near" : "q:" + query) + "|" + coords;
  }

  private String serialize(List<LocationSearchResultDTO> results) {
    try {
      return mapper.writeValueAsString(results);
    } catch (Exception e) {
      throw new IllegalStateException("Failed to serialize search results", e);
    }
  }

  private List<LocationSearchResultDTO> deserialize(String json) {
    try {
      return mapper.readValue(
        json,
        new TypeReference<List<LocationSearchResultDTO>>() {}
      );
    } catch (Exception e) {
      log.error("Failed to read cached search results: {}", e.getMessage());
      return List.of();
    }
  }
}
