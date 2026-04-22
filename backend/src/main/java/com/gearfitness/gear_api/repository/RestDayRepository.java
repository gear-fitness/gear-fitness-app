package com.gearfitness.gear_api.repository;

import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.entity.RestDay;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface RestDayRepository extends JpaRepository<RestDay, UUID> {
  boolean existsByUserAndDate(AppUser user, LocalDate date);

  @Query(
    "SELECT rd.date FROM RestDay rd WHERE rd.user = :user AND rd.date BETWEEN :start AND :end"
  )
  List<LocalDate> findDatesByUserAndDateBetween(
    @Param("user") AppUser user,
    @Param("start") LocalDate start,
    @Param("end") LocalDate end
  );
}
