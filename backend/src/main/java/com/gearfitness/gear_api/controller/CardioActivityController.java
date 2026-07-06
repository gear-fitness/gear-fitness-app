package com.gearfitness.gear_api.controller;

import com.gearfitness.gear_api.dto.CardioActivityDTO;
import com.gearfitness.gear_api.entity.CardioActivity;
import com.gearfitness.gear_api.repository.CardioActivityRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cardio-activities")
@RequiredArgsConstructor
public class CardioActivityController {

  private final CardioActivityRepository cardioActivityRepo;

  @GetMapping
  public List<CardioActivityDTO> getAllCardioActivities() {
    return cardioActivityRepo.findAll().stream().map(this::toDTO).toList();
  }

  private CardioActivityDTO toDTO(CardioActivity ca) {
    return new CardioActivityDTO(
      ca.getCardioActivityId(),
      ca.getName(),
      ca.getDescription()
    );
  }
}
