package com.gearfitness.gear_api.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.gearfitness.gear_api.dto.AiEstimateResponse;
import com.gearfitness.gear_api.dto.AiLogRequest;
import com.gearfitness.gear_api.dto.AiLogResponse;
import com.gearfitness.gear_api.dto.AiPhotoEstimateRequest;
import com.gearfitness.gear_api.dto.AiPhotoEstimateResponse;
import com.gearfitness.gear_api.dto.BarcodeLookupResponse;
import com.gearfitness.gear_api.dto.CustomFoodRequest;
import com.gearfitness.gear_api.dto.DaySummaryDTO;
import com.gearfitness.gear_api.dto.FoodItemDTO;
import com.gearfitness.gear_api.dto.JournalNoteDTO;
import com.gearfitness.gear_api.dto.JournalUpsertRequest;
import com.gearfitness.gear_api.dto.LogEntryDTO;
import com.gearfitness.gear_api.dto.LogFoodRequest;
import com.gearfitness.gear_api.dto.NutritionGoalDTO;
import com.gearfitness.gear_api.dto.RecalculateGoalRequest;
import com.gearfitness.gear_api.dto.UpdateGoalRequest;
import com.gearfitness.gear_api.security.JwtService;
import com.gearfitness.gear_api.service.AiNutritionService;
import com.gearfitness.gear_api.service.AiPhotoNutritionService;
import com.gearfitness.gear_api.service.BarcodeFoodService;
import com.gearfitness.gear_api.service.NutritionService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/nutrition")
@RequiredArgsConstructor
@Slf4j
public class NutritionController {

  private final NutritionService nutritionService;
  private final AiNutritionService aiNutritionService;
  private final AiPhotoNutritionService aiPhotoNutritionService;
  private final BarcodeFoodService barcodeFoodService;
  private final JwtService jwtService;

  /**
   * Resolve the caller's id from the bearer token, or null if extraction fails.
   * Callers turn a null into a 401 so a bad/missing token never falls through to
   * the generic 500 catch below.
   */
  private UUID resolveUserId(String authHeader) {
    try {
      return jwtService.extractUserId(authHeader.substring(7));
    } catch (Exception e) {
      log.warn("JWT extraction failed: {}", e.getMessage());
      return null;
    }
  }

  /**
   * Search the seeded USDA food database. A blank/absent query returns the
   * default browse list (used by the Add Food screen before the user types).
   */
  @GetMapping("/foods/search")
  public ResponseEntity<List<FoodItemDTO>> searchFoods(
    @RequestParam(
      value = "q",
      required = false,
      defaultValue = ""
    ) String query,
    @RequestParam(defaultValue = "0") int page,
    @RequestHeader("Authorization") String authHeader
  ) {
    UUID userId = resolveUserId(authHeader);
    if (userId == null) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
    try {
      return ResponseEntity.ok(
        nutritionService.searchFoods(userId, query, page)
      );
    } catch (Exception e) {
      log.error(
        "searchFoods failed (query='{}', page={}): {}",
        query,
        page,
        e.getMessage(),
        e
      );
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }

  /**
   * The user's own foods (recent + frequent), shown by the Add Food screen
   * before the user types. Falls back to the popular browse list for users
   * with no logging history.
   */
  @GetMapping("/foods/recent")
  public ResponseEntity<List<FoodItemDTO>> recentFoods(
    @RequestHeader("Authorization") String authHeader
  ) {
    UUID userId = resolveUserId(authHeader);
    if (userId == null) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
    try {
      return ResponseEntity.ok(nutritionService.getUserFoods(userId));
    } catch (Exception e) {
      log.error(
        "recentFoods failed (userId={}): {}",
        userId,
        e.getMessage(),
        e
      );
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }

  /** The user's custom foods ("saved meals"), newest first. */
  @GetMapping("/foods/custom")
  public ResponseEntity<List<FoodItemDTO>> customFoods(
    @RequestHeader("Authorization") String authHeader
  ) {
    UUID userId = resolveUserId(authHeader);
    if (userId == null) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
    try {
      return ResponseEntity.ok(nutritionService.getCustomFoods(userId));
    } catch (Exception e) {
      log.error(
        "customFoods failed (userId={}): {}",
        userId,
        e.getMessage(),
        e
      );
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }

  /** Create a custom food (per-serving nutrition). */
  @PostMapping("/foods/custom")
  public ResponseEntity<FoodItemDTO> createCustomFood(
    @RequestBody CustomFoodRequest req,
    @RequestHeader("Authorization") String authHeader
  ) {
    UUID userId = resolveUserId(authHeader);
    if (userId == null) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
    try {
      return ResponseEntity.status(HttpStatus.CREATED).body(
        nutritionService.createCustomFood(userId, req)
      );
    } catch (IllegalArgumentException e) {
      return ResponseEntity.badRequest().build();
    } catch (Exception e) {
      log.error(
        "createCustomFood failed (userId={}): {}",
        userId,
        e.getMessage(),
        e
      );
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }

  /** Update one of the caller's custom foods. */
  @PutMapping("/foods/custom/{foodId}")
  public ResponseEntity<FoodItemDTO> updateCustomFood(
    @PathVariable UUID foodId,
    @RequestBody CustomFoodRequest req,
    @RequestHeader("Authorization") String authHeader
  ) {
    UUID userId = resolveUserId(authHeader);
    if (userId == null) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
    try {
      return ResponseEntity.ok(
        nutritionService.updateCustomFood(userId, foodId, req)
      );
    } catch (IllegalArgumentException e) {
      return ResponseEntity.badRequest().build();
    } catch (Exception e) {
      log.error(
        "updateCustomFood failed (userId={}, foodId={}): {}",
        userId,
        foodId,
        e.getMessage(),
        e
      );
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }

  /** Delete one of the caller's custom foods (logged history keeps its snapshot). */
  @DeleteMapping("/foods/custom/{foodId}")
  public ResponseEntity<Void> deleteCustomFood(
    @PathVariable UUID foodId,
    @RequestHeader("Authorization") String authHeader
  ) {
    UUID userId = resolveUserId(authHeader);
    if (userId == null) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
    try {
      nutritionService.deleteCustomFood(userId, foodId);
      return ResponseEntity.noContent().build();
    } catch (IllegalArgumentException e) {
      return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
    } catch (Exception e) {
      log.error(
        "deleteCustomFood failed (userId={}, foodId={}): {}",
        userId,
        foodId,
        e.getMessage(),
        e
      );
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }

  /**
   * Resolve a scanned barcode to a food (PLUS tier and above). Checks the local
   * table first (seeded USDA Branded rows plus previously scanned products),
   * then falls back to a live OpenFoodFacts lookup whose hit is persisted for
   * next time. INCOMPLETE/NOT_FOUND statuses steer the client to the
   * custom-food fallback.
   */
  @GetMapping("/foods/barcode/{code}")
  public ResponseEntity<BarcodeLookupResponse> barcodeLookup(
    @PathVariable String code,
    @RequestHeader("Authorization") String authHeader
  ) {
    UUID userId = resolveUserId(authHeader);
    if (userId == null) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
    try {
      return ResponseEntity.ok(barcodeFoodService.lookup(userId, code));
    } catch (ResponseStatusException e) {
      // Preserve tier (403) / validation (400) / upstream (502) statuses.
      throw e;
    } catch (IllegalArgumentException e) {
      return ResponseEntity.badRequest().build();
    } catch (Exception e) {
      log.error(
        "barcodeLookup failed (userId={}, code={}): {}",
        userId,
        code,
        e.getMessage(),
        e
      );
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }

  /** Goal, consumed totals, and logged entries for a given day. */
  @GetMapping("/day")
  public ResponseEntity<DaySummaryDTO> getDay(
    @RequestParam(required = false) String date,
    @RequestHeader("Authorization") String authHeader
  ) {
    UUID userId = resolveUserId(authHeader);
    if (userId == null) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
    try {
      return ResponseEntity.ok(nutritionService.getDay(userId, date));
    } catch (IllegalArgumentException e) {
      return ResponseEntity.badRequest().build();
    } catch (Exception e) {
      log.error(
        "getDay failed (userId={}, date={}): {}",
        userId,
        date,
        e.getMessage(),
        e
      );
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }

  /**
   * ISO dates in [start, end] with at least one logged food — the calendar
   * sheet uses these to mark days that have entries.
   */
  @GetMapping("/logged-dates")
  public ResponseEntity<List<String>> loggedDates(
    @RequestParam String start,
    @RequestParam String end,
    @RequestHeader("Authorization") String authHeader
  ) {
    UUID userId = resolveUserId(authHeader);
    if (userId == null) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
    try {
      return ResponseEntity.ok(
        nutritionService.getLoggedDates(userId, start, end)
      );
    } catch (
      IllegalArgumentException
      | java.time.format.DateTimeParseException e
    ) {
      return ResponseEntity.badRequest().build();
    } catch (Exception e) {
      log.error(
        "loggedDates failed (userId={}, start={}, end={}): {}",
        userId,
        start,
        end,
        e.getMessage(),
        e
      );
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }

  /**
   * The day's journal note (the calorie tracker's shared per-day note), or 204
   * if none has been saved. The app normally reads this via /day; this exists
   * for the client's one-time migration check and debugging.
   */
  @GetMapping("/journal")
  public ResponseEntity<JournalNoteDTO> getJournal(
    @RequestParam String date,
    @RequestHeader("Authorization") String authHeader
  ) {
    UUID userId = resolveUserId(authHeader);
    if (userId == null) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
    try {
      JournalNoteDTO note = nutritionService.getJournal(userId, date);
      return note == null
        ? ResponseEntity.noContent().build()
        : ResponseEntity.ok(note);
    } catch (
      IllegalArgumentException
      | java.time.format.DateTimeParseException e
    ) {
      return ResponseEntity.badRequest().build();
    } catch (Exception e) {
      log.error(
        "getJournal failed (userId={}, date={}): {}",
        userId,
        date,
        e.getMessage(),
        e
      );
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }

  /**
   * Upsert the day's journal note (last-write-wins per date). Empty content
   * deletes the note (204). ifAbsent never overwrites an existing note, which
   * keeps the client migration idempotent across devices.
   */
  @PutMapping("/journal")
  public ResponseEntity<JournalNoteDTO> putJournal(
    @RequestBody JournalUpsertRequest req,
    @RequestHeader("Authorization") String authHeader
  ) {
    UUID userId = resolveUserId(authHeader);
    if (userId == null) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
    try {
      boolean ifAbsent = Boolean.TRUE.equals(req.getIfAbsent());
      JournalNoteDTO note;
      try {
        note = nutritionService.upsertJournal(
          userId,
          req.getDate(),
          req.getContent(),
          ifAbsent
        );
      } catch (DataIntegrityViolationException e) {
        // Two devices raced the first insert for this (user, date); the row
        // exists now, so one retry resolves it through the update/ifAbsent
        // branch instead of surfacing a 500.
        note = nutritionService.upsertJournal(
          userId,
          req.getDate(),
          req.getContent(),
          ifAbsent
        );
      }
      return note == null
        ? ResponseEntity.noContent().build()
        : ResponseEntity.ok(note);
    } catch (ResponseStatusException e) {
      // Preserve validation (400) statuses.
      throw e;
    } catch (
      IllegalArgumentException
      | java.time.format.DateTimeParseException e
    ) {
      return ResponseEntity.badRequest().build();
    } catch (Exception e) {
      log.error(
        "putJournal failed (userId={}, date={}): {}",
        userId,
        req == null ? null : req.getDate(),
        e.getMessage(),
        e
      );
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }

  /**
   * Set an entry's display metadata (the unit/quantity it was logged in, e.g.
   * "4 oz"). Exists for the client's one-time backfill of locally stored unit
   * metadata; new entries send displayMeta on the log request itself.
   */
  @PutMapping("/log/{entryId}/display")
  public ResponseEntity<LogEntryDTO> updateEntryDisplayMeta(
    @PathVariable UUID entryId,
    @RequestBody(required = false) JsonNode meta,
    @RequestHeader("Authorization") String authHeader
  ) {
    UUID userId = resolveUserId(authHeader);
    if (userId == null) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
    try {
      return ResponseEntity.ok(
        nutritionService.updateEntryDisplayMeta(userId, entryId, meta)
      );
    } catch (ResponseStatusException e) {
      // Preserve the oversize-payload 400: it must stay distinguishable from
      // the ownership 404 below (a 400 payload should never be retried).
      throw e;
    } catch (IllegalArgumentException e) {
      return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
    } catch (Exception e) {
      log.error(
        "updateEntryDisplayMeta failed (userId={}, entryId={}): {}",
        userId,
        entryId,
        e.getMessage(),
        e
      );
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }

  /** Log a food (seeded reference or quick-add). */
  @PostMapping("/log")
  public ResponseEntity<LogEntryDTO> logFood(
    @RequestBody LogFoodRequest req,
    @RequestHeader("Authorization") String authHeader
  ) {
    UUID userId = resolveUserId(authHeader);
    if (userId == null) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
    try {
      return ResponseEntity.status(HttpStatus.CREATED).body(
        nutritionService.logFood(userId, req)
      );
    } catch (ResponseStatusException e) {
      // Preserve validation (400) statuses, e.g. oversize displayMeta.
      throw e;
    } catch (IllegalArgumentException e) {
      return ResponseEntity.badRequest().build();
    } catch (Exception e) {
      log.error("logFood failed (userId={}): {}", userId, e.getMessage(), e);
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }

  /**
   * Log food from natural-language text via AI (PLUS tier and above). Parses the text
   * with Perplexity Sonar (cached), then creates one entry per parsed food.
   */
  @PostMapping("/ai/log")
  public ResponseEntity<AiLogResponse> aiLog(
    @RequestBody AiLogRequest req,
    @RequestHeader("Authorization") String authHeader
  ) {
    UUID userId = resolveUserId(authHeader);
    if (userId == null) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
    try {
      return ResponseEntity.status(HttpStatus.CREATED).body(
        aiNutritionService.aiLog(userId, req)
      );
    } catch (ResponseStatusException e) {
      // Preserve tier (403) / spend-guard (503) / validation (400) statuses.
      throw e;
    } catch (IllegalArgumentException e) {
      return ResponseEntity.badRequest().build();
    } catch (Exception e) {
      log.error("aiLog failed (userId={}): {}", userId, e.getMessage(), e);
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }

  /**
   * Estimate nutrition from natural-language text WITHOUT logging (PLUS tier).
   * Backs the custom-food form's "calculate calories for me".
   */
  @PostMapping("/ai/estimate")
  public ResponseEntity<AiEstimateResponse> aiEstimate(
    @RequestBody AiLogRequest req,
    @RequestHeader("Authorization") String authHeader
  ) {
    UUID userId = resolveUserId(authHeader);
    if (userId == null) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
    try {
      return ResponseEntity.ok(
        aiNutritionService.aiEstimate(userId, req.getText())
      );
    } catch (ResponseStatusException e) {
      // Preserve tier (403) / spend-guard (503) / validation (400) statuses.
      throw e;
    } catch (IllegalArgumentException e) {
      return ResponseEntity.badRequest().build();
    } catch (Exception e) {
      log.error("aiEstimate failed (userId={}): {}", userId, e.getMessage(), e);
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }

  /**
   * Estimate nutrition from a meal photo WITHOUT logging (PLUS tier and
   * above). The client uploads the image directly to S3 (presigned PUT via
   * /api/images/food-upload-url) and sends only the object key here; the
   * response lists the foods the model saw, which the client confirms and logs
   * through the plain /log endpoint. The image is deleted right after analysis;
   * nothing about it is persisted server-side.
   */
  @PostMapping("/ai/photo/estimate")
  public ResponseEntity<AiPhotoEstimateResponse> aiPhotoEstimate(
    @RequestBody AiPhotoEstimateRequest req,
    @RequestHeader("Authorization") String authHeader
  ) {
    UUID userId = resolveUserId(authHeader);
    if (userId == null) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
    try {
      return ResponseEntity.ok(aiPhotoNutritionService.estimate(userId, req));
    } catch (ResponseStatusException e) {
      // Preserve tier (403) / spend-guard (503) / validation (400) statuses.
      throw e;
    } catch (IllegalArgumentException e) {
      return ResponseEntity.badRequest().build();
    } catch (Exception e) {
      log.error(
        "aiPhotoEstimate failed (userId={}): {}",
        userId,
        e.getMessage(),
        e
      );
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }

  @DeleteMapping("/log/{entryId}")
  public ResponseEntity<Void> deleteEntry(
    @PathVariable UUID entryId,
    @RequestHeader("Authorization") String authHeader
  ) {
    UUID userId = resolveUserId(authHeader);
    if (userId == null) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
    try {
      nutritionService.deleteEntry(userId, entryId);
      return ResponseEntity.noContent().build();
    } catch (IllegalArgumentException e) {
      return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
    } catch (Exception e) {
      log.error(
        "deleteEntry failed (userId={}, entryId={}): {}",
        userId,
        entryId,
        e.getMessage(),
        e
      );
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }

  @GetMapping("/goal")
  public ResponseEntity<NutritionGoalDTO> getGoal(
    @RequestHeader("Authorization") String authHeader
  ) {
    UUID userId = resolveUserId(authHeader);
    if (userId == null) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
    try {
      return ResponseEntity.ok(nutritionService.getGoal(userId));
    } catch (Exception e) {
      log.error("getGoal failed (userId={}): {}", userId, e.getMessage(), e);
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }

  /** Manually override the daily targets. */
  @PutMapping("/goal")
  public ResponseEntity<NutritionGoalDTO> updateGoal(
    @RequestBody UpdateGoalRequest req,
    @RequestHeader("Authorization") String authHeader
  ) {
    UUID userId = resolveUserId(authHeader);
    if (userId == null) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
    try {
      return ResponseEntity.ok(nutritionService.updateGoal(userId, req));
    } catch (IllegalArgumentException e) {
      return ResponseEntity.badRequest().build();
    } catch (Exception e) {
      log.error("updateGoal failed (userId={}): {}", userId, e.getMessage(), e);
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }

  /**
   * Recompute the daily targets from the user's profile (clears custom flag,
   * marks setup complete). Accepts an optional body carrying the cut/bulk
   * direction and pace from the setup wizard.
   */
  @PostMapping("/goal/recalculate")
  public ResponseEntity<NutritionGoalDTO> recalculateGoal(
    @RequestBody(required = false) RecalculateGoalRequest req,
    @RequestHeader("Authorization") String authHeader
  ) {
    UUID userId = resolveUserId(authHeader);
    if (userId == null) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
    try {
      return ResponseEntity.ok(
        nutritionService.recalculateGoal(
          userId,
          req == null ? null : req.getGoalType(),
          req == null ? null : req.getGoalIntensity()
        )
      );
    } catch (IllegalArgumentException e) {
      return ResponseEntity.badRequest().build();
    } catch (Exception e) {
      log.error(
        "recalculateGoal failed (userId={}): {}",
        userId,
        e.getMessage(),
        e
      );
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }
}
