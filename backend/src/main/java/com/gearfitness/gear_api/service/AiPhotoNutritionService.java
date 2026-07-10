package com.gearfitness.gear_api.service;

import com.gearfitness.gear_api.dto.AiPhotoEstimateRequest;
import com.gearfitness.gear_api.dto.AiPhotoEstimateResponse;
import com.gearfitness.gear_api.dto.AiPhotoEstimateResponse.PhotoFood;
import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.entity.Tier;
import com.gearfitness.gear_api.repository.AppUserRepository;
import com.gearfitness.gear_api.service.PerplexityClient.PerplexityResult;
import java.time.LocalDate;
import java.util.Base64;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * AI nutrition estimation from meal photos (PLUS tier and above). The client
 * uploads the compressed JPEG directly to S3 (presigned PUT) and sends only the
 * object key, so the image bytes never hit this API's request body or its WAF.
 * Pipeline per request: key ownership guard -> tier check -> HeadObject
 * size/type guard -> per-user daily cap -> fetch bytes -> Sonar vision call.
 * The S3 object is deleted in a finally regardless of outcome, and a lifecycle
 * rule on the ai-food/ prefix sweeps any object a client uploads but never
 * submits; nothing about the photo is persisted or logged here (the client
 * confirms the results and logs through NutritionService), and unlike the text
 * path there is no cache because every photo is unique.
 *
 * Spend note: the per-user daily caps are the only guard. There is no durable
 * global monthly cap; the text path's global cap counts nutrition_cache rows,
 * which photo calls never create. Accepted risk while per-image cost is low.
 * Two counters per user per day: a success cap that is refunded on upstream
 * failure (a flaky upstream should not eat the allowance), and an attempt
 * ceiling at 2x the cap that is never refunded, so failed calls (which may
 * still have been billed) stay bounded.
 */
@Service
@Slf4j
public class AiPhotoNutritionService {

  private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
    "image/jpeg",
    "image/png"
  );

  /** Decoded-bytes ceiling; the client sends ~1024px JPEGs far below this. */
  private static final int MAX_IMAGE_BYTES = 4 * 1024 * 1024;

  private static final int MAX_NOTE_LENGTH = 500;

  private final PerplexityClient perplexityClient;
  private final AppUserRepository appUserRepository;
  private final S3StorageService s3StorageService;
  private final int userDailyCap;

  // Per-user daily paid-call limiter, the same in-memory backstop
  // AiNutritionService uses (deliberately duplicated, not shared: the two
  // features should not drain one another's allowance). Resets on restart and
  // is per-instance only.
  private final ConcurrentHashMap<UUID, DailyCount> dailyCounts =
    new ConcurrentHashMap<>();

  // Companion attempt counter: every call that reaches the paid upstream is
  // counted here and never rolled back, with a hard ceiling at 2x the cap.
  // Without it the refund on the 502 path would let a user (or a flaky
  // upstream) generate unlimited billable failed attempts.
  private final ConcurrentHashMap<UUID, DailyCount> dailyAttempts =
    new ConcurrentHashMap<>();

  private static final class DailyCount {

    private final LocalDate day;
    private int count;

    private DailyCount(LocalDate day, int count) {
      this.day = day;
      this.count = count;
    }
  }

  public AiPhotoNutritionService(
    PerplexityClient perplexityClient,
    AppUserRepository appUserRepository,
    S3StorageService s3StorageService,
    @Value("${ai.photo.user.daily.cap:15}") int userDailyCap
  ) {
    this.perplexityClient = perplexityClient;
    this.appUserRepository = appUserRepository;
    this.s3StorageService = s3StorageService;
    this.userDailyCap = userDailyCap;
  }

  public AiPhotoEstimateResponse estimate(
    UUID userId,
    AiPhotoEstimateRequest req
  ) {
    AppUser user = appUserRepository
      .findById(userId)
      .orElseThrow(() -> new IllegalArgumentException("User not found"));

    // Ownership + prefix guard: the key must be THIS user's ephemeral upload.
    // Rejected before the try so a foreign or garbage key is never deleted.
    String key = req.getS3Key() == null ? "" : req.getS3Key().trim();
    String expectedPrefix = S3StorageService.AI_FOOD_PREFIX + userId + "/";
    if (!key.startsWith(expectedPrefix)) {
      throw new ResponseStatusException(
        HttpStatus.BAD_REQUEST,
        "AI_BAD_IMAGE_KEY"
      );
    }

    try {
      if (!user.getTier().atLeast(Tier.PLUS)) {
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "AI_TIER");
      }

      // HeadObject bounds size/type before the body is pulled into heap: a
      // presigned PUT is size-unbounded, so an oversized or wrong-type object
      // must be rejected without downloading it. A missing object (never
      // uploaded, already swept, or a stale retry) surfaces as AI_EMPTY_IMAGE.
      S3StorageService.ObjectMetadata meta;
      try {
        meta = s3StorageService.headObject(key);
      } catch (Exception e) {
        throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST,
          "AI_EMPTY_IMAGE"
        );
      }

      String mimeType =
        meta.contentType() == null
          ? ""
          : meta.contentType().trim().toLowerCase();
      if (!ALLOWED_MIME_TYPES.contains(mimeType)) {
        throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST,
          "AI_BAD_MIME"
        );
      }
      if (meta.contentLength() <= 0 || meta.contentLength() > MAX_IMAGE_BYTES) {
        throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST,
          "AI_IMAGE_TOO_LARGE"
        );
      }

      String note = req.getNote() == null ? null : req.getNote().trim();
      if (note != null && note.length() > MAX_NOTE_LENGTH) {
        note = note.substring(0, MAX_NOTE_LENGTH);
      }

      enforceDailyCap(userId);

      byte[] bytes = s3StorageService.getObjectBytes(key);
      // Defend against a race where the object grew between HEAD and GET.
      if (bytes.length > MAX_IMAGE_BYTES) {
        throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST,
          "AI_IMAGE_TOO_LARGE"
        );
      }
      String imageBase64 = Base64.getEncoder().encodeToString(bytes);

      PerplexityResult result;
      try {
        result = perplexityClient.estimateFoodFromImage(
          imageBase64,
          mimeType,
          note
        );
      } catch (ResponseStatusException e) {
        // Explicit client-visible status from the client layer (e.g. 503
        // AI_UNAVAILABLE when the API key is unset). Propagate unchanged.
        throw e;
      } catch (RuntimeException e) {
        // Timeout / non-2xx / unparseable upstream response. Retryable, not a
        // server bug, so map to 502 rather than an opaque 500. The user got
        // nothing for this call, so hand the daily-cap slot back rather than
        // letting a flaky upstream burn their allowance.
        rollbackDailyCap(userId);
        log.error("Sonar photo estimate failed: {}", e.getMessage());
        throw new ResponseStatusException(
          HttpStatus.BAD_GATEWAY,
          "AI_UPSTREAM",
          e
        );
      }

      return toResponse(result);
    } finally {
      // Delete the ephemeral upload no matter the outcome (success, no-food,
      // tier/cap rejection, upstream failure). The lifecycle rule on the
      // ai-food/ prefix is only the backstop for objects a client uploads but
      // never submits here.
      s3StorageService.deleteAiFoodImage(key);
    }
  }

  /**
   * Per-user daily cap on paid vision calls, checked and incremented
   * atomically. Stale-day entries reset on access. Mirrors
   * AiNutritionService.enforceDailyCap with the photo-specific config knob.
   * The attempt counter goes first and is never refunded: it is the hard
   * ceiling on billable calls, while the success counter below is the one
   * rollbackDailyCap hands back on upstream failure.
   */
  private void enforceDailyCap(UUID userId) {
    if (!tryIncrement(dailyAttempts, userId, userDailyCap * 2)) {
      throw new ResponseStatusException(
        HttpStatus.SERVICE_UNAVAILABLE,
        "AI_DAILY_LIMIT"
      );
    }
    if (!tryIncrement(dailyCounts, userId, userDailyCap)) {
      throw new ResponseStatusException(
        HttpStatus.SERVICE_UNAVAILABLE,
        "AI_DAILY_LIMIT"
      );
    }
  }

  /**
   * Atomically take one slot from a per-user daily counter; returns false
   * when the counter is already at its limit for today.
   */
  private boolean tryIncrement(
    ConcurrentHashMap<UUID, DailyCount> counts,
    UUID userId,
    int limit
  ) {
    LocalDate today = LocalDate.now();
    boolean[] exceeded = { false };
    counts.compute(userId, (id, existing) -> {
      if (existing == null || !existing.day.equals(today)) {
        return new DailyCount(today, 1);
      }
      if (existing.count >= limit) {
        exceeded[0] = true;
        return existing;
      }
      existing.count++;
      return existing;
    });
    return !exceeded[0];
  }

  /**
   * Return the daily-cap slot reserved by enforceDailyCap after an upstream
   * failure. The slot is still taken before the paid call (so concurrent spam
   * cannot bypass the cap); this only undoes it when the call produced no
   * result. Mutation happens inside compute, same as enforceDailyCap, so it
   * is atomic per user. The attempt counter is deliberately not refunded;
   * that ceiling is what keeps refunded failures from becoming unlimited
   * billable retries. Known benign midnight edge: a call taken just before
   * midnight that fails just after can decrement the new day's count,
   * granting one extra success slot at most.
   */
  private void rollbackDailyCap(UUID userId) {
    LocalDate today = LocalDate.now();
    dailyCounts.computeIfPresent(userId, (id, existing) -> {
      if (existing.day.equals(today) && existing.count > 0) {
        existing.count--;
      }
      return existing;
    });
  }

  /**
   * Shape the model output defensively: drop items without a description,
   * clamp negative numbers to zero (missing numbers already parse to 0 in
   * PerplexityClient). The structured-output schema makes garbage rare, but a
   * paid upstream reply should never 500 on the way out.
   */
  private AiPhotoEstimateResponse toResponse(PerplexityResult result) {
    List<PhotoFood> foods = result
      .foods()
      .stream()
      .filter(f -> f.description() != null && !f.description().isBlank())
      .map(f ->
        new PhotoFood(
          f.description().trim(),
          clamp(f.calories()),
          clamp(f.proteinG()),
          clamp(f.carbsG()),
          clamp(f.fatG())
        )
      )
      .toList();
    return new AiPhotoEstimateResponse(
      foods,
      result.reasoning(),
      result.confidence(),
      foods.isEmpty()
    );
  }

  private double clamp(double value) {
    return Math.max(0, value);
  }
}
