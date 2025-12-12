package com.gearfitness.gear_api.repository;

import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.entity.Follow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FollowRepository extends JpaRepository<Follow, Follow.FollowId> {

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
    List<Follow> findByFolloweeAndStatus(AppUser followee, Follow.FollowStatus status);

    /**
     * Get all users that this user is following
     */
    List<Follow> findByFollowerAndStatus(AppUser follower, Follow.FollowStatus status);

    /**
     * Check if a user is following another user
     */
    Optional<Follow> findByFollowerAndFollowee(AppUser follower, AppUser followee);

    /**
     * Check if follow relationship exists with a specific status
     */
    boolean existsByFollowerAndFolloweeAndStatus(AppUser follower, AppUser followee, Follow.FollowStatus status);
}
