package com.gearfitness.gear_api.service;

import com.gearfitness.gear_api.dto.FeedPostDTO;
import com.gearfitness.gear_api.entity.Post;
import com.gearfitness.gear_api.repository.AppUserRepository;
import com.gearfitness.gear_api.repository.FollowRepository;
import com.gearfitness.gear_api.repository.PostCommentRepository;
import com.gearfitness.gear_api.repository.PostLikeRepository;
import com.gearfitness.gear_api.repository.PostRepository;
import jakarta.transaction.Transactional;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Transactional
public class SocialFeedService {

  private final PostRepository postRepository;
  private final PostLikeRepository postLikeRepository;
  private final PostCommentRepository postCommentRepository;
  private final AppUserRepository appUserRepository;
  private final PostVisibilityService postVisibilityService;
  private final FollowRepository followRepository;

  public Page<FeedPostDTO> getFeed(UUID userId, int page, int size) {
    Pageable pageable = PageRequest.of(page, size);
    Page<Post> posts = postRepository.findFollowedUsersPosts(userId, pageable);

    List<UUID> postIds = posts
      .getContent()
      .stream()
      .map(Post::getPostId)
      .collect(Collectors.toList());
    Map<UUID, Long> likeCounts = postLikeRepository.countByPostIds(postIds);
    Map<UUID, Long> commentCounts = postCommentRepository.countByPostIds(
      postIds
    );
    Set<UUID> likedPostIds = postLikeRepository.findPostIdsLikedByUser(
      userId,
      postIds
    );
    Set<UUID> followedAuthorIds = followRepository.findFollowedAuthorIds(
      userId,
      authorIds(posts)
    );

    return posts.map(post ->
      mapToDTO(post, likeCounts, commentCounts, likedPostIds, followedAuthorIds)
    );
  }

  public Page<FeedPostDTO> getUserPosts(
    UUID targetUserId,
    UUID viewingUserId,
    int page,
    int size
  ) {
    Pageable pageable = PageRequest.of(page, size);
    Page<Post> posts = postRepository.findPostsByUser(
      targetUserId,
      viewingUserId,
      pageable
    );

    List<UUID> postIds = posts
      .getContent()
      .stream()
      .map(Post::getPostId)
      .collect(Collectors.toList());
    Map<UUID, Long> likeCounts = postLikeRepository.countByPostIds(postIds);
    Map<UUID, Long> commentCounts = postCommentRepository.countByPostIds(
      postIds
    );
    Set<UUID> likedPostIds = postLikeRepository.findPostIdsLikedByUser(
      viewingUserId,
      postIds
    );
    Set<UUID> followedAuthorIds = followRepository.findFollowedAuthorIds(
      viewingUserId,
      authorIds(posts)
    );

    return posts.map(post ->
      mapToDTO(post, likeCounts, commentCounts, likedPostIds, followedAuthorIds)
    );
  }

  public FeedPostDTO getPost(UUID postId, UUID viewingUserId) {
    Post post = postRepository
      .findById(postId)
      .orElseThrow(() ->
        new ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found")
      );

    postVisibilityService.assertCanView(post, viewingUserId);

    List<UUID> postIds = Collections.singletonList(postId);
    Map<UUID, Long> likeCounts = postLikeRepository.countByPostIds(postIds);
    Map<UUID, Long> commentCounts = postCommentRepository.countByPostIds(
      postIds
    );
    Set<UUID> likedPostIds = postLikeRepository.findPostIdsLikedByUser(
      viewingUserId,
      postIds
    );
    Set<UUID> followedAuthorIds = followRepository.findFollowedAuthorIds(
      viewingUserId,
      Collections.singletonList(post.getUser().getUserId())
    );

    return mapToDTO(
      post,
      likeCounts,
      commentCounts,
      likedPostIds,
      followedAuthorIds
    );
  }

  /** Distinct author ids across a page of posts, for batched follow lookups. */
  private List<UUID> authorIds(Page<Post> posts) {
    return posts
      .getContent()
      .stream()
      .map(post -> post.getUser().getUserId())
      .distinct()
      .collect(Collectors.toList());
  }

  private FeedPostDTO mapToDTO(
    Post post,
    Map<UUID, Long> likeCounts,
    Map<UUID, Long> commentCounts,
    Set<UUID> likedPostIds,
    Set<UUID> followedAuthorIds
  ) {
    return FeedPostDTO.builder()
      .postId(post.getPostId())
      .workoutId(post.getWorkout().getWorkoutId())
      .imageUrl(post.getImageUrl())
      .photoUrls(post.getWorkout().getPhotoUrls())
      .caption(post.getCaption())
      .createdAt(post.getCreatedAt())
      .userId(post.getUser().getUserId())
      .username(post.getUser().getUsername())
      .userProfilePictureUrl(post.getUser().getProfilePictureUrl())
      .workoutName(post.getWorkout().getName())
      .datePerformed(post.getWorkout().getDatePerformed())
      .durationMin(post.getWorkout().getDurationMin())
      .bodyTags(
        post.getWorkout().getBodyTags() != null
          ? post
              .getWorkout()
              .getBodyTags()
              .stream()
              .map(Enum::name)
              .collect(Collectors.toList())
          : null
      )
      .exerciseCount((long) post.getWorkout().getWorkoutExercises().size())
      .setCount(
        post
          .getWorkout()
          .getWorkoutExercises()
          .stream()
          .mapToLong(exercise -> exercise.getWorkoutSets().size())
          .sum()
      )
      .likeCount(likeCounts.getOrDefault(post.getPostId(), 0L))
      .commentCount(commentCounts.getOrDefault(post.getPostId(), 0L))
      .likedByCurrentUser(likedPostIds.contains(post.getPostId()))
      .visibility(
        post.getVisibility() != null ? post.getVisibility().name() : "PUBLIC"
      )
      .viewerFollowsAuthor(
        followedAuthorIds.contains(post.getUser().getUserId())
      )
      .build();
  }

  public void updatePostVisibility(
    UUID postId,
    UUID userId,
    String visibility
  ) {
    Post post = postRepository
      .findById(postId)
      .orElseThrow(() ->
        new ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found")
      );

    if (!post.getUser().getUserId().equals(userId)) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your post");
    }

    post.setVisibility(Post.PostVisibility.valueOf(visibility));
    postRepository.save(post);
  }
}
