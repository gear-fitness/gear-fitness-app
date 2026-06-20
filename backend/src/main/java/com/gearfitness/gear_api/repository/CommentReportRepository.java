package com.gearfitness.gear_api.repository;

import com.gearfitness.gear_api.entity.CommentReport;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface CommentReportRepository
  extends JpaRepository<CommentReport, UUID>
{
  boolean existsByReporter_UserIdAndComment_CommentId(
    UUID reporterId,
    UUID commentId
  );

  /** Distinct users with a still-pending report against the given comment. */
  @Query(
    """
    SELECT COUNT(DISTINCT r.reporter.userId) FROM CommentReport r
    WHERE r.comment.commentId = :commentId AND r.status = 'PENDING'
    """
  )
  long countDistinctPendingReporters(@Param("commentId") UUID commentId);
}
