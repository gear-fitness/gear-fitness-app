package com.gearfitness.gear_api.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gearfitness.gear_api.dto.AiLogRequest;
import com.gearfitness.gear_api.dto.AiLogResponse;
import com.gearfitness.gear_api.dto.LogEntryDTO;
import com.gearfitness.gear_api.dto.LogFoodRequest;
import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.entity.NutritionCache;
import com.gearfitness.gear_api.entity.Tier;
import com.gearfitness.gear_api.repository.AppUserRepository;
import com.gearfitness.gear_api.repository.NutritionCacheRepository;
import com.gearfitness.gear_api.service.PerplexityClient.ParsedFood;
import com.gearfitness.gear_api.service.PerplexityClient.PerplexityResult;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

/**
 * AI natural-language food logging (ULTRA tier). Pipeline per request:
 *   tier check -> spend guard -> cache check -> (miss) Sonar -> cache write ->
 *   log entries via {@link NutritionService#logFood}.
 *
 * The cache is keyed by normalized user text; a hit replays the stored parse
 * without a paid Sonar call. Cache rows are only written on a miss, so their
 * per-month count backs the spend guard.
 */
@Service
@Slf4j
public class AiNutritionService {

  private final PerplexityClient perplexityClient;
  private final NutritionCacheRepository cacheRepository;
  private final NutritionService nutritionService;
  private final AppUserRepository appUserRepository;
  private final ObjectMapper mapper = new ObjectMapper();
  private final TransactionTemplate txTemplate;
  private final int monthlyCap;

  public AiNutritionService(
    PerplexityClient perplexityClient,
    NutritionCacheRepository cacheRepository,
    NutritionService nutritionService,
    AppUserRepository appUserRepository,
    PlatformTransactionManager txManager,
    @Value("${ai.nutrition.monthly-sonar-cap:500}") int monthlyCap
  ) {
    this.perplexityClient = perplexityClient;
    this.cacheRepository = cacheRepository;
    this.nutritionService = nutritionService;
    this.appUserRepository = appUserRepository;
    this.txTemplate = new TransactionTemplate(txManager);
    this.monthlyCap = monthlyCap;
  }

  /**
   * Orchestrates a natural-language food log. Reads (tier/cache/spend) and the
   * Sonar call run with NO open transaction; only the DB writes (cache row +
   * logged entries) are wrapped in short transactions via {@link #txTemplate}.
   * This keeps a slow/hung upstream call from pinning a pooled DB connection.
   */
  public AiLogResponse aiLog(UUID userId, AiLogRequest req) {
    AppUser user = appUserRepository
      .findById(userId)
      .orElseThrow(() -> new IllegalArgumentException("User not found"));

    if (!user.getTier().atLeast(Tier.ULTRA)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "AI_TIER");
    }

    String text = req.getText() == null ? "" : req.getText().trim();
    if (text.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "AI_EMPTY_TEXT");
    }

    String key = normalizeKey(text);
    Optional<NutritionCache> cached = cacheRepository.findByNormalizedKey(key);
    if (cached.isPresent()) {
      return replayCached(userId, req, cached.get());
    }

    // Cache miss. Spend guard first (only misses trigger a paid Sonar call), so
    // gate on the number of cache rows created this calendar month.
    LocalDateTime monthStart = LocalDate.now().withDayOfMonth(1).atStartOfDay();
    if (cacheRepository.countByCreatedAtAfter(monthStart) >= monthlyCap) {
      throw new ResponseStatusException(
        HttpStatus.SERVICE_UNAVAILABLE,
        "AI_MONTHLY_LIMIT"
      );
    }

    PerplexityResult result;
    try {
      result = perplexityClient.parse(text);
    } catch (RuntimeException e) {
      // Timeout / non-2xx / unparseable upstream response — retryable, not a
      // server bug. Map to 502 so the client can offer a retry rather than
      // surfacing an opaque 500.
      log.error("Sonar parse failed for AI log: {}", e.getMessage());
      throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI_UPSTREAM", e);
    }

    return persistFreshParse(userId, req, key, result);
  }

  /** Cache hit: bump hit stats and re-log the stored foods, in one transaction. */
  private AiLogResponse replayCached(UUID userId, AiLogRequest req, NutritionCache hit) {
    List<ParsedFood> foods = deserializeFoods(hit.getParsedResult());
    List<String> sourceUrls = deserializeUrls(hit.getSourceUrls());
    String reasoning = hit.getReasoning() == null ? "" : hit.getReasoning();
    int confidence = hit.getConfidence() == null ? 0 : hit.getConfidence();

    return txTemplate.execute(status -> {
      hit.setHitCount(hit.getHitCount() + 1);
      hit.setLastHitAt(LocalDateTime.now());
      cacheRepository.save(hit);
      List<LogEntryDTO> entries = logFoods(userId, req, foods, "AI_CACHE", sourceUrls);
      return new AiLogResponse(
        entries, true, sourceUrls, reasoning, confidence, foods.isEmpty()
      );
    });
  }

  /** Cache miss: persist the fresh parse (unless empty) then log its foods. */
  private AiLogResponse persistFreshParse(
    UUID userId,
    AiLogRequest req,
    String key,
    PerplexityResult result
  ) {
    List<ParsedFood> foods = result.foods();
    List<String> sourceUrls = result.citations();
    String reasoning = result.reasoning();
    int confidence = result.confidence();

    // Never cache an empty parse: a transient "no food recognized" would
    // otherwise be replayed forever for that exact phrase. The cache write is
    // its own transaction so a concurrent-insert conflict can't poison the
    // entry-logging transaction below.
    if (!foods.isEmpty()) {
      try {
        txTemplate.executeWithoutResult(status -> {
          NutritionCache row = NutritionCache.builder()
            .normalizedKey(key)
            .parsedResult(serialize(foods))
            .sourceUrls(serialize(sourceUrls))
            .reasoning(reasoning)
            .confidence(confidence)
            .hitCount(0)
            .createdAt(LocalDateTime.now())
            .build();
          cacheRepository.save(row);
        });
      } catch (DataIntegrityViolationException dup) {
        // A concurrent first-time request cached the same key between our
        // lookup and this insert. Harmless — our own parse still logs the food.
        log.debug("Concurrent cache insert for key '{}', ignoring", key);
      }
    }

    List<LogEntryDTO> entries = txTemplate.execute(status ->
      logFoods(userId, req, foods, "AI_SONAR", sourceUrls)
    );
    return new AiLogResponse(
      entries, false, sourceUrls, reasoning, confidence, foods.isEmpty()
    );
  }

  /** Create one log entry per parsed food. Must run inside a transaction. */
  private List<LogEntryDTO> logFoods(
    UUID userId,
    AiLogRequest req,
    List<ParsedFood> foods,
    String sourceType,
    List<String> sourceUrls
  ) {
    String primaryUrl = sourceUrls.isEmpty() ? null : sourceUrls.get(0);
    List<LogEntryDTO> entries = new ArrayList<>();
    for (ParsedFood food : foods) {
      LogFoodRequest logReq = new LogFoodRequest();
      logReq.setDate(req.getDate());
      logReq.setCategory(req.getCategory());
      logReq.setDescription(food.description());
      logReq.setCalories(food.calories());
      logReq.setProteinG(food.proteinG());
      logReq.setCarbsG(food.carbsG());
      logReq.setFatG(food.fatG());
      logReq.setSourceType(sourceType);
      logReq.setSourceUrl(primaryUrl);
      entries.add(nutritionService.logFood(userId, logReq));
    }
    return entries;
  }

  /**
   * Normalize the cache key: lowercase, strip leading/trailing non-alphanumeric,
   * collapse internal whitespace. Numeric quantities are preserved since they
   * change the macros. "  2 Scrambled Eggs! " -> "2 scrambled eggs".
   */
  String normalizeKey(String text) {
    String s = text.toLowerCase().trim();
    s = s.replaceAll("^[^a-z0-9]+", "").replaceAll("[^a-z0-9]+$", "");
    s = s.replaceAll("\\s+", " ");
    if (s.length() > 512) s = s.substring(0, 512);
    return s;
  }

  private String serialize(Object value) {
    try {
      return mapper.writeValueAsString(value);
    } catch (Exception e) {
      throw new IllegalStateException("Failed to serialize cache value", e);
    }
  }

  private List<ParsedFood> deserializeFoods(String json) {
    try {
      return mapper.readValue(json, new TypeReference<List<ParsedFood>>() {});
    } catch (Exception e) {
      log.error("Failed to read cached foods: {}", e.getMessage());
      return List.of();
    }
  }

  private List<String> deserializeUrls(String json) {
    try {
      return mapper.readValue(json, new TypeReference<List<String>>() {});
    } catch (Exception e) {
      return List.of();
    }
  }
}
