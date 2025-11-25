package com.gearfitness.gear_api.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.gearfitness.gear_api.entity.Follow;
import com.gearfitness.gear_api.entity.Follow.FollowId;

@Repository
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
