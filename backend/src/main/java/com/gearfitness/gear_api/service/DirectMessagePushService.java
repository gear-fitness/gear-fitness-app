package com.gearfitness.gear_api.service;

import com.gearfitness.gear_api.entity.ConversationParticipant;
import com.gearfitness.gear_api.repository.ConversationParticipantRepository;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.user.SimpUserRegistry;
import org.springframework.stereotype.Service;

/**
 * Sends Expo push notifications for incoming direct messages.
 *
 * <p>A push only goes out when the recipient is NOT currently connected over
 * WebSocket: an open app already receives the message live (and its badge
 * updates), so pushing would just duplicate it — including while the user is
 * looking at that very thread. The app's socket drops when it is backgrounded,
 * so "has a STOMP session" is a good proxy for "app is open". Muted
 * conversations never push.
 *
 * <p>Unlike likes/comments/follows, DMs deliberately do NOT create a
 * Notification row — messages live in their own inbox and stay out of the
 * Activity feed (matching Instagram).
 */
@Service
@RequiredArgsConstructor
public class DirectMessagePushService {

  private static final int PREVIEW_MAX = 120;

  private final ConversationParticipantRepository participantRepository;
  private final SimpUserRegistry simpUserRegistry;
  private final ExpoPushService expoPushService;

  /**
   * Notify a conversation's offline, unmuted members about a new message.
   * Called after the send transaction commits.
   */
  public void pushNewMessage(
    UUID conversationId,
    UUID senderId,
    String senderUsername,
    boolean isGroup,
    String groupTitle,
    String preview
  ) {
    String body = isGroup ? senderUsername + ": " + preview : preview;
    String title = isGroup
      ? (groupTitle != null && !groupTitle.isBlank() ? groupTitle : "New message")
      : senderUsername;
    // conversationId is a UUID, so this interpolation can't break the JSON.
    String data = String.format(
      "{\"type\":\"MESSAGE\",\"screen\":\"MessageThread\",\"params\":{\"conversationId\":\"%s\"}}",
      conversationId
    );

    for (ConversationParticipant p : participantRepository.findActiveWithUsers(
      conversationId
    )) {
      UUID recipientId = p.getUser().getUserId();
      if (recipientId.equals(senderId) || p.isMuted()) {
        continue;
      }
      // Connected over WebSocket => the app is open and already got it live.
      if (simpUserRegistry.getUser(recipientId.toString()) != null) {
        continue;
      }
      String token = p.getUser().getExpoPushToken();
      if (token == null || token.isBlank()) {
        continue;
      }
      expoPushService.sendPushNotification(token, title, body, data);
    }
  }

  /** Notification body for a message: its text, or a marker for media-only. */
  public static String preview(String content, boolean hasMedia) {
    if (content == null || content.isBlank()) {
      return hasMedia ? "📷 Photo" : "";
    }
    String trimmed = content.trim();
    return trimmed.length() > PREVIEW_MAX
      ? trimmed.substring(0, PREVIEW_MAX) + "…"
      : trimmed;
  }
}
