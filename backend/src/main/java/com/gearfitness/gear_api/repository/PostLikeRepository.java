package com.gearfitness.gear_api.repository;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.gearfitness.gear_api.entity.PostLike;
import com.gearfitness.gear_api.entity.PostLike.PostLikeId;

@Repository
public interface PostLikeRepository extends JpaRepository<PostLike, PostLikeId> {
        @Query("""
                        SELECT pl.post.postId, COUNT(pl)
                        FROM PostLike pl
                        WHERE pl.post.postId IN :postIds
                        GROUP BY pl.post.postId
                        """)
        List<Object[]> countByPostIdsRaw(@Param("postIds") List<UUID> postIds);

        default Map<UUID, Long> countByPostIds(List<UUID> postIds) {
                if (postIds == null || postIds.isEmpty()) {
                        return Map.of();
                }
                return countByPostIdsRaw(postIds).stream()
                                .collect(Collectors.toMap(
                                                row -> (UUID) row[0],
                                                row -> (Long) row[1]));
        }

        @Query("""
                        SELECT pl.post.postId
                        FROM PostLike pl
                        WHERE pl.user.userId = :userId
                        AND pl.post.postId IN :postIds
                        """)
        List<UUID> findPostIdsLikedByUserRaw(
                        @Param("userId") UUID userId,
                        @Param("postIds") List<UUID> postIds);

        default Set<UUID> findPostIdsLikedByUser(UUID userId, List<UUID> postIds) {
                if (postIds == null || postIds.isEmpty()) {
                        return Set.of();
                }
                return new HashSet<>(findPostIdsLikedByUserRaw(userId, postIds));
        }
}
