package com.gearfitness.gear_api.repository;

import com.gearfitness.gear_api.entity.PostComment;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface PostCommentRepository
  extends JpaRepository<PostComment, UUID>
{
  @Query(
    """
    SELECT pc.post.postId, COUNT(pc)
    FROM PostComment pc
    WHERE pc.post.postId IN :postIds
    GROUP BY pc.post.postId
    """
  )
  List<Object[]> countByPostIdsRaw(@Param("postIds") List<UUID> postIds);

  Page<PostComment> findByPost_PostId(UUID postId, Pageable pageable);

  @Query(
    """
    SELECT c FROM PostComment c
    WHERE c.post.postId = :postId
    AND NOT EXISTS (
        SELECT b FROM Follow b WHERE
        (b.follower.userId = :viewingUserId AND b.followee.userId = c.user.userId AND b.status = 'BLOCKED')
        OR (b.follower.userId = c.user.userId AND b.followee.userId = :viewingUserId AND b.status = 'BLOCKED')
    )
    ORDER BY c.createdAt DESC
    """
  )
  Page<PostComment> findVisibleComments(
    @Param("postId") UUID postId,
    @Param("viewingUserId") UUID viewingUserId,
    Pageable pageable
  );

  long countByPost_PostId(UUID postId);

  /**
   * Fetch a comment ignoring the entity-level @SQLRestriction, so moderation
   * actions (report, delete) can resolve a comment that is already hidden.
   */
  @Query(
    value = "SELECT * FROM post_comment WHERE comment_id = :id",
    nativeQuery = true
  )
  Optional<PostComment> findByIdIncludingHidden(@Param("id") UUID id);

  default Map<UUID, Long> countByPostIds(List<UUID> postIds) {
    if (postIds == null || postIds.isEmpty()) {
      return Map.of();
    }
    return countByPostIdsRaw(postIds)
      .stream()
      .collect(Collectors.toMap(row -> (UUID) row[0], row -> (Long) row[1]));
  }
}
