package com.gearfitness.gear_api.controller;

import com.gearfitness.gear_api.dto.DaySummaryDTO;
import com.gearfitness.gear_api.dto.FoodItemDTO;
import com.gearfitness.gear_api.dto.LogEntryDTO;
import com.gearfitness.gear_api.dto.LogFoodRequest;
import com.gearfitness.gear_api.dto.NutritionGoalDTO;
import com.gearfitness.gear_api.dto.UpdateGoalRequest;
import com.gearfitness.gear_api.security.JwtService;
import com.gearfitness.gear_api.service.NutritionService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/nutrition")
@RequiredArgsConstructor
public class NutritionController {

  private final NutritionService nutritionService;
  private final JwtService jwtService;

  /**
   * Search the seeded USDA food database. A blank/absent query returns the
   * default browse list (used by the Add Food screen before the user types).
   */
  @GetMapping("/foods/search")
  public ResponseEntity<List<FoodItemDTO>> searchFoods(
    @RequestParam(value = "q", required = false, defaultValue = "") String query,
    @RequestParam(defaultValue = "0") int page,
    @RequestHeader("Authorization") String authHeader
  ) {
    try {
      jwtService.extractUserId(authHeader.substring(7));
      return ResponseEntity.ok(nutritionService.searchFoods(query, page));
    } catch (Exception e) {
      e.printStackTrace();
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }

  /** Goal, consumed totals, and logged entries for a given day. */
  @GetMapping("/day")
  public ResponseEntity<DaySummaryDTO> getDay(
    @RequestParam(required = false) String date,
    @RequestHeader("Authorization") String authHeader
  ) {
    try {
      UUID userId = jwtService.extractUserId(authHeader.substring(7));
      return ResponseEntity.ok(nutritionService.getDay(userId, date));
    } catch (IllegalArgumentException e) {
      return ResponseEntity.badRequest().build();
    } catch (Exception e) {
      e.printStackTrace();
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }

  /** Log a food (seeded reference or quick-add). */
  @PostMapping("/log")
  public ResponseEntity<LogEntryDTO> logFood(
    @RequestBody LogFoodRequest req,
    @RequestHeader("Authorization") String authHeader
  ) {
    try {
      UUID userId = jwtService.extractUserId(authHeader.substring(7));
      return ResponseEntity.status(HttpStatus.CREATED).body(
        nutritionService.logFood(userId, req)
      );
    } catch (IllegalArgumentException e) {
      return ResponseEntity.badRequest().build();
    } catch (Exception e) {
      e.printStackTrace();
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }

  @DeleteMapping("/log/{entryId}")
  public ResponseEntity<Void> deleteEntry(
    @PathVariable UUID entryId,
    @RequestHeader("Authorization") String authHeader
  ) {
    try {
      UUID userId = jwtService.extractUserId(authHeader.substring(7));
      nutritionService.deleteEntry(userId, entryId);
      return ResponseEntity.noContent().build();
    } catch (IllegalArgumentException e) {
      return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
    } catch (Exception e) {
      e.printStackTrace();
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }

  @GetMapping("/goal")
  public ResponseEntity<NutritionGoalDTO> getGoal(
    @RequestHeader("Authorization") String authHeader
  ) {
    try {
      UUID userId = jwtService.extractUserId(authHeader.substring(7));
      return ResponseEntity.ok(nutritionService.getGoal(userId));
    } catch (Exception e) {
      e.printStackTrace();
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }

  /** Manually override the daily targets. */
  @PutMapping("/goal")
  public ResponseEntity<NutritionGoalDTO> updateGoal(
    @RequestBody UpdateGoalRequest req,
    @RequestHeader("Authorization") String authHeader
  ) {
    try {
      UUID userId = jwtService.extractUserId(authHeader.substring(7));
      return ResponseEntity.ok(nutritionService.updateGoal(userId, req));
    } catch (IllegalArgumentException e) {
      return ResponseEntity.badRequest().build();
    } catch (Exception e) {
      e.printStackTrace();
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }

  /** Recompute the daily targets from the user's profile (clears custom flag). */
  @PostMapping("/goal/recalculate")
  public ResponseEntity<NutritionGoalDTO> recalculateGoal(
    @RequestHeader("Authorization") String authHeader
  ) {
    try {
      UUID userId = jwtService.extractUserId(authHeader.substring(7));
      return ResponseEntity.ok(nutritionService.recalculateGoal(userId));
    } catch (Exception e) {
      e.printStackTrace();
      return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
    }
  }
}
