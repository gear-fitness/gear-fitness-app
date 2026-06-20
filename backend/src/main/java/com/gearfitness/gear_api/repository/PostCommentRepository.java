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

  /** Top-level comments only (anonymous viewer path). */
  Page<PostComment> findByPost_PostIdAndParentCommentIsNull(
    UUID postId,
    Pageable pageable
  );

  /** Top-level comments only, block-aware (signed-in viewer path). */
  @Query(
    """
    SELECT c FROM PostComment c
    WHERE c.post.postId = :postId
    AND c.parentComment IS NULL
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

  /** Replies under a top-level comment (anonymous viewer path), oldest-first. */
  Page<PostComment> findByParentComment_CommentIdOrderByCreatedAtAsc(
    UUID parentCommentId,
    Pageable pageable
  );

  /** Replies under a top-level comment, block-aware, oldest-first. */
  @Query(
    """
    SELECT c FROM PostComment c
    WHERE c.parentComment.commentId = :parentCommentId
    AND NOT EXISTS (
        SELECT b FROM Follow b WHERE
        (b.follower.userId = :viewingUserId AND b.followee.userId = c.user.userId AND b.status = 'BLOCKED')
        OR (b.follower.userId = c.user.userId AND b.followee.userId = :viewingUserId AND b.status = 'BLOCKED')
    )
    ORDER BY c.createdAt ASC
    """
  )
  Page<PostComment> findVisibleReplies(
    @Param("parentCommentId") UUID parentCommentId,
    @Param("viewingUserId") UUID viewingUserId,
    Pageable pageable
  );

  /** Visible replies under a top-level comment (for delete/hide cascade). */
  List<PostComment> findByParentComment_CommentId(UUID parentCommentId);

  @Query(
    """
    SELECT pc.parentComment.commentId, COUNT(pc)
    FROM PostComment pc
    WHERE pc.parentComment.commentId IN :parentIds
    GROUP BY pc.parentComment.commentId
    """
  )
  List<Object[]> countByParentCommentIdsRaw(
    @Param("parentIds") List<UUID> parentIds
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

  /** Visible reply counts keyed by top-level parent comment id. */
  default Map<UUID, Long> countByParentCommentIds(List<UUID> parentIds) {
    if (parentIds == null || parentIds.isEmpty()) {
      return Map.of();
    }
    return countByParentCommentIdsRaw(parentIds)
      .stream()
      .collect(Collectors.toMap(row -> (UUID) row[0], row -> (Long) row[1]));
  }
}
