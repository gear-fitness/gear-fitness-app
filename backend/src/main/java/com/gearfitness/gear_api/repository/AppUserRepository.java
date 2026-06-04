package com.gearfitness.gear_api.repository;

import com.gearfitness.gear_api.entity.AppUser;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface AppUserRepository extends JpaRepository<AppUser, UUID> {
  Optional<AppUser> findByEmail(String email);
  Optional<AppUser> findByUsername(String username);

  @Query(
    """
        SELECT u FROM AppUser u
        LEFT JOIN Follow f
          ON f.follower.userId = :currentUserId AND f.followee = u
             AND f.status = com.gearfitness.gear_api.entity.Follow.FollowStatus.ACCEPTED
        LEFT JOIN Follow f2
          ON f2.followee.userId = :currentUserId AND f2.follower = u
             AND f2.status = com.gearfitness.gear_api.entity.Follow.FollowStatus.ACCEPTED
        WHERE u.userId <> :currentUserId
          AND (LOWER(u.username)    LIKE LOWER(CONCAT('%', :query, '%'))
            OR LOWER(u.displayName) LIKE LOWER(CONCAT('%', :query, '%')))
          AND NOT EXISTS (
            SELECT b FROM Follow b WHERE
            (b.follower.userId = :currentUserId AND b.followee.userId = u.userId AND b.status = 'BLOCKED')
            OR (b.follower.userId = u.userId AND b.followee.userId = :currentUserId AND b.status = 'BLOCKED')
          )
        ORDER BY
          CASE WHEN f IS NOT NULL THEN 0 ELSE 1 END,
          CASE WHEN f2 IS NOT NULL THEN 0 ELSE 1 END,
          CASE
            WHEN LOWER(u.username)    LIKE LOWER(CONCAT(:query, '%')) THEN 0
            WHEN LOWER(u.username)    LIKE LOWER(CONCAT('%', :query, '%')) THEN 1
            WHEN LOWER(u.displayName) LIKE LOWER(CONCAT(:query, '%')) THEN 2
            ELSE 3
          END,
          LOWER(u.username) ASC
    """
  )
  List<AppUser> rankedSearch(
    @Param("query") String query,
    @Param("currentUserId") UUID currentUserId,
    Pageable pageable
  );

  boolean existsByEmail(String email);
  boolean existsByUsername(String username);
}
