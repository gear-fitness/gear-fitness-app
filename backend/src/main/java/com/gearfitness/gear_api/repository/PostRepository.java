package com.gearfitness.gear_api.repository;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.gearfitness.gear_api.entity.Post;

@Repository
public interface PostRepository extends JpaRepository<Post, UUID> {
    @Query("""
            SELECT p FROM Post p
            WHERE p.user.userId IN(
                SELECT f.followee.userId FROM Follow f
                WHERE f.follower.userId = :userId
                AND f.status = 'ACCEPTED'
            )
            ORDER BY p.createdAt DESC
            """)
    Page<Post> findFollowedUsersPosts(
            @Param("userId") UUID userId,
            Pageable pageable);

    @Query("""
            SELECT p FROM Post p
            WHERE p.user.userId = :userId
            ORDER BY p.createdAt DESC
            """)
    Page<Post> findPostsByUser(
            @Param("userId") UUID userId,
            Pageable pageable);

}
