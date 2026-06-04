package com.gearfitness.gear_api.repository;

import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.entity.Follow;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface FollowRepository
  extends JpaRepository<Follow, Follow.FollowId>
{
  /**
   * Count followers for a user (users following this user)
   */
  long countByFolloweeAndStatus(AppUser followee, Follow.FollowStatus status);

  /**
   * Count following for a user (users this user is following)
   */
  long countByFollowerAndStatus(AppUser follower, Follow.FollowStatus status);

  /**
   * Get all followers for a user
   */
  List<Follow> findByFolloweeAndStatus(
    AppUser followee,
    Follow.FollowStatus status
  );

  /**
   * Get all users that this user is following
   */
  List<Follow> findByFollowerAndStatus(
    AppUser follower,
    Follow.FollowStatus status
  );

  /**
   * Check if a user is following another user
   */
  Optional<Follow> findByFollowerAndFollowee(
    AppUser follower,
    AppUser followee
  );

  /**
   * Check if follow relationship exists with a specific status
   */
  boolean existsByFollowerAndFolloweeAndStatus(
    AppUser follower,
    AppUser followee,
    Follow.FollowStatus status
  );

  /**
   * Check if a directed follow with a specific status exists, by user IDs.
   * Used for visibility checks that only have UUIDs on hand.
   */
  boolean existsByFollower_UserIdAndFollowee_UserIdAndStatus(
    UUID followerUserId,
    UUID followeeUserId,
    Follow.FollowStatus status
  );

  /**
   * Fetch all ACCEPTED follow edges between the current user and the given
   * other users in either direction. Used to populate relationship flags on
   * user search results in a single batched query.
   */
  @Query(
    """
        SELECT f FROM Follow f
        WHERE f.status = com.gearfitness.gear_api.entity.Follow.FollowStatus.ACCEPTED
          AND ((f.follower.userId = :currentUserId AND f.followee.userId IN :otherUserIds)
            OR (f.followee.userId = :currentUserId AND f.follower.userId IN :otherUserIds))
    """
  )
  List<Follow> findAcceptedEdgesBetween(
    @Param("currentUserId") UUID currentUserId,
    @Param("otherUserIds") List<UUID> otherUserIds
  );

  /**
   * Check whether a block exists in either direction between two users.
   */
  @Query(
    """
        SELECT COUNT(b) > 0 FROM Follow b
        WHERE b.status = 'BLOCKED'
          AND ((b.follower.userId = :userA AND b.followee.userId = :userB)
            OR (b.follower.userId = :userB AND b.followee.userId = :userA))
    """
  )
  boolean existsBlockBetween(
    @Param("userA") UUID userA,
    @Param("userB") UUID userB
  );
}
