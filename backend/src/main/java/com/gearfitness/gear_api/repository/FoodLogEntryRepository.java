package com.gearfitness.gear_api.repository;

import com.gearfitness.gear_api.entity.FoodLogEntry;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface FoodLogEntryRepository
  extends JpaRepository<FoodLogEntry, UUID>
{
  List<FoodLogEntry> findByUser_UserIdAndLogDateOrderByCreatedAtAsc(
    UUID userId,
    LocalDate logDate
  );

  /** Days in [start, end] on which the user logged at least one food. */
  @Query(
    "select distinct e.logDate from FoodLogEntry e " +
    "where e.user.userId = :userId and e.logDate between :start and :end"
  )
  List<LocalDate> findDistinctLogDates(
    @Param("userId") UUID userId,
    @Param("start") LocalDate start,
    @Param("end") LocalDate end
  );
}
