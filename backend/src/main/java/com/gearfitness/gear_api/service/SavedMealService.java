package com.gearfitness.gear_api.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gearfitness.gear_api.dto.MealItemDTO;
import com.gearfitness.gear_api.dto.SaveMealRequest;
import com.gearfitness.gear_api.dto.SavedMealDTO;
import com.gearfitness.gear_api.entity.SavedMeal;
import com.gearfitness.gear_api.repository.SavedMealRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/** Create and list a user's saved meals (see {@link SavedMeal}). */
@Service
@Slf4j
@RequiredArgsConstructor
public class SavedMealService {

  private final SavedMealRepository repository;
  private final ObjectMapper mapper = new ObjectMapper();

  public SavedMealDTO save(UUID userId, SaveMealRequest req) {
    String name = req.getName() == null ? "" : req.getName().trim();
    List<MealItemDTO> items = req.getItems() == null ? List.of() : req.getItems();
    if (name.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "MEAL_NAME_REQUIRED");
    }
    if (items.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "MEAL_ITEMS_REQUIRED");
    }

    SavedMeal meal = SavedMeal.builder()
      .userId(userId)
      .name(name)
      .itemsJson(serialize(items))
      .createdAt(LocalDateTime.now())
      .build();
    meal = repository.save(meal);
    return new SavedMealDTO(meal.getMealId(), meal.getName(), items);
  }

  public List<SavedMealDTO> list(UUID userId) {
    return repository
      .findByUserIdOrderByCreatedAtDesc(userId)
      .stream()
      .map(m ->
        new SavedMealDTO(m.getMealId(), m.getName(), deserialize(m.getItemsJson()))
      )
      .toList();
  }

  private String serialize(List<MealItemDTO> items) {
    try {
      return mapper.writeValueAsString(items);
    } catch (Exception e) {
      throw new IllegalStateException("Failed to serialize meal items", e);
    }
  }

  private List<MealItemDTO> deserialize(String json) {
    try {
      return mapper.readValue(json, new TypeReference<List<MealItemDTO>>() {});
    } catch (Exception e) {
      log.error("Failed to read saved meal items: {}", e.getMessage());
      return List.of();
    }
  }
}
