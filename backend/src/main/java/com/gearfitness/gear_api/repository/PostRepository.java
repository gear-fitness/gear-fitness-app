package com.gearfitness.gear_api.repository;

import com.gearfitness.gear_api.entity.Post;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface PostRepository extends JpaRepository<Post, UUID> {

  /**
   * Social feed: posts from followed users, filtered by visibility and mutual-
   * follow requirement for FRIENDS posts. Blocked users' posts are hidden in
   * both directions.
   */
  @Query(
    """
    SELECT p FROM Post p
    WHERE p.user.userId IN (
        SELECT f.followee.userId FROM Follow f
        WHERE f.follower.userId = :userId AND f.status = 'ACCEPTED'
    )
    AND (
        p.visibility = 'PUBLIC'
        OR (
            p.visibility = 'FRIENDS'
            AND EXISTS (
                SELECT f2 FROM Follow f2
                WHERE f2.follower.userId = p.user.userId
                  AND f2.followee.userId = :userId
                  AND f2.status = 'ACCEPTED'
            )
        )
    )
    AND NOT EXISTS (
        SELECT b FROM Follow b WHERE
        (b.follower.userId = :userId AND b.followee.userId = p.user.userId AND b.status = 'BLOCKED')
        OR (b.follower.userId = p.user.userId AND b.followee.userId = :userId AND b.status = 'BLOCKED')
    )
    AND p.moderationStatus = 'VISIBLE'
    ORDER BY p.createdAt DESC
    """
  )
  Page<Post> findFollowedUsersPosts(
    @Param("userId") UUID userId,
    Pageable pageable
  );

  /**
   * Posts for a specific user's profile page, filtered by what the viewer is
   * allowed to see. Owner always sees all their own posts. Otherwise:
   * - PUBLIC posts are visible to everyone (no block).
   * - FRIENDS posts require mutual ACCEPTED follows.
   * - PRIVATE posts are visible to owner only.
   * Blocked users see nothing.
   */
  @Query(
    """
    SELECT p FROM Post p
    WHERE p.user.userId = :userId
    AND (
        p.user.userId = :viewingUserId
        OR p.visibility = 'PUBLIC'
        OR (
            p.visibility = 'FRIENDS'
            AND EXISTS (
                SELECT f FROM Follow f
                WHERE f.follower.userId = :viewingUserId
                  AND f.followee.userId = :userId
                  AND f.status = 'ACCEPTED'
            )
            AND EXISTS (
                SELECT f2 FROM Follow f2
                WHERE f2.follower.userId = :userId
                  AND f2.followee.userId = :viewingUserId
                  AND f2.status = 'ACCEPTED'
            )
        )
    )
    AND NOT EXISTS (
        SELECT b FROM Follow b WHERE
        (b.follower.userId = :viewingUserId AND b.followee.userId = :userId AND b.status = 'BLOCKED')
        OR (b.follower.userId = :userId AND b.followee.userId = :viewingUserId AND b.status = 'BLOCKED')
    )
    AND p.moderationStatus = 'VISIBLE'
    ORDER BY p.createdAt DESC
    """
  )
  Page<Post> findPostsByUser(
    @Param("userId") UUID userId,
    @Param("viewingUserId") UUID viewingUserId,
    Pageable pageable
  );

  Optional<Post> findByWorkout_WorkoutId(UUID workoutId);
}
