package com.gearfitness.gear_api.service;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import com.gearfitness.gear_api.dto.FeedPostDTO;
import com.gearfitness.gear_api.entity.Post;
import com.gearfitness.gear_api.repository.PostCommentRepository;
import com.gearfitness.gear_api.repository.PostLikeRepository;
import com.gearfitness.gear_api.repository.PostRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class SocialFeedService {

    private final PostRepository postRepository;
    private final PostLikeRepository postLikeRepository;
    private final PostCommentRepository postCommentRepository;

    public Page<FeedPostDTO> getFeed(UUID userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Post> posts = postRepository.findFollowedUsersPosts(userId, pageable);

        List<UUID> postIds = posts.getContent().stream().map(Post::getPostId)
                .collect(Collectors.toList());
        Map<UUID, Long> likeCounts = postLikeRepository.countByPostIds(postIds);
        Map<UUID, Long> commentCounts = postCommentRepository.countByPostIds(postIds);
        Set<UUID> likedPostIds = postLikeRepository.findPostIdsLikedByUser(userId, postIds);

        return posts.map(post -> mapToDTO(post, likeCounts, commentCounts, likedPostIds));
    }

    private FeedPostDTO mapToDTO(
            Post post,
            Map<UUID, Long> likeCounts,
            Map<UUID, Long> commentCounts,
            Set<UUID> likedPostIds) {
        return FeedPostDTO.builder()
                .postId(post.getPostId())
                .workoutId(post.getWorkout().getWorkoutId())
                .imageUrl(post.getImageUrl())
                .caption(post.getCaption())
                .createdAt(post.getCreatedAt())
                .userId(post.getUser().getUserId())
                .username(post.getUser().getUsername())
                .workoutName(post.getWorkout().getName())
                .datePerformed(post.getWorkout().getDatePerformed())
                .durationMin(post.getWorkout().getDurationMin())
                .bodyTags(post.getWorkout().getBodyTags() != null
                        ? post.getWorkout().getBodyTags().stream()
                                .map(Enum::name)
                                .collect(Collectors.toList())
                        : null)
                .likeCount(likeCounts.getOrDefault(post.getPostId(), 0L))
                .commentCount(commentCounts.getOrDefault(post.getPostId(), 0L))
                .likedByCurrentUser(likedPostIds.contains(post.getPostId()))
                .build();
    }
}
