package com.gearfitness.gear_api.service;

import com.gearfitness.gear_api.dto.DmRealtimeEvent;
import com.gearfitness.gear_api.dto.MessageDTO;
import java.util.Collection;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

/**
 * Pushes direct-message events to recipients over STOMP. Each event is delivered
 * to every target user's {@code /user/{userId}/queue/messages} destination.
 * Depends only on {@link SimpMessagingTemplate} to avoid any cycle with the DM
 * services that call it.
 */
@Service
@RequiredArgsConstructor
public class DirectMessageEventPublisher {

  private static final String USER_QUEUE = "/queue/messages";

  private final SimpMessagingTemplate messagingTemplate;

  public void newMessage(Collection<UUID> recipients, MessageDTO message) {
    send(
      recipients,
      DmRealtimeEvent.builder()
        .type("message")
        .conversationId(message.getConversationId())
        .message(message)
        .build()
    );
  }

  public void seen(
    Collection<UUID> recipients,
    UUID conversationId,
    UUID readerUserId,
    UUID lastReadMessageId
  ) {
    send(
      recipients,
      DmRealtimeEvent.builder()
        .type("seen")
        .conversationId(conversationId)
        .userId(readerUserId)
        .lastReadMessageId(lastReadMessageId)
        .build()
    );
  }

  /**
   * A participant accepted a message request. Lets the other side's thread drop
   * its pending state live (e.g. re-enable sending photos) without a reload.
   */
  public void accepted(
    Collection<UUID> recipients,
    UUID conversationId,
    UUID acceptedByUserId
  ) {
    send(
      recipients,
      DmRealtimeEvent.builder()
        .type("accepted")
        .conversationId(conversationId)
        .userId(acceptedByUserId)
        .build()
    );
  }

  /**
   * A participant left the conversation (e.g. declined a group request). Lets the
   * remaining members drop them from the thread live — which recomputes the photo
   * gate and updates the header/group avatar without a reload.
   */
  public void left(
    Collection<UUID> recipients,
    UUID conversationId,
    UUID leftUserId
  ) {
    send(
      recipients,
      DmRealtimeEvent.builder()
        .type("left")
        .conversationId(conversationId)
        .userId(leftUserId)
        .build()
    );
  }

  public void typing(
    Collection<UUID> recipients,
    UUID conversationId,
    UUID typingUserId,
    String username,
    boolean typing
  ) {
    send(
      recipients,
      DmRealtimeEvent.builder()
        .type("typing")
        .conversationId(conversationId)
        .userId(typingUserId)
        .username(username)
        .typing(typing)
        .build()
    );
  }

  private void send(Collection<UUID> recipients, DmRealtimeEvent event) {
    for (UUID userId : recipients) {
      messagingTemplate.convertAndSendToUser(
        userId.toString(),
        USER_QUEUE,
        event
      );
    }
  }
}
