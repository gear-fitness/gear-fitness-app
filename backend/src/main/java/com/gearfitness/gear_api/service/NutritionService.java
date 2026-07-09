package com.gearfitness.gear_api.service;

import com.gearfitness.gear_api.dto.CustomFoodRequest;
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

  public List<FoodItemDTO> searchFoods(UUID userId, String query, int page) {
    int offset = Math.max(page, 0) * DEFAULT_PAGE_SIZE;
    // A blank query returns the default browse list rather than nothing, so the
    // Add Food screen's pre-search list comes from this same table — there is no
    // second food source. A real query also matches the caller's own custom
    // foods (scoped by owner in the query itself).
    List<FoodItem> items = (query == null || query.isBlank())
      ? foodItemRepository.browse(DEFAULT_PAGE_SIZE, offset)
      : foodItemRepository.search(
          query.trim(),
          userId,
          DEFAULT_PAGE_SIZE,
          offset
        );
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

  // ---------------------------------------------------------- custom foods

  /** The user's custom foods ("saved meals"), newest first. */
  public List<FoodItemDTO> getCustomFoods(UUID userId) {
    return foodItemRepository
      .findByOwnerUserIdOrderByCreatedAtDesc(userId)
      .stream()
      .map(FoodItemDTO::from)
      .collect(Collectors.toList());
  }

  /**
   * Create a custom food. Nutrition arrives per serving; it's stored as
   * per-100g with servingSize = 100 so one SERVING resolves to exactly the
   * entered values through the standard scaling in {@link #logFood}.
   */
  @Transactional
  public FoodItemDTO createCustomFood(UUID userId, CustomFoodRequest req) {
    FoodItem food = FoodItem.builder().build();
    applyCustomFields(food, req);
    food.setOwnerUserId(userId);
    food.setDataType("CUSTOM");
    food.setServingSize(BigDecimal.valueOf(100));
    food.setServingUnit("g");
    food.setHouseholdServing("1 serving");
    food.setCreatedAt(LocalDateTime.now());
    return FoodItemDTO.from(foodItemRepository.save(food));
  }

  @Transactional
  public FoodItemDTO updateCustomFood(
    UUID userId,
    UUID foodId,
    CustomFoodRequest req
  ) {
    FoodItem food = requireOwnedCustomFood(userId, foodId);
    applyCustomFields(food, req);
    return FoodItemDTO.from(foodItemRepository.save(food));
  }

  /**
   * Delete a custom food. Logged entries keep their macro snapshot and their
   * food_id FK is ON DELETE SET NULL, so history is unaffected.
   */
  @Transactional
  public void deleteCustomFood(UUID userId, UUID foodId) {
    foodItemRepository.delete(requireOwnedCustomFood(userId, foodId));
  }

  private FoodItem requireOwnedCustomFood(UUID userId, UUID foodId) {
    FoodItem food = foodItemRepository
      .findById(foodId)
      .orElseThrow(() -> new IllegalArgumentException("Food not found"));
    if (!userId.equals(food.getOwnerUserId())) {
      throw new IllegalArgumentException("Food not found");
    }
    return food;
  }

  private void applyCustomFields(FoodItem food, CustomFoodRequest req) {
    String description = req.getDescription() == null
      ? ""
      : req.getDescription().trim();
    if (description.isEmpty()) {
      throw new IllegalArgumentException("Description required");
    }
    if (req.getCalories() == null || req.getCalories() < 0) {
      throw new IllegalArgumentException("Calories required");
    }
    String nickname = req.getNickname() == null
      ? null
      : req.getNickname().trim();
    food.setDescription(description);
    food.setNickname(nickname == null || nickname.isEmpty() ? null : nickname);
    food.setCalories(BigDecimal.valueOf(req.getCalories()));
    food.setProteinG(nullableBd(req.getProteinG()));
    food.setCarbsG(nullableBd(req.getCarbsG()));
    food.setFatG(nullableBd(req.getFatG()));
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

  /**
   * ISO dates in [start, end] on which the user logged at least one food —
   * backs the calendar sheet's "days with entries" markers. The range is
   * required and capped by the caller-supplied bounds, so a client can't ask
   * for an unbounded scan.
   */
  @Transactional
  public List<String> getLoggedDates(
    UUID userId,
    String startStr,
    String endStr
  ) {
    LocalDate start = LocalDate.parse(startStr);
    LocalDate end = LocalDate.parse(endStr);
    if (end.isBefore(start)) {
      throw new IllegalArgumentException("end before start");
    }
    return foodLogEntryRepository
      .findDistinctLogDates(userId, start, end)
      .stream()
      .map(LocalDate::toString)
      .sorted()
      .collect(Collectors.toList());
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
    // Hand-tuning the targets counts as having done setup; don't show the
    // first-view calculator wizard afterward.
    goal.setSetupComplete(true);
    goal.setUpdatedAt(LocalDateTime.now());

    return NutritionGoalDTO.from(nutritionGoalRepository.save(goal));
  }

  /**
   * Recompute the daily targets from the user's profile. Optionally updates
   * the stored cut/bulk direction and pace first (both null-guarded), so the
   * setup wizard can save its choices and recalculate in one call. Always
   * marks setup complete: a bare recalculate is how the wizard's "skip"
   * accepts the auto defaults.
   */
  @Transactional
  public NutritionGoalDTO recalculateGoal(
    UUID userId,
    String goalType,
    String goalIntensity
  ) {
    AppUser user = appUserRepository
      .findById(userId)
      .orElseThrow(() -> new IllegalArgumentException("User not found"));

    NutritionGoal goal = nutritionGoalRepository
      .findByUser_UserId(userId)
      .orElseGet(() -> NutritionGoal.builder().user(user).build());

    if (goalType != null) {
      goal.setGoalType(validateChoice(goalType, "CUT", "MAINTAIN", "BULK"));
    }
    if (goalIntensity != null) {
      goal.setGoalIntensity(
        validateChoice(goalIntensity, "SLOW", "MODERATE", "AGGRESSIVE")
      );
    }

    applyAutoGoal(goal, user);
    goal.setIsCustom(false);
    goal.setSetupComplete(true);
    goal.setUpdatedAt(LocalDateTime.now());

    return NutritionGoalDTO.from(nutritionGoalRepository.save(goal));
  }

  private String validateChoice(String value, String... allowed) {
    String v = value.trim().toUpperCase();
    for (String a : allowed) {
      if (a.equals(v)) return v;
    }
    throw new IllegalArgumentException("Invalid value: " + value);
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
   * Mifflin-St Jeor BMR x the user's activity factor, shifted by their cut /
   * bulk choice, with a protein-forward macro split. Falls back to a sensible
   * 2000 kcal default when the profile is missing the height / weight / age
   * needed for the formula.
   *
   * The identical formula is mirrored client-side for the live preview in the
   * nutrition setup wizard (frontend goalFormula.ts); keep the two in sync.
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
      double tdee = bmr * activityFactor(user.getActivityLevel());

      // Cut/bulk shift the target off maintenance; never below a safe floor.
      calories = (int) Math.max(
        Math.round(tdee) + goalOffset(goal.getGoalType(), goal.getGoalIntensity()),
        1200
      );
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

  /**
   * Standard TDEE multipliers. "light" matches the pre-calculator behavior
   * (a hardcoded 1.375), so users who never set an activity level keep the
   * targets they already had.
   */
  private double activityFactor(String activityLevel) {
    if (activityLevel == null) return 1.375;
    return switch (activityLevel) {
      case "sedentary" -> 1.2;
      case "moderate" -> 1.55;
      case "very_active" -> 1.725;
      default -> 1.375; // "light" and anything unrecognized
    };
  }

  /**
   * Daily calorie shift off maintenance for the chosen direction and pace.
   * Deliberately asymmetric: an aggressive deficit is sustainable in a way an
   * equally large surplus is not (it mostly adds fat).
   */
  private int goalOffset(String goalType, String goalIntensity) {
    if (goalType == null) return 0;
    String intensity = goalIntensity == null ? "MODERATE" : goalIntensity;
    return switch (goalType) {
      case "CUT" -> switch (intensity) {
        case "SLOW" -> -250;
        case "AGGRESSIVE" -> -750;
        default -> -500;
      };
      case "BULK" -> switch (intensity) {
        case "SLOW" -> 150;
        case "AGGRESSIVE" -> 500;
        default -> 300;
      };
      default -> 0; // MAINTAIN
    };
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
