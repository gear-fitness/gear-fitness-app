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
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Transactional
public class PostInteractionService {

  private final PostRepository postRepository;
  private final PostLikeRepository postLikeRepository;
  private final PostCommentRepository postCommentRepository;
  private final AppUserRepository appUserRepository;
  private final NotificationRepository notificationRepository;
  private final PostVisibilityService postVisibilityService;
  private final ExpoPushService expoPushService;
  private final MentionService mentionService;

  public LikeResponse toggleLike(UUID userId, UUID postId) {
    Post post = postRepository
      .findById(postId)
      .orElseThrow(() ->
        new ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found")
      );

    postVisibilityService.assertCanView(post, userId);

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
          {"type":"LIKE","screen":"PostDetail","params":{"postId":"%s"}}
          """,
          post.getPostId()
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

  public Page<CommentDTO> getComments(
    UUID postId,
    UUID viewingUserId,
    int page,
    int size
  ) {
    Post post = postRepository
      .findById(postId)
      .orElseThrow(() ->
        new ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found")
      );

    postVisibilityService.assertCanView(post, viewingUserId);

    Pageable pageable = PageRequest.of(
      page,
      size,
      Sort.by("createdAt").descending()
    );
    Page<PostComment> comments = (viewingUserId != null)
      ? postCommentRepository.findVisibleComments(
          postId,
          viewingUserId,
          pageable
        )
      : postCommentRepository.findByPost_PostIdAndParentCommentIsNull(
          postId,
          pageable
        );

    List<UUID> topLevelIds = comments
      .getContent()
      .stream()
      .map(PostComment::getCommentId)
      .toList();
    Map<UUID, Long> replyCounts = postCommentRepository.countByParentCommentIds(
      topLevelIds
    );

    return comments.map(c ->
      mapToDTO(c, replyCounts.getOrDefault(c.getCommentId(), 0L))
    );
  }

  public Page<CommentDTO> getReplies(
    UUID postId,
    UUID parentCommentId,
    UUID viewingUserId,
    int page,
    int size
  ) {
    Post post = postRepository
      .findById(postId)
      .orElseThrow(() ->
        new ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found")
      );

    postVisibilityService.assertCanView(post, viewingUserId);

    // Validate the parent belongs to this post (and 404 a hidden/removed
    // parent via @SQLRestriction), mirroring addComment.
    PostComment parent = postCommentRepository
      .findById(parentCommentId)
      .orElseThrow(() ->
        new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment not found")
      );
    if (!parent.getPost().getPostId().equals(postId)) {
      throw new ResponseStatusException(
        HttpStatus.BAD_REQUEST,
        "Comment does not belong to this post"
      );
    }

    // Both query paths already order by createdAt ASC (oldest-first).
    Pageable pageable = PageRequest.of(page, size);
    Page<PostComment> replies = (viewingUserId != null)
      ? postCommentRepository.findVisibleReplies(
          parentCommentId,
          viewingUserId,
          pageable
        )
      : postCommentRepository.findByParentComment_CommentIdOrderByCreatedAtAsc(
          parentCommentId,
          pageable
        );

    return replies.map(this::mapToDTO);
  }

  public CommentDTO addComment(
    UUID userId,
    UUID postId,
    String body,
    UUID parentCommentId
  ) {
    Post post = postRepository
      .findById(postId)
      .orElseThrow(() ->
        new ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found")
      );

    // Folds the block check into the centralized visibility rule: a user who
    // cannot see the post (blocked, or not allowed by visibility) gets a 404.
    postVisibilityService.assertCanView(post, userId);

    AppUser user = appUserRepository
      .findById(userId)
      .orElseThrow(() -> new RuntimeException("User not found"));

    // Resolve the reply target (the tapped comment) and collapse to one level:
    // a reply always stores under the thread's top-level comment.
    PostComment target = null;
    PostComment storageParent = null;
    if (parentCommentId != null) {
      target = postCommentRepository
        .findById(parentCommentId)
        .orElseThrow(() ->
          new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment not found")
        );
      if (!target.getPost().getPostId().equals(postId)) {
        throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST,
          "Comment does not belong to this post"
        );
      }
      storageParent = target.getParentComment() != null
        ? target.getParentComment()
        : target;
    }

    PostComment comment = PostComment.builder()
      .post(post)
      .user(user)
      .body(body)
      .parentComment(storageParent)
      .build();

    PostComment savedComment = postCommentRepository.save(comment);

    // Primary notification: REPLY to the replied-to author, or COMMENT to the
    // post owner for top-level comments. Tracked so mentions don't double-notify.
    UUID primaryRecipientId = null;
    if (target != null) {
      AppUser targetAuthor = target.getUser();
      if (!targetAuthor.getUserId().equals(userId)) {
        primaryRecipientId = targetAuthor.getUserId();
        Notification notification = Notification.builder()
          .recipient(targetAuthor)
          .actor(user)
          .type(Notification.NotificationType.REPLY)
          .post(post)
          .comment(savedComment)
          .build();

        notificationRepository.save(notification);

        String data = String.format(
          """
          {"type":"REPLY","screen":"PostDetail","params":{"postId":"%s","openCommentsOnMount":true,"focusCommentId":"%s"}}
          """,
          post.getPostId(),
          storageParent.getCommentId()
        );
        expoPushService.sendPushNotification(
          targetAuthor.getExpoPushToken(),
          "New Reply",
          user.getUsername() +
            " replied: " +
            (body.length() > 50 ? body.substring(0, 50) + "..." : body),
          data
        );
      }
    } else if (!post.getUser().getUserId().equals(userId)) {
      primaryRecipientId = post.getUser().getUserId();
      Notification notification = Notification.builder()
        .recipient(post.getUser())
        .actor(user)
        .type(Notification.NotificationType.COMMENT)
        .post(post)
        .comment(savedComment)
        .build();

      notificationRepository.save(notification);

      String data = String.format(
        """
        {"type":"COMMENT","screen":"PostDetail","params":{"postId":"%s"}}
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

    // Notify @mentioned users (deduped against the primary recipient + self).
    mentionService.notifyCommentMentions(
      user,
      body,
      post,
      savedComment,
      storageParent,
      primaryRecipientId
    );

    return mapToDTO(savedComment);
  }

  /**
   * Soft-deletes a comment. Allowed for the comment's author or the owner of
   * the post the comment is on (post owners can moderate their own threads).
   */
  public void deleteComment(UUID userId, UUID commentId) {
    PostComment comment = postCommentRepository
      .findByIdIncludingHidden(commentId)
      .orElseThrow(() ->
        new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment not found")
      );

    boolean isAuthor = comment.getUser().getUserId().equals(userId);
    boolean isPostOwner = comment
      .getPost()
      .getUser()
      .getUserId()
      .equals(userId);

    if (!isAuthor && !isPostOwner) {
      throw new ResponseStatusException(
        HttpStatus.FORBIDDEN,
        "You cannot delete this comment"
      );
    }

    if (comment.getHiddenAt() == null) {
      comment.setHiddenAt(LocalDateTime.now());
      postCommentRepository.save(comment);
    }

    // Cascade: deleting a top-level comment soft-deletes its visible replies.
    if (comment.getParentComment() == null) {
      List<PostComment> replies =
        postCommentRepository.findByParentComment_CommentId(commentId);
      LocalDateTime now = LocalDateTime.now();
      for (PostComment reply : replies) {
        if (reply.getHiddenAt() == null) {
          reply.setHiddenAt(now);
        }
      }
      postCommentRepository.saveAll(replies);
    }
  }

  private CommentDTO mapToDTO(PostComment comment) {
    return mapToDTO(comment, null);
  }

  private CommentDTO mapToDTO(PostComment comment, Long replyCount) {
    return CommentDTO.builder()
      .commentId(comment.getCommentId())
      .postId(comment.getPost().getPostId())
      .userId(comment.getUser().getUserId())
      .username(comment.getUser().getUsername())
      .userProfilePictureUrl(comment.getUser().getProfilePictureUrl())
      .body(comment.getBody())
      .createdAt(comment.getCreatedAt())
      .parentCommentId(
        comment.getParentComment() != null
          ? comment.getParentComment().getCommentId()
          : null
      )
      .replyCount(replyCount)
      .build();
  }
}
