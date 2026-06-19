package com.gearfitness.gear_api.repository;

import com.gearfitness.gear_api.entity.Report;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ReportRepository extends JpaRepository<Report, UUID> {
  boolean existsByReporter_UserIdAndPost_PostId(UUID reporterId, UUID postId);

  /**
   * Clear all reports for a post (e.g. when the post is being deleted). Bulk
   * native delete so it runs immediately — must hit the DB before the post row
   * is deleted (fk_report_post has no ON DELETE CASCADE).
   */
  @Modifying
  @Query(value = "DELETE FROM report WHERE post_id = :postId", nativeQuery = true)
  void deleteByPost_PostId(@Param("postId") UUID postId);

  /** Distinct users with a still-pending report against the given post. */
  @Query(
    """
    SELECT COUNT(DISTINCT r.reporter.userId) FROM Report r
    WHERE r.post.postId = :postId AND r.status = 'PENDING'
    """
  )
  long countDistinctPendingReporters(@Param("postId") UUID postId);
}
