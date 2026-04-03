package com.gearfitness.gear_api.service;

import com.gearfitness.gear_api.dto.CommentDTO;
import com.gearfitness.gear_api.dto.LikeResponse;
import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.entity.Notification;
import com.gearfitness.gear_api.entity.Post;
import com.gearfitness.gear_api.entity.PostComment;
import com.gearfitness.gear_api.entity.PostLike;
import com.gearfitness.gear_api.repository.AppUserRepository;
import com.gearfitness.gear_api.repository.NotificationRepository;
import com.gearfitness.gear_api.repository.PostCommentRepository;
import com.gearfitness.gear_api.repository.PostLikeRepository;
import com.gearfitness.gear_api.repository.PostRepository;
import jakarta.transaction.Transactional;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Transactional
public class PostInteractionService {

  private final PostRepository postRepository;
  private final PostLikeRepository postLikeRepository;
  private final PostCommentRepository postCommentRepository;
  private final AppUserRepository appUserRepository;
  private final NotificationRepository notificationRepository;
  private final ExpoPushService expoPushService;

  public LikeResponse toggleLike(UUID userId, UUID postId) {
    Post post = postRepository
      .findById(postId)
      .orElseThrow(() -> new RuntimeException("Post not found"));

    AppUser user = appUserRepository
      .findById(userId)
      .orElseThrow(() -> new RuntimeException("User not found"));

    PostLike.PostLikeId likeId = new PostLike.PostLikeId(postId, userId);
    Optional<PostLike> existingLike = postLikeRepository.findById(likeId);

    boolean liked;
    if (existingLike.isPresent()) {
      // Unlike
      postLikeRepository.delete(existingLike.get());
      liked = false;
    } else {
      // Like
      PostLike newLike = PostLike.builder().post(post).user(user).build();
      postLikeRepository.save(newLike);
      liked = true;

      // Create notification if user is not liking their own post
      if (!post.getUser().getUserId().equals(userId)) {
        Notification notification = Notification.builder()
          .recipient(post.getUser())
          .actor(user)
          .type(Notification.NotificationType.LIKE)
          .post(post)
          .build();

        notificationRepository.save(notification);

        String data = String.format(
          """
          {"type":"LIKE","screen":"DetailedHistory","params":{"workoutId":"%s"}}
          """,
          post.getWorkout().getWorkoutId()
        );
        expoPushService.sendPushNotification(
          post.getUser().getExpoPushToken(),
          "New Like",
          user.getUsername() + " liked your post",
          data
        );
      }
    }

    long likeCount = postLikeRepository.countByPost_PostId(postId);

    return LikeResponse.builder().liked(liked).likeCount(likeCount).build();
  }

  public Page<CommentDTO> getComments(UUID postId, int page, int size) {
    Pageable pageable = PageRequest.of(
      page,
      size,
      Sort.by("createdAt").descending()
    );
    Page<PostComment> comments = postCommentRepository.findByPost_PostId(
      postId,
      pageable
    );

    return comments.map(this::mapToDTO);
  }

  public CommentDTO addComment(UUID userId, UUID postId, String body) {
    Post post = postRepository
      .findById(postId)
      .orElseThrow(() -> new RuntimeException("Post not found"));

    AppUser user = appUserRepository
      .findById(userId)
      .orElseThrow(() -> new RuntimeException("User not found"));

    PostComment comment = PostComment.builder()
      .post(post)
      .user(user)
      .body(body)
      .build();

    PostComment savedComment = postCommentRepository.save(comment);

    // Create notification if commenter is not the post owner
    if (!post.getUser().getUserId().equals(userId)) {
      Notification notification = Notification.builder()
        .recipient(post.getUser())
        .actor(user)
        .type(Notification.NotificationType.COMMENT)
        .post(post)
        .comment(savedComment)
        .build();

      notificationRepository.save(notification);

      // Send push notification
      String data = String.format(
        """
        {"type":"COMMENT","screen":"Comments","params":{"postId":"%s"}}
        """,
        post.getPostId()
      );
      expoPushService.sendPushNotification(
        post.getUser().getExpoPushToken(),
        "New Comment",
        user.getUsername() +
          " commented: " +
          (body.length() > 50 ? body.substring(0, 50) + "..." : body),
        data
      );
    }

    return mapToDTO(savedComment);
  }

  private CommentDTO mapToDTO(PostComment comment) {
    return CommentDTO.builder()
      .commentId(comment.getCommentId())
      .postId(comment.getPost().getPostId())
      .userId(comment.getUser().getUserId())
      .username(comment.getUser().getUsername())
      .body(comment.getBody())
      .createdAt(comment.getCreatedAt())
      .build();
  }
}
