package com.gearfitness.gear_api.service;

import com.gearfitness.gear_api.dto.DaySummaryDTO;
import com.gearfitness.gear_api.dto.FoodItemDTO;
import com.gearfitness.gear_api.dto.LogEntryDTO;
import com.gearfitness.gear_api.dto.LogFoodRequest;
import com.gearfitness.gear_api.dto.MealCategoryDTO;
import com.gearfitness.gear_api.dto.CreateCategoryRequest;
import com.gearfitness.gear_api.dto.NutritionGoalDTO;
import com.gearfitness.gear_api.dto.UpdateGoalRequest;
import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.entity.FoodItem;
import com.gearfitness.gear_api.entity.FoodLogEntry;
import com.gearfitness.gear_api.entity.MealCategory;
import com.gearfitness.gear_api.entity.NutritionGoal;
import com.gearfitness.gear_api.repository.AppUserRepository;
import com.gearfitness.gear_api.repository.FoodItemRepository;
import com.gearfitness.gear_api.repository.FoodLogEntryRepository;
import com.gearfitness.gear_api.repository.MealCategoryRepository;
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
  private static final List<String> DEFAULT_CATEGORY_NAMES =
    List.of("Breakfast", "Lunch", "Dinner");

  private final FoodItemRepository foodItemRepository;
  private final FoodLogEntryRepository foodLogEntryRepository;
  private final NutritionGoalRepository nutritionGoalRepository;
  private final MealCategoryRepository mealCategoryRepository;
  private final AppUserRepository appUserRepository;

  // ---------------------------------------------------------------- search

  public List<FoodItemDTO> searchFoods(String query, int page) {
    if (query == null || query.isBlank()) {
      return List.of();
    }
    int offset = Math.max(page, 0) * DEFAULT_PAGE_SIZE;
    return foodItemRepository
      .search(query.trim(), DEFAULT_PAGE_SIZE, offset)
      .stream()
      .map(FoodItemDTO::from)
      .collect(Collectors.toList());
  }

  // --------------------------------------------------------------- categories

  @Transactional
  public List<MealCategoryDTO> getCategories(UUID userId) {
    return getOrCreateDefaultCategories(userId)
      .stream()
      .map(MealCategoryDTO::from)
      .collect(Collectors.toList());
  }

  @Transactional
  public MealCategoryDTO createCategory(UUID userId, CreateCategoryRequest req) {
    if (req.getName() == null || req.getName().isBlank()) {
      throw new IllegalArgumentException("Category name must not be blank");
    }
    AppUser user = appUserRepository
      .findById(userId)
      .orElseThrow(() -> new IllegalArgumentException("User not found"));

    String name = req.getName().trim();
    if (mealCategoryRepository.findByUser_UserIdAndName(userId, name).isPresent()) {
      throw new IllegalArgumentException("Category already exists: " + name);
    }

    int nextOrder = mealCategoryRepository.findMaxDisplayOrderByUserId(userId) + 1;
    MealCategory category = MealCategory.builder()
      .user(user)
      .name(name)
      .displayOrder(nextOrder)
      .build();
    return MealCategoryDTO.from(mealCategoryRepository.save(category));
  }

  @Transactional
  public void deleteCategory(UUID userId, UUID categoryId) {
    MealCategory category = mealCategoryRepository
      .findById(categoryId)
      .orElseThrow(() -> new IllegalArgumentException("Category not found"));
    if (!category.getUser().getUserId().equals(userId)) {
      throw new IllegalArgumentException("Unauthorized");
    }
    // ON DELETE CASCADE in the schema removes associated food_log_entry rows.
    mealCategoryRepository.delete(category);
  }

  // ------------------------------------------------------------------- day

  @Transactional
  public DaySummaryDTO getDay(UUID userId, String dateStr) {
    LocalDate date = (dateStr != null && !dateStr.isBlank())
      ? LocalDate.parse(dateStr)
      : LocalDate.now();

    List<MealCategory> categories = getOrCreateDefaultCategories(userId);

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
      categories.stream().map(MealCategoryDTO::from).collect(Collectors.toList()),
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

    MealCategory category = null;
    if (req.getCategoryId() != null) {
      category = mealCategoryRepository
        .findById(req.getCategoryId())
        .orElseThrow(() -> new IllegalArgumentException("Category not found"));
      if (!category.getUser().getUserId().equals(userId)) {
        throw new IllegalArgumentException("Unauthorized");
      }
    }

    FoodLogEntry.ServingUnit unit = req.getUnit() == null
      ? FoodLogEntry.ServingUnit.SERVING
      : FoodLogEntry.ServingUnit.valueOf(req.getUnit().toUpperCase());
    BigDecimal quantity = req.getQuantity() == null
      ? BigDecimal.ONE
      : BigDecimal.valueOf(req.getQuantity());

    FoodLogEntry.FoodLogEntryBuilder entry = FoodLogEntry.builder()
      .user(user)
      .category(category)
      .logDate(date)
      .quantity(quantity)
      .unit(unit);

    if (req.getFoodId() != null) {
      FoodItem food = foodItemRepository
        .findById(req.getFoodId())
        .orElseThrow(() -> new IllegalArgumentException("Food not found"));

      // Nutrients are stored per 100 g. Resolve how many grams were consumed,
      // then scale. A SERVING uses the food's serving size (defaulting to 100 g
      // when the dataset has none).
      BigDecimal grams = unit == FoodLogEntry.ServingUnit.GRAM
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

  // ------------------------------------------------------------------ private

  private List<MealCategory> getOrCreateDefaultCategories(UUID userId) {
    List<MealCategory> existing =
      mealCategoryRepository.findByUser_UserIdOrderByDisplayOrderAsc(userId);
    if (!existing.isEmpty()) return existing;

    AppUser user = appUserRepository
      .findById(userId)
      .orElseThrow(() -> new IllegalArgumentException("User not found"));

    List<MealCategory> defaults = new java.util.ArrayList<>();
    for (int i = 0; i < DEFAULT_CATEGORY_NAMES.size(); i++) {
      defaults.add(
        MealCategory.builder()
          .user(user)
          .name(DEFAULT_CATEGORY_NAMES.get(i))
          .displayOrder(i)
          .build()
      );
    }
    return mealCategoryRepository.saveAll(defaults);
  }

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
      double tdee = bmr * 1.375;

      calories = (int) Math.round(tdee);
      proteinG = (int) Math.round(weightLbs * 1.0);
      fatG = (int) Math.round((calories * 0.25) / 9.0);
      int remaining = calories - (proteinG * 4) - (fatG * 9);
      carbsG = (int) Math.round(Math.max(remaining, 0) / 4.0);
    }

    goal.setCalorieGoal(calories);
    goal.setProteinG(proteinG);
    goal.setFatG(fatG);
    goal.setCarbsG(carbsG);
  }

  private double sexOffset(String gender) {
    if (gender == null) return -78;
    String g = gender.trim().toLowerCase();
    if (g.startsWith("m")) return 5;
    if (g.startsWith("f")) return -161;
    return -78;
  }

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
