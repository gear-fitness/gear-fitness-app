package com.gearfitness.gear_api.repository;

import com.gearfitness.gear_api.entity.AppUser;
import java.time.LocalDateTime;
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

  @Query(
    value = "SELECT * FROM app_user WHERE user_id = :userId",
    nativeQuery = true
  )
  Optional<AppUser> findByIdIncludingDeleted(@Param("userId") UUID userId);

  @Query(
    value = "SELECT * FROM app_user WHERE email = :email",
    nativeQuery = true
  )
  Optional<AppUser> findByEmailIncludingDeleted(@Param("email") String email);

  @Query(
    value = "SELECT * FROM app_user WHERE deleted_at IS NOT NULL AND deleted_at < :cutoff",
    nativeQuery = true
  )
  List<AppUser> findSoftDeletedBefore(@Param("cutoff") LocalDateTime cutoff);

  @Query(
    value = "SELECT EXISTS(SELECT 1 FROM app_user WHERE LOWER(username) = LOWER(:username))",
    nativeQuery = true
  )
  boolean existsByUsernameIncludingDeleted(@Param("username") String username);

  Optional<AppUser> findByAppleUserId(String appleUserId);
}
