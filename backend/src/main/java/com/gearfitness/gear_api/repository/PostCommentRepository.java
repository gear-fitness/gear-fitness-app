package com.gearfitness.gear_api.repository;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.gearfitness.gear_api.entity.PostComment;

@Repository
public interface PostCommentRepository extends JpaRepository<PostComment, UUID> {
    @Query("""
            SELECT pc.post.postId, COUNT(pc)
            FROM PostComment pc
            WHERE pc.post.postId IN :postIds
            GROUP BY pc.post.postId
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
}
