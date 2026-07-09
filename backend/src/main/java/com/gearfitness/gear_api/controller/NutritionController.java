package com.gearfitness.gear_api.controller;

import com.gearfitness.gear_api.dto.AiEstimateResponse;
import com.gearfitness.gear_api.dto.AiLogRequest;
import com.gearfitness.gear_api.dto.AiLogResponse;
import com.gearfitness.gear_api.dto.CustomFoodRequest;
import com.gearfitness.gear_api.dto.DaySummaryDTO;
import com.gearfitness.gear_api.dto.FoodItemDTO;
import com.gearfitness.gear_api.dto.LogEntryDTO;
import com.gearfitness.gear_api.dto.LogFoodRequest;
import com.gearfitness.gear_api.dto.NutritionGoalDTO;
import com.gearfitness.gear_api.dto.RecalculateGoalRequest;
import com.gearfitness.gear_api.dto.UpdateGoalRequest;
import com.gearfitness.gear_api.security.JwtService;
import com.gearfitness.gear_api.service.AiNutritionService;
import com.gearfitness.gear_api.service.NutritionService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
    } catch (IllegalArgumentException | java.time.format.DateTimeParseException e) {
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
