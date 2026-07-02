package com.gearfitness.gear_api.repository;

import com.gearfitness.gear_api.entity.FoodLogEntry;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FoodLogEntryRepository
  extends JpaRepository<FoodLogEntry, UUID>
{
  List<FoodLogEntry> findByUser_UserIdAndLogDateOrderByCreatedAtAsc(
    UUID userId,
    LocalDate logDate
  );
}
