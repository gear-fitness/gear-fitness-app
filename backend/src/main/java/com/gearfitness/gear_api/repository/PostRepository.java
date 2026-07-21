package com.gearfitness.gear_api.repository;

import com.gearfitness.gear_api.entity.Post;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
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
    ORDER BY p.createdAt DESC
    """
  )
  Page<Post> findPostsByUser(
    @Param("userId") UUID userId,
    @Param("viewingUserId") UUID viewingUserId,
    Pageable pageable
  );

  /**
   * Discover feed: all PUBLIC posts from non-private accounts, so users can
   * find each other. Excludes posts from private accounts (a private account's
   * PUBLIC posts stay visible to its followers in the following feed, but are
   * never surfaced to strangers here) and any account blocked in either
   * direction relative to the viewer. The viewer's own public posts are
   * included. Newest first.
   */
  @Query(
    """
    SELECT p FROM Post p
    WHERE p.visibility = 'PUBLIC'
    AND p.user.isPrivate = false
    AND NOT EXISTS (
        SELECT b FROM Follow b WHERE
        (b.follower.userId = :userId AND b.followee.userId = p.user.userId AND b.status = 'BLOCKED')
        OR (b.follower.userId = p.user.userId AND b.followee.userId = :userId AND b.status = 'BLOCKED')
    )
    ORDER BY p.createdAt DESC
    """
  )
  Page<Post> findDiscoverPosts(@Param("userId") UUID userId, Pageable pageable);

  /**
   * Posts tagged at one gym, for the location page. Same audience rules as
   * the discover feed (PUBLIC posts from non-private accounts, minus blocks
   * in either direction) — a gym page is public surface area, so nothing a
   * stranger couldn't already see in discover may appear here.
   */
  @Query(
    """
    SELECT p FROM Post p
    WHERE p.workout.location.locationId = :locationId
    AND p.visibility = 'PUBLIC'
    AND p.user.isPrivate = false
    AND NOT EXISTS (
        SELECT b FROM Follow b WHERE
        (b.follower.userId = :userId AND b.followee.userId = p.user.userId AND b.status = 'BLOCKED')
        OR (b.follower.userId = p.user.userId AND b.followee.userId = :userId AND b.status = 'BLOCKED')
    )
    ORDER BY p.createdAt DESC
    """
  )
  Page<Post> findLocationPosts(
    @Param("locationId") UUID locationId,
    @Param("userId") UUID userId,
    Pageable pageable
  );

  /**
   * One person the viewer follows who has viewer-visible posts at a gym,
   * with the timestamp of their newest such post for ordering.
   */
  interface FriendAtLocation {
    UUID getUserId();
    String getUsername();
    String getDisplayName();
    String getProfilePictureUrl();
    LocalDateTime getLastPostedAt();
  }

  /**
   * The viewer's followed users who have at least one post tagged at this
   * gym that the viewer is permitted to see, ordered by their most recent
   * such post. Feed-grade visibility, same rules as findFollowedUsersPosts:
   * PUBLIC posts, or FRIENDS posts when the follow is mutual, minus blocks
   * in either direction. Unlike the location post grid (discover-grade),
   * followed private accounts DO appear here — the viewer already follows
   * them, so nothing is revealed that their own feed wouldn't show. Users
   * the viewer doesn't follow never appear regardless of what they post.
   */
  @Query(
    value = """
    SELECT u.userId AS userId, u.username AS username,
           u.displayName AS displayName,
           u.profilePictureUrl AS profilePictureUrl,
           MAX(p.createdAt) AS lastPostedAt
    FROM Post p JOIN p.user u
    WHERE p.workout.location.locationId = :locationId
    AND EXISTS (
        SELECT f FROM Follow f
        WHERE f.follower.userId = :viewerId
          AND f.followee.userId = u.userId
          AND f.status = 'ACCEPTED'
    )
    AND (
        p.visibility = 'PUBLIC'
        OR (
            p.visibility = 'FRIENDS'
            AND EXISTS (
                SELECT f2 FROM Follow f2
                WHERE f2.follower.userId = u.userId
                  AND f2.followee.userId = :viewerId
                  AND f2.status = 'ACCEPTED'
            )
        )
    )
    AND NOT EXISTS (
        SELECT b FROM Follow b WHERE
        (b.follower.userId = :viewerId AND b.followee.userId = u.userId AND b.status = 'BLOCKED')
        OR (b.follower.userId = u.userId AND b.followee.userId = :viewerId AND b.status = 'BLOCKED')
    )
    GROUP BY u.userId, u.username, u.displayName, u.profilePictureUrl
    ORDER BY MAX(p.createdAt) DESC
    """,
    countQuery = """
    SELECT COUNT(DISTINCT u.userId)
    FROM Post p JOIN p.user u
    WHERE p.workout.location.locationId = :locationId
    AND EXISTS (
        SELECT f FROM Follow f
        WHERE f.follower.userId = :viewerId
          AND f.followee.userId = u.userId
          AND f.status = 'ACCEPTED'
    )
    AND (
        p.visibility = 'PUBLIC'
        OR (
            p.visibility = 'FRIENDS'
            AND EXISTS (
                SELECT f2 FROM Follow f2
                WHERE f2.follower.userId = u.userId
                  AND f2.followee.userId = :viewerId
                  AND f2.status = 'ACCEPTED'
            )
        )
    )
    AND NOT EXISTS (
        SELECT b FROM Follow b WHERE
        (b.follower.userId = :viewerId AND b.followee.userId = u.userId AND b.status = 'BLOCKED')
        OR (b.follower.userId = u.userId AND b.followee.userId = :viewerId AND b.status = 'BLOCKED')
    )
    """
  )
  Page<FriendAtLocation> findFriendsWhoTrainAt(
    @Param("locationId") UUID locationId,
    @Param("viewerId") UUID viewerId,
    Pageable pageable
  );

  Optional<Post> findByWorkout_WorkoutId(UUID workoutId);

  /**
   * Find a post by its workout regardless of moderation state. Native so it
   * bypasses the @SQLRestriction on Post (which hides HIDDEN/REMOVED/soft-hidden
   * posts from entity queries) — needed when deleting a workout whose post was
   * hidden by moderation, so the post can still be cleaned up rather than
   * orphaning the workout_id foreign key. Mirrors updateModerationStatus.
   */
  @Query(
    value = "SELECT * FROM post WHERE workout_id = :workoutId",
    nativeQuery = true
  )
  Optional<Post> findAnyByWorkoutId(@Param("workoutId") UUID workoutId);

  /**
   * Set a post's moderation status directly. Native because the entity carries
   * an @SQLRestriction that hides non-VISIBLE posts from all JPA queries, so a
   * managed-entity load can't reach a HIDDEN/REMOVED post to un-hide it. This
   * is the moderation-review counterpart to the report system's inline hide.
   */
  @Modifying
  @Query(
    value = "UPDATE post SET moderation_status = :status WHERE post_id = :postId",
    nativeQuery = true
  )
  int updateModerationStatus(
    @Param("postId") UUID postId,
    @Param("status") String status
  );
}
