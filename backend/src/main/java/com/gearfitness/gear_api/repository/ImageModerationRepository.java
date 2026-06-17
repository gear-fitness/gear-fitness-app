package com.gearfitness.gear_api.repository;

import com.gearfitness.gear_api.entity.ImageModeration;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ImageModerationRepository
  extends JpaRepository<ImageModeration, UUID> {
  /** The review queue: oldest first so reviewers work through a backlog. */
  List<ImageModeration> findByStatusInOrderByCreatedAtAsc(
    List<ImageModeration.Status> statuses
  );
}
