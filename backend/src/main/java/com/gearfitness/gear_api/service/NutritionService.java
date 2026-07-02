package com.gearfitness.gear_api.service;

import com.gearfitness.gear_api.dto.DaySummaryDTO;
import com.gearfitness.gear_api.dto.FoodItemDTO;
import com.gearfitness.gear_api.dto.LogEntryDTO;
import com.gearfitness.gear_api.dto.LogFoodRequest;
import com.gearfitness.gear_api.dto.NutritionGoalDTO;
import com.gearfitness.gear_api.dto.UpdateGoalRequest;
import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.entity.FoodItem;
import com.gearfitness.gear_api.entity.FoodLogEntry;
import com.gearfitness.gear_api.entity.NutritionGoal;
import com.gearfitness.gear_api.repository.AppUserRepository;
import com.gearfitness.gear_api.repository.FoodItemRepository;
import com.gearfitness.gear_api.repository.FoodLogEntryRepository;
import com.gearfitness.gear_api.repository.NutritionGoalRepository;
import jakarta.transaction.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class NutritionService {

  private static final int DEFAULT_PAGE_SIZE = 25;

  private final FoodItemRepository foodItemRepository;
  private final FoodLogEntryRepository foodLogEntryRepository;
  private final NutritionGoalRepository nutritionGoalRepository;
  private final AppUserRepository appUserRepository;

  // ---------------------------------------------------------------- search

  public List<FoodItemDTO> searchFoods(String query, int page) {
    int offset = Math.max(page, 0) * DEFAULT_PAGE_SIZE;
    // A blank query returns the default browse list rather than nothing, so the
    // Add Food screen's pre-search list comes from this same table — there is no
    // second food source.
    List<FoodItem> items = (query == null || query.isBlank())
      ? foodItemRepository.browse(DEFAULT_PAGE_SIZE, offset)
      : foodItemRepository.search(query.trim(), DEFAULT_PAGE_SIZE, offset);
    return items.stream().map(FoodItemDTO::from).collect(Collectors.toList());
  }

  /**
   * The user's own foods (recent + frequent) suggested by the Add Food screen
   * before the user types. Returns an empty list for users with no logging
   * history — the client then prompts them to start logging rather than showing
   * a generic list, so these stay genuine suggestions.
   */
  public List<FoodItemDTO> getUserFoods(UUID userId) {
    return foodItemRepository
      .findUserFoods(userId, DEFAULT_PAGE_SIZE)
      .stream()
      .map(FoodItemDTO::from)
      .collect(Collectors.toList());
  }

  // ------------------------------------------------------------------- day

  @Transactional
  public DaySummaryDTO getDay(UUID userId, String dateStr) {
    LocalDate date = (dateStr != null && !dateStr.isBlank())
      ? LocalDate.parse(dateStr)
      : LocalDate.now();

    List<FoodLogEntry> entries =
      foodLogEntryRepository.findByUser_UserIdAndLogDateOrderByCreatedAtAsc(
        userId,
        date
      );

    DaySummaryDTO.Totals totals = new DaySummaryDTO.Totals();
    for (FoodLogEntry e : entries) {
      totals.setCalories(totals.getCalories() + toDouble(e.getCalories()));
      totals.setProteinG(totals.getProteinG() + toDouble(e.getProteinG()));
      totals.setCarbsG(totals.getCarbsG() + toDouble(e.getCarbsG()));
      totals.setFatG(totals.getFatG() + toDouble(e.getFatG()));
    }

    return new DaySummaryDTO(
      date.toString(),
      NutritionGoalDTO.from(getOrCreateGoalEntity(userId)),
      totals,
      entries.stream().map(LogEntryDTO::from).collect(Collectors.toList())
    );
  }

  // ----------------------------------------------------------------- logging

  @Transactional
  public LogEntryDTO logFood(UUID userId, LogFoodRequest req) {
    AppUser user = appUserRepository
      .findById(userId)
      .orElseThrow(() -> new IllegalArgumentException("User not found"));

    LocalDate date = (req.getDate() != null && !req.getDate().isBlank())
      ? LocalDate.parse(req.getDate())
      : LocalDate.now();

    FoodLogEntry.ServingUnit unit =
      req.getUnit() == null
        ? FoodLogEntry.ServingUnit.SERVING
        : FoodLogEntry.ServingUnit.valueOf(req.getUnit().toUpperCase());
    BigDecimal quantity =
      req.getQuantity() == null
        ? BigDecimal.ONE
        : BigDecimal.valueOf(req.getQuantity());

    FoodLogEntry.FoodLogEntryBuilder entry = FoodLogEntry.builder()
      .user(user)
      .category(req.getCategory())
      .logDate(date)
      .quantity(quantity)
      .unit(unit)
      .sourceType(req.getSourceType())
      .sourceUrl(req.getSourceUrl());

    if (req.getFoodId() != null) {
      FoodItem food = foodItemRepository
        .findById(req.getFoodId())
        .orElseThrow(() -> new IllegalArgumentException("Food not found"));

      // Nutrients are stored per 100 g. Resolve how many grams were consumed,
      // then scale. A SERVING uses the food's serving size (defaulting to 100 g
      // when the dataset has none).
      BigDecimal grams =
        unit == FoodLogEntry.ServingUnit.GRAM
          ? quantity
          : quantity.multiply(
              food.getServingSize() == null
                ? BigDecimal.valueOf(100)
                : food.getServingSize()
            );
      BigDecimal factor = grams.divide(
        BigDecimal.valueOf(100),
        6,
        RoundingMode.HALF_UP
      );

      entry
        .food(food)
        .description(food.getDescription())
        .calories(scale(food.getCalories(), factor))
        .proteinG(scale(food.getProteinG(), factor))
        .carbsG(scale(food.getCarbsG(), factor))
        .fatG(scale(food.getFatG(), factor));
    } else {
      // Quick-add: the provided macros are the totals for this entry.
      entry
        .description(
          req.getDescription() == null ? "Quick add" : req.getDescription()
        )
        .calories(nullableBd(req.getCalories()))
        .proteinG(nullableBd(req.getProteinG()))
        .carbsG(nullableBd(req.getCarbsG()))
        .fatG(nullableBd(req.getFatG()));
    }

    return LogEntryDTO.from(foodLogEntryRepository.save(entry.build()));
  }

  @Transactional
  public void deleteEntry(UUID userId, UUID entryId) {
    FoodLogEntry entry = foodLogEntryRepository
      .findById(entryId)
      .orElseThrow(() -> new IllegalArgumentException("Entry not found"));
    if (!entry.getUser().getUserId().equals(userId)) {
      throw new IllegalArgumentException("Unauthorized access");
    }
    foodLogEntryRepository.delete(entry);
  }

  // ------------------------------------------------------------------- goals

  @Transactional
  public NutritionGoalDTO getGoal(UUID userId) {
    return NutritionGoalDTO.from(getOrCreateGoalEntity(userId));
  }

  @Transactional
  public NutritionGoalDTO updateGoal(UUID userId, UpdateGoalRequest req) {
    AppUser user = appUserRepository
      .findById(userId)
      .orElseThrow(() -> new IllegalArgumentException("User not found"));

    NutritionGoal goal = nutritionGoalRepository
      .findByUser_UserId(userId)
      .orElseGet(() -> NutritionGoal.builder().user(user).build());

    goal.setCalorieGoal(req.getCalorieGoal());
    goal.setProteinG(req.getProteinG());
    goal.setCarbsG(req.getCarbsG());
    goal.setFatG(req.getFatG());
    goal.setIsCustom(true);
    goal.setUpdatedAt(LocalDateTime.now());

    return NutritionGoalDTO.from(nutritionGoalRepository.save(goal));
  }

  @Transactional
  public NutritionGoalDTO recalculateGoal(UUID userId) {
    AppUser user = appUserRepository
      .findById(userId)
      .orElseThrow(() -> new IllegalArgumentException("User not found"));

    NutritionGoal goal = nutritionGoalRepository
      .findByUser_UserId(userId)
      .orElseGet(() -> NutritionGoal.builder().user(user).build());

    applyAutoGoal(goal, user);
    goal.setIsCustom(false);
    goal.setUpdatedAt(LocalDateTime.now());

    return NutritionGoalDTO.from(nutritionGoalRepository.save(goal));
  }

  /**
   * Returns the user's goal, creating an auto-calculated one (never marked
   * custom) the first time it's needed.
   */
  private NutritionGoal getOrCreateGoalEntity(UUID userId) {
    return nutritionGoalRepository
      .findByUser_UserId(userId)
      .orElseGet(() -> {
        AppUser user = appUserRepository
          .findById(userId)
          .orElseThrow(() -> new IllegalArgumentException("User not found"));
        NutritionGoal goal = NutritionGoal.builder()
          .user(user)
          .isCustom(false)
          .updatedAt(LocalDateTime.now())
          .build();
        applyAutoGoal(goal, user);
        return nutritionGoalRepository.save(goal);
      });
  }

  /**
   * Mifflin-St Jeor BMR x a lightly-active factor, with a protein-forward macro
   * split. Falls back to a sensible 2000 kcal default when the profile is
   * missing the height / weight / age needed for the formula.
   */
  void applyAutoGoal(NutritionGoal goal, AppUser user) {
    Integer weightLbs = user.getWeightLbs();
    Integer heightInches = user.getHeightInches();
    Integer age = user.getAge();

    int calories;
    int proteinG;
    int fatG;
    int carbsG;

    if (weightLbs == null || heightInches == null || age == null) {
      calories = 2000;
      proteinG = 150;
      fatG = 67;
      carbsG = 200;
    } else {
      double weightKg = weightLbs / 2.2046;
      double heightCm = heightInches * 2.54;
      double sexOffset = sexOffset(user.getGender());
      double bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + sexOffset;
      double tdee = bmr * 1.375; // lightly active

      calories = (int) Math.round(tdee);
      proteinG = (int) Math.round(weightLbs * 1.0); // ~1 g per lb
      fatG = (int) Math.round((calories * 0.25) / 9.0); // 25% of kcal from fat
      int remaining = calories - (proteinG * 4) - (fatG * 9);
      carbsG = (int) Math.round(Math.max(remaining, 0) / 4.0);
    }

    goal.setCalorieGoal(calories);
    goal.setProteinG(proteinG);
    goal.setFatG(fatG);
    goal.setCarbsG(carbsG);
  }

  private double sexOffset(String gender) {
    if (gender == null) return -78; // neutral midpoint of +5 / -161
    String g = gender.trim().toLowerCase();
    if (g.startsWith("m")) return 5;
    if (g.startsWith("f")) return -161;
    return -78;
  }

  // ------------------------------------------------------------------ helpers

  private static double toDouble(BigDecimal v) {
    return v == null ? 0 : v.doubleValue();
  }

  private static BigDecimal nullableBd(Double v) {
    return v == null ? null : BigDecimal.valueOf(v);
  }

  private static BigDecimal scale(BigDecimal per100g, BigDecimal factor) {
    if (per100g == null) return null;
    return per100g.multiply(factor).setScale(2, RoundingMode.HALF_UP);
  }
}
