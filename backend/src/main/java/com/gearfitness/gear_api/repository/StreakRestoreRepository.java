package com.gearfitness.gear_api.repository;

import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.entity.StreakRestore;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface StreakRestoreRepository
  extends JpaRepository<StreakRestore, UUID> {
  long countByUserAndUsedAtBetween(
    AppUser user,
    LocalDateTime start,
    LocalDateTime end
  );

  @Query(
    "SELECT sr.restoredDate FROM StreakRestore sr WHERE sr.user = :user AND sr.restoredDate BETWEEN :start AND :end"
  )
  List<LocalDate> findRestoredDatesByUserAndDateBetween(
    @Param("user") AppUser user,
    @Param("start") LocalDate start,
    @Param("end") LocalDate end
  );
}
