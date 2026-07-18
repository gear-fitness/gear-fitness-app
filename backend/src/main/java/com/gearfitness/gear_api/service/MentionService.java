package com.gearfitness.gear_api.service;

import com.gearfitness.gear_api.entity.AppUser;
import com.gearfitness.gear_api.entity.Notification;
import com.gearfitness.gear_api.entity.Post;
import com.gearfitness.gear_api.entity.PostComment;
import com.gearfitness.gear_api.repository.AppUserRepository;
import com.gearfitness.gear_api.repository.FollowRepository;
import com.gearfitness.gear_api.repository.NotificationRepository;
import java.util.LinkedHashSet;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Extracts {@code @username} mentions from comment/caption text and notifies the
 * mentioned users. Mentions are stored as raw text; usernames are resolved here
 * at write time. Self-mentions, already-notified recipients, blocked pairs, and
 * unknown usernames are skipped, and the count is capped to limit abuse.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class MentionService {

  // Username format is ^[a-z0-9._]+$ (min 3). Require a non-word char before the
  // @ so emails (foo@bar) don't trigger a mention.
  private static final Pattern MENTION_PATTERN = Pattern.compile(
    "(?<![A-Za-z0-9._])@([A-Za-z0-9._]{3,})"
  );
  private static final int MAX_MENTIONS = 10;

  private final AppUserRepository appUserRepository;
  private final FollowRepository followRepository;
  private final NotificationRepository notificationRepository;
  private final ExpoPushService expoPushService;

  /** Distinct, lowercased usernames mentioned in the text (capped). */
  public Set<String> extractUsernames(String text) {
    if (text == null || text.isBlank()) {
      return Set.of();
    }
    Set<String> usernames = new LinkedHashSet<>();
    Matcher matcher = MENTION_PATTERN.matcher(text);
    while (matcher.find() && usernames.size() < MAX_MENTIONS) {
      usernames.add(matcher.group(1).toLowerCase());
    }
    return usernames;
  }

  /** Mentions in a comment or reply body: deep-link opens the thread. */
  public void notifyCommentMentions(
    AppUser actor,
    String body,
    Post post,
    PostComment comment,
    PostComment storageParent,
    UUID alreadyNotifiedId
  ) {
    UUID focusCommentId =
      storageParent != null
        ? storageParent.getCommentId()
        : comment.getCommentId();
    String data = String.format(
      "{\"type\":\"MENTION\",\"screen\":\"PostDetail\",\"params\":{\"postId\":\"%s\",\"openCommentsOnMount\":true,\"focusCommentId\":\"%s\"}}",
      post.getPostId(),
      focusCommentId
    );
    notify(actor, body, post, comment, alreadyNotifiedId, data);
  }

  /** Mentions in a post caption: deep-link opens the post. */
  public void notifyCaptionMentions(AppUser actor, String caption, Post post) {
    String data = String.format(
      "{\"type\":\"MENTION\",\"screen\":\"PostDetail\",\"params\":{\"postId\":\"%s\"}}",
      post.getPostId()
    );
    notify(actor, caption, post, null, null, data);
  }

  private void notify(
    AppUser actor,
    String text,
    Post post,
    PostComment comment,
    UUID alreadyNotifiedId,
    String pushData
  ) {
    for (String username : extractUsernames(text)) {
      // Usernames are stored as entered (not forced lowercase), so resolve
      // case-insensitively to match the lowercased mention token.
      Optional<AppUser> resolved = appUserRepository.findByUsernameIgnoreCase(
        username
      );
      if (resolved.isEmpty()) {
        continue;
      }
      AppUser mentioned = resolved.get();
      UUID mentionedId = mentioned.getUserId();
      if (mentionedId.equals(actor.getUserId())) {
        continue;
      }
      if (alreadyNotifiedId != null && mentionedId.equals(alreadyNotifiedId)) {
        continue;
      }
      if (followRepository.existsBlockBetween(actor.getUserId(), mentionedId)) {
        continue;
      }

      Notification notification = Notification.builder()
        .recipient(mentioned)
        .actor(actor)
        .type(Notification.NotificationType.MENTION)
        .post(post)
        .comment(comment)
        .build();
      notificationRepository.save(notification);

      expoPushService.sendPushNotification(
        mentioned.getExpoPushToken(),
        "New Mention",
        actor.getUsername() + " mentioned you: " + preview(text),
        pushData
      );
    }
  }

  private String preview(String text) {
    return text.length() > 50 ? text.substring(0, 50) + "..." : text;
  }
}
