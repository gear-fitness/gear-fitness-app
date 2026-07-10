package com.gearfitness.gear_api.repository;

import com.gearfitness.gear_api.entity.NutritionJournalNote;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface NutritionJournalNoteRepository
  extends JpaRepository<NutritionJournalNote, UUID>
{
  Optional<NutritionJournalNote> findByUser_UserIdAndLogDate(
    UUID userId,
    LocalDate logDate
  );
}
