package com.gearfitness.gear_api.repository;

import com.gearfitness.gear_api.entity.AppUser;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface AppUserRepository extends JpaRepository<AppUser, UUID> {
  Optional<AppUser> findByEmail(String email);
  Optional<AppUser> findByUsername(String username);
  Optional<AppUser> findByUsernameIgnoreCase(String username);

  /**
   * Relevance-first user search for the social tab.
   *
   * <p>Results are ordered by a blended score: a text-match tier (exact 100 >
   * prefix 80 > word-start 60 > contains 40 > trigram-fuzzy 20, taken as the
   * best of username and display name) plus a bounded relationship boost (mutual
   * 15 / current-user-follows-them 10 / they-follow-current-user 8). The boost is
   * deliberately smaller than the 20-point gap between tiers, so the relationship
   * only ever orders ties between comparable text matches and never lifts a
   * weaker match above a stronger one. The {@code word_similarity} term then
   * tiebreaks within a tier, with username alphabetical order as a final
   * stabiliser.
   *
   * <p>Native query (not JPQL) so it can use the {@code pg_trgm} similarity
   * operators backed by the trigram GIN indexes from migration V17. Because it
   * bypasses the entity {@code @SQLRestriction} filters, the soft-delete
   * ({@code app_user.deleted_at}) and follow-hidden ({@code follow.hidden_at})
   * conditions are replicated explicitly.
   */
  @Query(
    value = """
        SELECT u.* FROM app_user u
        LEFT JOIN follow f
          ON f.follower_id = :currentUserId AND f.followee_id = u.user_id
             AND f.status = 'ACCEPTED' AND f.hidden_at IS NULL
        LEFT JOIN follow f2
          ON f2.followee_id = :currentUserId AND f2.follower_id = u.user_id
             AND f2.status = 'ACCEPTED' AND f2.hidden_at IS NULL
        WHERE u.user_id <> :currentUserId
          AND u.deleted_at IS NULL
          AND (
                LOWER(u.username) LIKE '%' || LOWER(:query) || '%'
             OR LOWER(u.display_name) LIKE '%' || LOWER(:query) || '%'
             OR LOWER(u.username) % LOWER(:query)
             OR LOWER(u.display_name) % LOWER(:query)
          )
          AND NOT EXISTS (
            SELECT 1 FROM follow b
            WHERE b.hidden_at IS NULL AND b.status = 'BLOCKED'
              AND (
                   (b.follower_id = :currentUserId AND b.followee_id = u.user_id)
                OR (b.follower_id = u.user_id AND b.followee_id = :currentUserId)
              )
          )
        ORDER BY (
            GREATEST(
              CASE
                WHEN LOWER(u.username) = LOWER(:query) THEN 100
                WHEN LOWER(u.username) LIKE LOWER(:query) || '%' THEN 80
                WHEN LOWER(u.username) LIKE '% ' || LOWER(:query) || '%' THEN 60
                WHEN LOWER(u.username) LIKE '%' || LOWER(:query) || '%' THEN 40
                WHEN word_similarity(LOWER(:query), LOWER(u.username)) >= :threshold THEN 20
                ELSE 0
              END,
              CASE
                WHEN LOWER(COALESCE(u.display_name, '')) = LOWER(:query) THEN 100
                WHEN LOWER(COALESCE(u.display_name, '')) LIKE LOWER(:query) || '%' THEN 80
                WHEN LOWER(COALESCE(u.display_name, '')) LIKE '% ' || LOWER(:query) || '%' THEN 60
                WHEN LOWER(COALESCE(u.display_name, '')) LIKE '%' || LOWER(:query) || '%' THEN 40
                WHEN word_similarity(LOWER(:query), LOWER(COALESCE(u.display_name, ''))) >= :threshold THEN 20
                ELSE 0
              END
            )
            + CASE
                WHEN f.follower_id IS NOT NULL AND f2.follower_id IS NOT NULL THEN 15
                WHEN f.follower_id IS NOT NULL THEN 10
                WHEN f2.follower_id IS NOT NULL THEN 8
                ELSE 0
              END
          ) DESC,
          word_similarity(LOWER(:query), LOWER(u.username)) DESC,
          LOWER(u.username) ASC
        LIMIT :limit
    """,
    nativeQuery = true
  )
  List<AppUser> rankedSearch(
    @Param("query") String query,
    @Param("currentUserId") UUID currentUserId,
    @Param("threshold") double threshold,
    @Param("limit") int limit
  );

  /**
   * Streak-notification candidates: users who currently have an Expo push token
   * and for whom it is the hour just after local midnight (00:00–00:59 in their
   * stored time zone, UTC when none is set). Pushing both filters into SQL keeps
   * the hourly scheduler from hydrating the entire user table on every run — at
   * scale it returns only the ~1/24 of token-holders currently at local midnight.
   *
   * <p>Native query so it can use Postgres {@code AT TIME ZONE}; this bypasses
   * the entity {@code @SQLRestriction}, so the soft-delete filter is replicated
   * explicitly. Stored zones are validated on write, so {@code AT TIME ZONE}
   * never fails on a bad value.
   */
  @Query(
    value = """
        SELECT * FROM app_user
        WHERE deleted_at IS NULL
          AND expo_push_token IS NOT NULL
          AND EXTRACT(
                HOUR FROM (now() AT TIME ZONE COALESCE(NULLIF(time_zone, ''), 'UTC'))
              ) = 0
    """,
    nativeQuery = true
  )
  List<AppUser> findPushNotifiableAtLocalMidnight();

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
