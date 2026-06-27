package com.gearfitness.gear_api.repository;

import com.gearfitness.gear_api.entity.CardioActivity;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CardioActivityRepository
  extends JpaRepository<CardioActivity, UUID> {}
