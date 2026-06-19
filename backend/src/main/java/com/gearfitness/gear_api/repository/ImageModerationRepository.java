package com.gearfitness.gear_api.repository;

import com.gearfitness.gear_api.entity.ImageModeration;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ImageModerationRepository
  extends JpaRepository<ImageModeration, UUID> {
  /** The review queue: oldest first so reviewers work through a backlog. */
  List<ImageModeration> findByStatusInOrderByCreatedAtAsc(
    List<ImageModeration.Status> statuses
  );

  /**
   * Clear moderation records for a post (e.g. when the post is being deleted).
   * Bulk native delete so it runs immediately — must hit the DB before the
   * post row is deleted (fk_imgmod_post has no ON DELETE CASCADE).
   */
  @Modifying
  @Query(
    value = "DELETE FROM image_moderation WHERE post_id = :postId",
    nativeQuery = true
  )
  void deleteByPost_PostId(@Param("postId") UUID postId);
}
