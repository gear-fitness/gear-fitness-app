package com.gearfitness.gear_api.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.gearfitness.gear_api.entity.Follow;
import com.gearfitness.gear_api.entity.Follow.FollowId;

public interface FollowRepository extends JpaRepository<Follow, FollowId> {
    @Query("""
            SELECT f FROM Follow f
            WHERE f.follower.userId = :followerId
            AND f.followee.userId = :followeeId
            """)
    Optional<Follow> findByFollowerAndFollowee(
            @Param("followerId") UUID followerId,
            @Param("followeeId") UUID followeeId);

}
